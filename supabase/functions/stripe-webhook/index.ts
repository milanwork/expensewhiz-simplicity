
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

const handler = async (req: Request): Promise<Response> => {
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
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata;
        const invoiceId = metadata.invoiceId;

        if (invoiceId) {
          // Update invoice status to paid
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              amount_paid: paymentIntent.amount / 100, // Convert from cents to dollars
              balance_due: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (updateError) {
            throw updateError;
          }

          // Log the payment activity
          await supabase
            .from('invoice_activities')
            .insert([{
              invoice_id: invoiceId,
              activity_type: 'payment_received',
              description: `Payment received: $${(paymentIntent.amount / 100).toFixed(2)}`,
            }]);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedMetadata = failedPayment.metadata;
        
        if (failedMetadata.invoiceId) {
          // Log the failed payment attempt
          await supabase
            .from('invoice_activities')
            .insert([{
              invoice_id: failedMetadata.invoiceId,
              activity_type: 'payment_failed',
              description: `Payment attempt failed: ${failedPayment.last_payment_error?.message || 'Unknown error'}`,
            }]);
        }
        break;
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
};

serve(handler);
