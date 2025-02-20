
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
  invoiceNumber: string;  // Added this field
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-payment-link function');
    
    // Validate request
    const { invoiceId, amount, customerEmail, description, invoiceNumber }: CreatePaymentLinkRequest = await req.json();
    
    if (!invoiceId || !amount || !customerEmail || !invoiceNumber) {
      console.error('Missing required fields:', { invoiceId, amount, customerEmail, invoiceNumber });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Creating product for invoice:', invoiceNumber);

    // First, create a product with proper invoice number
    const product = await stripe.products.create({
      name: `Invoice ${invoiceNumber}`,
      description: description || `Payment for invoice ${invoiceNumber}`,
      metadata: {
        invoiceId: invoiceId,
        customerEmail: customerEmail,
        invoiceNumber: invoiceNumber,
      },
    });

    console.log('Product created:', product.id);

    // Then, create a price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100), // Convert to cents
      currency: 'aud',
      metadata: {
        invoiceId: invoiceId,
        customerEmail: customerEmail,
        invoiceNumber: invoiceNumber,
      },
    });

    console.log('Price created:', price.id);

    // Create the payment link using the price ID
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoiceId,
        customerEmail: customerEmail,
        invoiceNumber: invoiceNumber,
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
          message: `Thank you for your payment for Invoice ${invoiceNumber}`,
        },
      },
    });

    console.log('Payment link created successfully:', paymentLink.url);

    // Store the payment link details in metadata
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
    
    // Handle Stripe errors specifically
    if (error.type && error.type.startsWith('Stripe')) {
      console.error('Stripe error details:', {
        type: error.type,
        code: error.code,
        param: error.param,
        message: error.message,
      });
      
      return new Response(
        JSON.stringify({ 
          error: error.message,
          type: error.type,
          code: error.code,
          param: error.param,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Handle other errors
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
