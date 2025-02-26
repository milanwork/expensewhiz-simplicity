
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from "npm:resend@2.0.0";
import { generatePDF } from "./generatePdf.ts";

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

    // Fetch invoice details with payment activities
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers:customer_id (*),
        business_profiles:business_id (*),
        invoice_items (*),
        invoice_activities (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    console.log('Processing invoice:', invoice);

    // Find payment date if invoice is paid
    let paymentDate = null;
    if (invoice.status === 'paid') {
      const paymentActivity = invoice.invoice_activities?.find(
        (activity: any) => activity.activity_type === 'payment_received'
      );
      if (paymentActivity) {
        paymentDate = new Date(paymentActivity.created_at).toLocaleDateString();
      }
    }

    // Only create payment link if invoice is not paid
    let paymentUrl = null;
    if (invoice.status !== 'paid') {
      console.log('Creating payment link for invoice:', invoice.invoice_number);
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-link', {
        body: {
          invoiceId: invoice.id,
          amount: invoice.total,
          customerEmail: recipientEmail,
          description: `Payment for invoice ${invoice.invoice_number}`,
        },
      });

      if (paymentError) {
        console.error('Payment link error:', paymentError);
        throw new Error(`Failed to create payment link: ${paymentError?.message || 'Unknown error'}`);
      }

      paymentUrl = paymentData?.url;
    }

    // Generate PDF with payment status
    const pdfBuffer = await generatePDF(invoice, invoice.business_profiles, invoice.customers, paymentDate);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Create email content based on invoice status
    let htmlContent = `
      <html>
        <body>
          <h2>Invoice from ${invoice.business_profiles?.business_name || 'Our Company'}</h2>
          ${message ? `<p>${message}</p>` : ''}
          <p>Invoice Number: ${invoice.invoice_number}</p>
          <p>Issue Date: ${invoice.issue_date}</p>
          ${invoice.status === 'paid' 
            ? `<p style="color: #4CAF50;">Payment received on ${paymentDate}</p>`
            : `<p>Due Date: ${invoice.due_date}</p>
               <p>Amount Due: $${invoice.balance_due}</p>`
          }
    `;

    // Only add payment button if invoice is not paid
    if (invoice.status !== 'paid' && paymentUrl) {
      htmlContent += `
        <div style="margin: 20px 0;">
          <a href="${paymentUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">
            Pay Invoice Now
          </a>
        </div>
        <p>Or copy and paste this link to pay:</p>
        <p>${paymentUrl}</p>
      `;
    }

    htmlContent += `
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

    // Log activity after successful email send
    await supabase
      .from('invoice_activities')
      .insert([{
        invoice_id: invoiceId,
        activity_type: 'email_sent',
        description: `Invoice emailed to ${recipientEmail}${invoice.status === 'paid' ? ' (Paid)' : ' with payment link'}`,
      }]);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
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
