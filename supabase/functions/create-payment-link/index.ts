
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-deno-subhost',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PaymentLinkRequest {
  invoiceId: string;
  amount: number;
  customerEmail: string;
  description: string;
  invoiceNumber: string;
  customerName: string;
}

async function makeStripeRequest(endpoint: string, data: Record<string, any>) {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }

  const formData = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });

  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const responseText = await response.text();
  
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error(`Invalid JSON response from Stripe ${endpoint}:`, responseText);
    throw new Error(`Invalid response from Stripe: ${responseText}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to create-payment-link');

    // Ensure we have a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Clone the request to ensure we can read it multiple times if needed
    const clonedReq = req.clone();
    
    // First try to get the raw body
    const rawBody = await clonedReq.text();
    console.log('Raw request body:', rawBody);

    // Parse the body
    let requestData: PaymentLinkRequest;
    try {
      requestData = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: error.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate all required fields
    const requiredFields = ['invoiceId', 'amount', 'customerEmail', 'invoiceNumber', 'customerName'];
    const missingFields = requiredFields.filter(field => !requestData[field as keyof PaymentLinkRequest]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          missingFields 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Stripe product
    console.log('Creating Stripe product...');
    const product = await makeStripeRequest('/products', {
      name: `Invoice ${requestData.invoiceNumber} for ${requestData.customerName}`,
      description: requestData.description || `Payment for invoice ${requestData.invoiceNumber}`,
      metadata: {
        invoiceId: requestData.invoiceId,
        customerEmail: requestData.customerEmail,
        invoiceNumber: requestData.invoiceNumber,
      },
    });

    // Create price
    console.log('Creating Stripe price...');
    const price = await makeStripeRequest('/prices', {
      product: product.id,
      unit_amount: Math.round(requestData.amount * 100),
      currency: 'aud',
    });

    // Create payment link
    console.log('Creating payment link...');
    const paymentLink = await makeStripeRequest('/payment_links', {
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        invoiceId: requestData.invoiceId,
        customerEmail: requestData.customerEmail,
        invoiceNumber: requestData.invoiceNumber,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${req.headers.get('origin') || ''}/dashboard/invoices/${requestData.invoiceId}?payment=success`,
        },
      },
      billing_address_collection: 'auto',
    });

    console.log('Payment link created successfully');

    return new Response(
      JSON.stringify({ url: paymentLink.url }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in create-payment-link:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
