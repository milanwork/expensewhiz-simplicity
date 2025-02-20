
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentLinkRequest {
  invoiceId: string;
  amount: number;
  customerEmail: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, amount, customerEmail, description }: CreatePaymentLinkRequest = await req.json();

    console.log('Creating payment link for invoice:', invoiceId);

    // Create a Payment Intent first to attach metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'aud',
      metadata: {
        invoiceId: invoiceId,
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Invoice ${invoiceId}`,
              description: description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${req.headers.get('origin')}/dashboard/invoices/${invoiceId}?payment=success`,
        },
      },
      payment_intent_data: {
        metadata: {
          invoiceId: invoiceId,
        },
      },
      automatic_tax: { enabled: true },
      invoice_creation: { enabled: true },
      recipient_email: customerEmail,
    });

    console.log('Payment link created:', paymentLink.url);

    return new Response(
      JSON.stringify({ url: paymentLink.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);
