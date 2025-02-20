
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata;
        const invoiceId = metadata.invoiceId;

        if (invoiceId) {
          console.log('Updating invoice status for invoice:', invoiceId);
          
          // Get the current invoice to calculate the new balance
          const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select('total, amount_paid')
            .eq('id', invoiceId)
            .single();

          if (fetchError) {
            console.error('Error fetching invoice:', fetchError);
            throw fetchError;
          }

          // Calculate new amount paid and balance
          const newAmountPaid = (invoice.amount_paid || 0) + (paymentIntent.amount / 100);
          const newBalance = invoice.total - newAmountPaid;
          
          // Determine status based on balance
          const newStatus = newBalance <= 0 ? 'paid' : 'partial';

          // Update invoice
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: newStatus,
              amount_paid: newAmountPaid,
              balance_due: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (updateError) {
            console.error('Error updating invoice:', updateError);
            throw updateError;
          }

          // Log the payment activity
          const { error: activityError } = await supabase
            .from('invoice_activities')
            .insert([{
              invoice_id: invoiceId,
              activity_type: 'payment_received',
              description: `Payment received: $${(paymentIntent.amount / 100).toFixed(2)}`,
            }]);

          if (activityError) {
            console.error('Error logging activity:', activityError);
            throw activityError;
          }

          console.log('Successfully updated invoice status and logged activity');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        const metadata = failedPayment.metadata;
        
        if (metadata.invoiceId) {
          // Log the failed payment attempt
          const { error: activityError } = await supabase
            .from('invoice_activities')
            .insert([{
              invoice_id: metadata.invoiceId,
              activity_type: 'payment_failed',
              description: `Payment attempt failed: ${failedPayment.last_payment_error?.message || 'Unknown error'}`,
            }]);

          if (activityError) {
            console.error('Error logging failed payment activity:', activityError);
            throw activityError;
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
