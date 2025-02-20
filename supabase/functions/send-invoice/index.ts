
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from "npm:resend@2.0.0";
import { jsPDF } from "npm:jspdf@latest";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInvoiceRequest {
  invoiceId: string;
  recipientEmail: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, recipientEmail, message } = await req.json() as SendInvoiceRequest;

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers:customer_id (*),
        business_profiles:business_id (*),
        invoice_items (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    console.log('Creating payment link for invoice:', invoice.invoice_number);

    // Create payment link
    const paymentLinkResponse = await fetch(`${new URL(req.url).origin}/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: invoice.total,
        customerEmail: recipientEmail,
        description: `Payment for invoice ${invoice.invoice_number}`,
      }),
    });

    const { url: paymentUrl } = await paymentLinkResponse.json();

    // Generate PDF
    const pdfBuffer = await generatePDF(invoice, invoice.business_profiles, invoice.customers);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Generate HTML content with payment link
    const htmlContent = `
      <html>
        <body>
          <h2>Invoice from ${invoice.business_profiles?.business_name || 'Our Company'}</h2>
          ${message ? `<p>${message}</p>` : ''}
          <p>Invoice Number: ${invoice.invoice_number}</p>
          <p>Due Date: ${invoice.due_date}</p>
          <p>Amount Due: $${invoice.balance_due}</p>
          <p>Please find your invoice attached to this email.</p>
          <div style="margin: 20px 0;">
            <a href="${paymentUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">
              Pay Invoice Now
            </a>
          </div>
          <p>Or copy and paste this link to pay:</p>
          <p>${paymentUrl}</p>
          <hr/>
          <p>Total Amount: $${invoice.total}</p>
        </body>
      </html>
    `;

    console.log('Sending email to:', recipientEmail);

    const emailResponse = await resend.emails.send({
      from: "Invoices <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Invoice ${invoice.invoice_number} from ${invoice.business_profiles?.business_name || 'Our Company'}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    // Log activity
    await supabase
      .from('invoice_activities')
      .insert([{
        invoice_id: invoiceId,
        activity_type: 'email_sent',
        description: `Invoice emailed to ${recipientEmail} with payment link`,
      }]);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error in send-invoice function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
