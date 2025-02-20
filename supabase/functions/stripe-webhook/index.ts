
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.text();
    // Parse the event directly without signature verification for now
    const event = JSON.parse(body);
    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const sessionOrIntent = event.data.object;
        const metadata = sessionOrIntent.metadata || {};
        const invoiceId = metadata.invoiceId;
        const amountPaid = (sessionOrIntent.amount_total || sessionOrIntent.amount) / 100;

        if (invoiceId) {
          console.log(`Updating invoice ${invoiceId} with payment of $${amountPaid}`);

          // First, fetch current invoice data
          const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('total, amount_paid, balance_due')
            .eq('id', invoiceId)
            .single();

          if (fetchError) {
            console.error('Error fetching invoice:', fetchError);
            throw fetchError;
          }

          // Calculate new values
          const newAmountPaid = (currentInvoice.amount_paid || 0) + amountPaid;
          const newBalanceDue = Math.max(0, currentInvoice.total - newAmountPaid);
          const newStatus = newBalanceDue === 0 ? 'paid' : 'sent';

          // Update invoice
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: newStatus,
              amount_paid: newAmountPaid,
              balance_due: newBalanceDue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);

          if (updateError) {
            console.error('Error updating invoice:', updateError);
            throw updateError;
          }

          // Log payment activity
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

          console.log('Successfully updated invoice and logged payment activity');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        const metadata = failedPayment.metadata || {};
        
        if (metadata.invoiceId) {
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

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
