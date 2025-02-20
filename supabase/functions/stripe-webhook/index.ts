
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend@2.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PaymentReceivedEmail } from '../send-invoice/_templates/payment-received.tsx';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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
    const event = JSON.parse(body);
    console.log('Processing webhook event:', event.type);
    console.log('Event data:', JSON.stringify(event.data, null, 2));

    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const sessionOrIntent = event.data.object;
        const metadata = sessionOrIntent.metadata || {};
        const invoiceId = metadata.invoiceId;
        
        const rawAmount = sessionOrIntent.amount_total || sessionOrIntent.amount;
        const amountPaid = parseFloat((rawAmount / 100).toFixed(2));

        if (invoiceId) {
          console.log(`Processing payment for invoice ${invoiceId} - Amount: $${amountPaid}`);

          // Fetch invoice with customer details
          const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select(`
              *,
              customers (
                first_name,
                surname,
                company_name,
                organization_type,
                billing_email
              )
            `)
            .eq('id', invoiceId)
            .single();

          if (fetchError) {
            console.error('Error fetching invoice:', fetchError);
            throw fetchError;
          }

          console.log('Current invoice state:', invoice);

          // Calculate new values
          const currentAmountPaid = parseFloat((invoice.amount_paid || 0).toFixed(2));
          const newAmountPaid = currentAmountPaid + amountPaid;
          const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);
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

          // Send email confirmation
          if (invoice.customers?.billing_email) {
            const customerName = invoice.customers.organization_type === 'company' 
              ? invoice.customers.company_name 
              : `${invoice.customers.first_name} ${invoice.customers.surname}`;

            try {
              const emailHtml = await renderAsync(
                PaymentReceivedEmail({
                  customerName,
                  invoiceNumber: invoice.invoice_number,
                  amountPaid,
                  invoiceTotal: invoice.total,
                })
              );

              const { data: emailResult, error: emailError } = await resend.emails.send({
                from: 'Acme <onboarding@resend.dev>',
                to: [invoice.customers.billing_email],
                subject: `Payment Received for Invoice ${invoice.invoice_number}`,
                html: emailHtml,
              });

              if (emailError) {
                console.error('Error sending email:', emailError);
                throw emailError;
              }

              console.log('Payment confirmation email sent:', emailResult);
            } catch (emailError) {
              console.error('Error sending payment confirmation email:', emailError);
            }
          }

          console.log('Successfully updated invoice and logged payment activity');
        } else {
          console.error('No invoiceId found in payment metadata');
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
