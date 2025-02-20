
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const { invoiceId, amount, customerEmail, description, invoiceNumber, customerName } = await req.json();

    if (!invoiceId || !amount || !customerEmail || !invoiceNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating product for invoice');

    // Create product
    const product = await stripe.products.create({
      name: `Invoice ${invoiceNumber} for ${customerName}`,
      description: description || `Payment for invoice ${invoiceNumber}`,
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
      },
    });

    console.log('Product created:', product.id);

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100), // Convert to cents
      currency: 'aud',
    });

    console.log('Price created:', price.id);

    // Create payment link
    const origin = req.headers.get('origin') || '';
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${origin}/dashboard/invoices/${invoiceId}?payment=success`,
        },
      },
      billing_address_collection: 'auto',
      custom_text: {
        submit: {
          message: `Thank you for your payment for Invoice ${invoiceNumber}`,
        },
      },
    });

    console.log('Payment link created successfully:', paymentLink.url);

    return new Response(
      JSON.stringify({ url: paymentLink.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-payment-link function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
