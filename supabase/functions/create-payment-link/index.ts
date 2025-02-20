import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

// enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ShareInvoiceRequest {
  invoiceId: string;
  amount: number;
  customerEmail: string;
  description: string;
  invoiceNumber: string;
  customerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting create-payment-link function');
    
    const { invoiceId, amount, customerEmail, description, invoiceNumber, customerName } = await req.json();

    if (!invoiceId || !amount || !customerEmail || !invoiceNumber || !customerName) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Create product
    const product = await stripe.products.create({
      name: `Invoice ${invoiceNumber} for ${customerName}`,
      description: description || `Payment for invoice ${invoiceNumber}`,
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
        customerName,
      },
    });

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'aud',
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
        customerName,
      },
    });

    // Create payment link with metadata and success URL
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
        customerName,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${req.headers.get('origin') || ''}/dashboard/invoices/${invoiceId}?payment=success`,
        },
      },
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      custom_text: {
        submit: {
          message: `Thank you for your payment, ${customerName}`,
        },
      },
    });

    console.log('Payment link created successfully:', paymentLink.url);

    return new Response(
      JSON.stringify({ 
        url: paymentLink.url,
        product_id: product.id,
        price_id: price.id,
      }),
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
