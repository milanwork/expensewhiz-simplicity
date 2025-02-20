
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-deno-subhost',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the x-deno-subhost header
    const denoSubhost = req.headers.get('x-deno-subhost');
    if (!denoSubhost) {
      throw new Error('No x-deno-subhost header found');
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata;
        const invoiceId = metadata?.invoiceId;
        const amountPaid = session.amount_total / 100; // Convert from cents to dollars

        if (invoiceId) {
          console.log(`Updating invoice ${invoiceId} to paid status`);
          
          // Update invoice status to paid
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

          // Log the payment activity
          const { error: activityError } = await supabase
            .from('invoice_activities')
            .insert([{
              invoice_id: invoiceId,
              activity_type: 'payment_received',
              description: `Payment received: $${amountPaid.toFixed(2)}`,
            }]);

          if (activityError) {
            console.error('Error logging activity:', activityError);
            throw activityError;
          }

          console.log('Successfully updated invoice to paid status');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata;
        const invoiceId = metadata?.invoiceId;
        const amountPaid = paymentIntent.amount / 100; // Convert from cents to dollars

        if (invoiceId) {
          console.log(`Updating invoice ${invoiceId} to paid status`);
          
          // Update invoice status to paid
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

          // Log the payment activity
          const { error: activityError } = await supabase
            .from('invoice_activities')
            .insert([{
              invoice_id: invoiceId,
              activity_type: 'payment_received',
              description: `Payment received: $${amountPaid.toFixed(2)}`,
            }]);

          if (activityError) {
            console.error('Error logging activity:', activityError);
            throw activityError;
          }

          console.log('Successfully updated invoice to paid status');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        const metadata = failedPayment.metadata;
        
        if (metadata?.invoiceId) {
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
