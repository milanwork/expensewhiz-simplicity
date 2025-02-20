
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-deno-subhost',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Use native fetch for Stripe API calls
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripeBaseUrl = 'https://api.stripe.com/v1';

async function createStripeProduct(data: {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}) {
  const response = await fetch(`${stripeBaseUrl}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      name: data.name,
      ...(data.description ? { description: data.description } : {}),
      ...(data.metadata ? Object.fromEntries(
        Object.entries(data.metadata).map(([key, value]) => [`metadata[${key}]`, value])
      ) : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Stripe product');
  }

  return response.json();
}

async function createStripePrice(data: {
  product: string;
  unit_amount: number;
  currency: string;
  metadata?: Record<string, string>;
}) {
  const response = await fetch(`${stripeBaseUrl}/prices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      product: data.product,
      unit_amount: data.unit_amount.toString(),
      currency: data.currency,
      ...(data.metadata ? Object.fromEntries(
        Object.entries(data.metadata).map(([key, value]) => [`metadata[${key}]`, value])
      ) : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Stripe price');
  }

  return response.json();
}

async function createStripePaymentLink(data: {
  line_items: Array<{ price: string; quantity: number }>;
  metadata?: Record<string, string>;
  after_completion?: {
    type: string;
    redirect: { url: string };
  };
}) {
  const response = await fetch(`${stripeBaseUrl}/payment_links`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      ...Object.fromEntries(
        data.line_items.map((item, index) => [
          [`line_items[${index}][price]`, item.price],
          [`line_items[${index}][quantity]`, item.quantity.toString()],
        ]).flat()
      ),
      ...(data.metadata ? Object.fromEntries(
        Object.entries(data.metadata).map(([key, value]) => [`metadata[${key}]`, value])
      ) : {}),
      ...(data.after_completion ? {
        'after_completion[type]': data.after_completion.type,
        'after_completion[redirect][url]': data.after_completion.redirect.url,
      } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Stripe payment link');
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-payment-link function');
    
    const { invoiceId, amount, customerEmail, description, invoiceNumber, customerName } = await req.json();
    
    // Validate required fields
    if (!invoiceId || !amount || !customerEmail || !invoiceNumber || !customerName) {
      console.error('Missing required fields:', { invoiceId, amount, customerEmail, invoiceNumber, customerName });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating product for invoice:', invoiceNumber);

    // Create product
    const product = await createStripeProduct({
      name: `Invoice ${invoiceNumber} for ${customerName}`,
      description: description || `Payment for invoice ${invoiceNumber}`,
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
        customerName,
      },
    });

    console.log('Product created:', product.id);

    // Create price
    const price = await createStripePrice({
      product: product.id,
      unit_amount: Math.round(amount * 100), // Convert to cents
      currency: 'aud',
      metadata: {
        invoiceId,
        customerEmail,
        invoiceNumber,
        customerName,
      },
    });

    console.log('Price created:', price.id);

    // Create payment link
    const paymentLink = await createStripePaymentLink({
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
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
