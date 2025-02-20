import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-deno-subhost',
};

interface CreatePaymentLinkRequest {
  invoiceId: string;
  amount: number;
  customerEmail: string;
  description: string;
  invoiceNumber: string;
  customerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const denoSubhost = req.headers.get('x-deno-subhost');
  if (!denoSubhost || denoSubhost !== 'edge-functions') {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request: missing or invalid x-deno-subhost header' 
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    console.log('Starting create-payment-link function');
    
    const { invoiceId, amount, customerEmail, description, invoiceNumber, customerName }: CreatePaymentLinkRequest = await req.json();
    
    if (!invoiceId || !amount || !customerEmail || !invoiceNumber || !customerName) {
      console.error('Missing required fields:', { invoiceId, amount, customerEmail, invoiceNumber, customerName });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Creating product for customer:', customerName);

    // Create product with customer name in the title
    const product = await stripe.products.create({
      name: `Invoice for ${customerName}`,
      description: description || `Payment for invoice ${invoiceNumber}`,
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
        customerName,
      },
    });

    console.log('Product created:', product.id);

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

    console.log('Price created:', price.id);

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
          url: `${new URL(req.url).origin}/dashboard/invoices/${invoiceId}?payment=success`,
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

    await stripe.products.update(product.id, {
      metadata: {
        payment_link: paymentLink.url,
      },
    });

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
  } catch (error: any) {
    console.error('Error in create-payment-link function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
