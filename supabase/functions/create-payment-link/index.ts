
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-payment-link function');
    
    // Validate request
    const { invoiceId, amount, customerEmail, description }: CreatePaymentLinkRequest = await req.json();
    
    if (!invoiceId || !amount || !customerEmail) {
      console.error('Missing required fields:', { invoiceId, amount, customerEmail });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Creating payment intent with metadata:', { invoiceId, amount });

    // Create a Payment Intent first to attach metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'aud',
      metadata: {
        invoiceId: invoiceId,
      },
    });

    console.log('Payment intent created:', paymentIntent.id);

    console.log('Creating payment link with config:', {
      amount: Math.round(amount * 100),
      description,
      customerEmail,
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
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${new URL(req.url).origin}/dashboard/invoices/${invoiceId}?payment=success`,
        },
      },
      payment_intent_data: {
        metadata: {
          invoiceId: invoiceId,
        },
      },
      automatic_tax: { enabled: false },
      invoice_creation: { enabled: true },
      recipient_email: customerEmail,
    });

    console.log('Payment link created successfully:', paymentLink.url);

    return new Response(
      JSON.stringify({ url: paymentLink.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in create-payment-link function:', error);
    
    // Handle Stripe errors specifically
    if (error.type && error.type.startsWith('Stripe')) {
      return new Response(
        JSON.stringify({ 
          error: error.message,
          type: error.type,
          code: error.code 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
