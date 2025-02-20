
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
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Helper function to safely add text
    const addText = (text: string, x: number, y: number, options = {}) => {
      try {
        doc.text(text?.toString() || '', x, y, options);
      } catch (error) {
        console.error(`Error adding text: "${text}" at (${x}, ${y}):`, error);
      }
    };

    // Header Section
    doc.setFontSize(20);
    addText(business.business_name || 'Business Name', 20, 20);

    doc.setFontSize(10);
    const businessAddress = [
      business.address_line1,
      business.address_line2,
      `${business.city || ''} ${business.state || ''} ${business.postcode || ''}`,
      business.country
    ].filter(Boolean).join(', ');
    addText(businessAddress, 20, 30);
    addText(`ABN: ${business.abn_acn || ''}`, 20, 35);

    // Invoice Title
    doc.setFontSize(16);
    addText('Tax Invoice', 20, 45);

    // Invoice Details Section
    doc.setFontSize(10);
    const invoiceDetailStartY = 55;
    addText('Invoice Number:', 20, invoiceDetailStartY);
    addText(invoice.invoice_number || '', 80, invoiceDetailStartY);
    addText('Date:', 20, invoiceDetailStartY + 7);
    addText(invoice.issue_date || '', 80, invoiceDetailStartY + 7);
    addText('Due Date:', 20, invoiceDetailStartY + 14);
    addText(invoice.due_date || '', 80, invoiceDetailStartY + 14);

    // Customer Details Section
    const customerStartY = 85;
    doc.setFontSize(11);
    addText('Bill To:', 20, customerStartY);
    doc.setFontSize(10);
    addText(customer.company_name || '', 20, customerStartY + 7);
    addText(customer.billing_address || '', 20, customerStartY + 14);
    addText(`${customer.billing_suburb || ''} ${customer.billing_state || ''} ${customer.billing_postcode || ''}`, 20, customerStartY + 21);
    addText(customer.billing_country || '', 20, customerStartY + 28);

    // Items Table Header
    const tableStartY = 130;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, tableStartY - 5, pageWidth - 40, 8, 'F');
    addText('Description', 20, tableStartY);
    addText('Amount', pageWidth - 40, tableStartY, { align: 'right' });

    // Items
    let currentY = tableStartY + 10;
    invoice.invoice_items?.forEach((item: any) => {
      addText(item.description || '', 20, currentY);
      addText(item.amount?.toFixed(2) || '0.00', pageWidth - 40, currentY, { align: 'right' });
      currentY += 7;
    });

    // Totals Section
    const totalsStartY = currentY + 10;
    addText('Subtotal:', pageWidth - 90, totalsStartY);
    addText(invoice.subtotal?.toFixed(2) || '0.00', pageWidth - 40, totalsStartY, { align: 'right' });

    addText('Tax:', pageWidth - 90, totalsStartY + 7);
    addText(invoice.tax?.toFixed(2) || '0.00', pageWidth - 40, totalsStartY + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    addText('Total Due:', pageWidth - 90, totalsStartY + 14);
    addText(invoice.total?.toFixed(2) || '0.00', pageWidth - 40, totalsStartY + 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Notes Section
    if (invoice.notes) {
      const notesY = totalsStartY + 30;
      addText('Notes:', 20, notesY);
      doc.setFontSize(9);
      addText(invoice.notes, 20, notesY + 7);
    }

    // Payment Details Section
    const paymentY = doc.internal.pageSize.height - 50;
    doc.setFontSize(10);
    addText('Payment Details:', 20, paymentY);
    addText('Bank: ANZ BANK', 20, paymentY + 7);
    addText(`Account Name: ${business.business_name || ''}`, 20, paymentY + 14);
    addText('BSB: 013017', 20, paymentY + 21);
    addText('Account: 123456789', 20, paymentY + 28);

    // Footer
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(8);
    addText('Thank you for your business', pageWidth / 2, footerY, { align: 'center' });

    return doc.output('arraybuffer');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, recipientEmail, message } = await req.json() as SendInvoiceRequest;

    // Fetch invoice details with all related data
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

    console.log('Generating PDF for invoice:', invoice.invoice_number);

    // Generate PDF
    const pdfBuffer = await generatePDF(invoice, invoice.business_profiles, invoice.customers);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Generate HTML content
    const htmlContent = `
      <html>
        <body>
          <h2>Invoice from ${invoice.business_profiles?.business_name || 'Our Company'}</h2>
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
