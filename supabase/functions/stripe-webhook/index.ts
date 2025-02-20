
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request) => {
  try {
    if (req.method === 'POST') {
      const body = await req.text();
      const signature = req.headers.get('stripe-signature');

      if (!signature) {
        return new Response('No signature found', { status: 400 });
      }

      console.log('Received webhook. Processing...');

      // Verify the webhook signature
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      
      console.log('Event type:', event.type);

      // Handle successful payment
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const { invoiceId } = metadata;

        if (!invoiceId) {
          console.error('No invoice ID found in metadata');
          return new Response('No invoice ID found', { status: 400 });
        }

        console.log('Processing payment for invoice:', invoiceId);

        // Get the payment details
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        const amountPaid = paymentIntent.amount / 100; // Convert from cents to dollars

        // Update the invoice in the database
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            amount_paid: amountPaid,
            balance_due: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);

        if (updateError) {
          console.error('Error updating invoice:', updateError);
          throw updateError;
        }

        // Add activity log
        const { error: activityError } = await supabase
          .from('invoice_activities')
          .insert({
            invoice_id: invoiceId,
            activity_type: 'payment',
            description: `Payment received: $${amountPaid.toFixed(2)}`,
          });

        if (activityError) {
          console.error('Error creating activity log:', activityError);
          // Don't throw here as the payment was still processed successfully
        }

        console.log('Successfully processed payment for invoice:', invoiceId);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(error.message, { status: 400 });
  }
};

serve(handler);
