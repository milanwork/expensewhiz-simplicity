import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from "npm:resend@2.0.0";
import { jsPDF } from "npm:jspdf@latest";
import QRCode from "npm:qrcode@latest";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInvoiceRequest {
  invoiceId: string;
  recipientEmail: string;
  message?: string;
}

const generatePDF = async (invoice: any, business: any, customer: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.text(business.business_name, 20, 20);
  doc.setFontSize(10);
  doc.text(business.address, 20, 30);
  doc.text(`Phone: ${business.phone}`, 20, 35);
  doc.text(`Email: ${business.email}`, 20, 40);
  doc.text(`ABN: ${business.abn}`, 20, 45);

  // Invoice Title
  doc.setFontSize(16);
  doc.text("Tax Invoice", 20, 60);

  // Invoice Details Table
  doc.setFontSize(10);
  const invoiceDetailsY = 70;
  doc.text("Purchase order no", 20, invoiceDetailsY);
  doc.text("Invoice number", 80, invoiceDetailsY);
  doc.text("Issue date", 140, invoiceDetailsY);
  doc.text("Due date", 180, invoiceDetailsY);
  
  doc.text(invoice.customer_po_number, 20, invoiceDetailsY + 5);
  doc.text(invoice.invoice_number, 80, invoiceDetailsY + 5);
  doc.text(invoice.issue_date, 140, invoiceDetailsY + 5);
  doc.text(invoice.due_date, 180, invoiceDetailsY + 5);

  // Billing and Shipping Info
  const addressY = 90;
  doc.text("Bill to", 20, addressY);
  doc.text(customer.company_name, 20, addressY + 5);
  doc.text(customer.billing_address, 20, addressY + 10);
  doc.text(`${customer.billing_suburb} ${customer.billing_state} ${customer.billing_postcode}`, 20, addressY + 15);
  doc.text(customer.billing_country, 20, addressY + 20);

  if (customer.shipping_address) {
    doc.text("Ship to", 120, addressY);
    doc.text(customer.company_name, 120, addressY + 5);
    doc.text(customer.shipping_address, 120, addressY + 10);
    doc.text(`${customer.shipping_suburb} ${customer.shipping_state} ${customer.shipping_postcode}`, 120, addressY + 15);
    doc.text(customer.shipping_country, 120, addressY + 20);
  }

  // Items Table
  const itemsStartY = 130;
  doc.text("Description", 20, itemsStartY);
  doc.text("Tax", 140, itemsStartY);
  doc.text("Amount ($)", 170, itemsStartY);

  let currentY = itemsStartY + 10;
  invoice.invoice_items.forEach((item: any) => {
    doc.text(item.description, 20, currentY);
    doc.text(item.tax_code, 140, currentY);
    doc.text(item.amount.toFixed(2), 170, currentY);
    currentY += 7;
  });

  // Totals
  const totalsY = currentY + 10;
  doc.text("Subtotal", 140, totalsY);
  doc.text(invoice.subtotal.toFixed(2), 170, totalsY);
  
  doc.text("Tax", 140, totalsY + 7);
  doc.text(invoice.tax.toFixed(2), 170, totalsY + 7);
  
  doc.text("Total Amount", 140, totalsY + 14);
  doc.text(invoice.total.toFixed(2), 170, totalsY + 14);
  
  doc.text("Amount Paid", 140, totalsY + 21);
  doc.text(invoice.amount_paid.toFixed(2), 170, totalsY + 21);
  
  doc.setFont("helvetica", "bold");
  doc.text("Balance Due", 140, totalsY + 28);
  doc.text(invoice.balance_due.toFixed(2), 170, totalsY + 28);
  doc.setFont("helvetica", "normal");

  // Notes
  if (invoice.notes) {
    doc.text("Notes:", 20, totalsY + 40);
    doc.text(invoice.notes, 20, totalsY + 47);
  }

  // Payment Methods
  const paymentY = totalsY + 70;
  doc.text("How to pay", 20, paymentY);
  
  // Generate QR Code
  const qrCodeUrl = await QRCode.toDataURL(`https://example.com/invoices/${invoice.invoice_number}`);
  doc.addImage(qrCodeUrl, 'PNG', 20, paymentY + 10, 30, 30);
  
  // Bank Details
  doc.text("Bank deposit", 70, paymentY);
  doc.text("Bank: ANZ BANK", 70, paymentY + 10);
  doc.text(`Name: ${business.business_name}`, 70, paymentY + 15);
  doc.text("BSB: 013017", 70, paymentY + 20);
  doc.text("ACC: 123456789", 70, paymentY + 25);
  doc.text(`Ref: ${invoice.invoice_number}`, 70, paymentY + 30);

  // Footer
  const footerY = doc.internal.pageSize.height - 10;
  doc.text(`Page 1 of 1`, 20, footerY);
  doc.text(`Invoice no: ${invoice.invoice_number}`, pageWidth/2 - 20, footerY);
  doc.text(`Due date: ${invoice.due_date}`, pageWidth - 60, footerY);

  return doc.output('arraybuffer');
};

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
        customers (*),
        business_profiles (*),
        invoice_items (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(invoice, invoice.business_profiles, invoice.customers);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Generate HTML content
    const htmlContent = `
      <html>
        <body>
          <h2>Invoice from ${invoice.business_profiles.business_name || 'Our Company'}</h2>
          ${message ? `<p>${message}</p>` : ''}
          <p>Invoice Number: ${invoice.invoice_number}</p>
          <p>Due Date: ${invoice.due_date}</p>
          <p>Amount Due: $${invoice.balance_due}</p>
          <p>Please find your invoice attached to this email.</p>
          <hr/>
          <p>Total Amount: $${invoice.total}</p>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Invoices <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Invoice ${invoice.invoice_number} from ${invoice.business_profiles.business_name || 'Our Company'}`,
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
        description: `Invoice emailed to ${recipientEmail}`,
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
