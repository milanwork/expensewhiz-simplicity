
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-deno-subhost',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripeBaseUrl = 'https://api.stripe.com/v1';

async function makeStripeRequest(endpoint: string, data: Record<string, any>) {
  const formData = new URLSearchParams();
  
  // Flatten the data object into form data
  function appendFormData(obj: any, prefix = '') {
    for (const key in obj) {
      if (obj[key] === undefined || obj[key] === null) continue;
      
      const value = obj[key];
      const keyPath = prefix ? `${prefix}[${key}]` : key;

      if (typeof value === 'object' && !Array.isArray(value)) {
        appendFormData(value, keyPath);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            appendFormData(item, `${keyPath}[${index}]`);
          } else {
            formData.append(`${keyPath}[${index}]`, item.toString());
          }
        });
      } else {
        formData.append(keyPath, value.toString());
      }
    }
  }

  appendFormData(data);

  console.log(`Making Stripe request to ${endpoint}`, data);

  const response = await fetch(`${stripeBaseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log(`Stripe ${endpoint} response:`, responseText);

  if (!response.ok) {
    try {
      const errorData = JSON.parse(responseText);
      throw new Error(errorData.error?.message || `Stripe ${endpoint} request failed`);
    } catch (e) {
      throw new Error(`Stripe ${endpoint} request failed: ${responseText}`);
    }
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid JSON response from Stripe ${endpoint}: ${responseText}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-payment-link function');
    
    // Get the request body as text first
    const bodyText = await req.text();
    console.log('Request body:', bodyText);

    // Parse the JSON body
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { invoiceId, amount, customerEmail, description, invoiceNumber, customerName } = body;
    
    // Validate required fields
    if (!invoiceId || !amount || !customerEmail || !invoiceNumber || !customerName) {
      const missingFields = [];
      if (!invoiceId) missingFields.push('invoiceId');
      if (!amount) missingFields.push('amount');
      if (!customerEmail) missingFields.push('customerEmail');
      if (!invoiceNumber) missingFields.push('invoiceNumber');
      if (!customerName) missingFields.push('customerName');

      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          missingFields 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create product
    const product = await makeStripeRequest('/products', {
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
    const price = await makeStripeRequest('/prices', {
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'aud',
    });

    console.log('Price created:', price.id);

    // Create payment link
    const paymentLink = await makeStripeRequest('/payment_links', {
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
    });

    console.log('Payment link created successfully:', paymentLink.url);

    return new Response(
      JSON.stringify({ 
        url: paymentLink.url,
        productId: product.id,
        priceId: price.id,
      }),
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
};

serve(handler);
