
import { jsPDF } from "npm:jspdf@latest";

interface BusinessProfile {
  business_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface Customer {
  company_name?: string;
  first_name?: string;
  surname?: string;
  billing_address?: string;
  billing_suburb?: string;
  billing_state?: string;
  billing_postcode?: string;
  billing_country?: string;
}

interface InvoiceItem {
  description?: string;
  amount: number;
}

interface Invoice {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  invoice_items: InvoiceItem[];
}

export async function generatePDF(
  invoice: Invoice,
  business: BusinessProfile,
  customer: Customer
): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  // Business Details
  doc.setFontSize(20);
  doc.text(business.business_name || 'Business Name', 20, yPosition);
  
  doc.setFontSize(10);
  yPosition += 15;
  if (business.address_line1) {
    doc.text(business.address_line1, 20, yPosition);
    yPosition += 5;
  }
  if (business.address_line2) {
    doc.text(business.address_line2, 20, yPosition);
    yPosition += 5;
  }
  doc.text([
    business.city || '',
    business.state || '',
    business.postcode || '',
  ].filter(Boolean).join(', '), 20, yPosition);
  yPosition += 5;
  if (business.country) {
    doc.text(business.country, 20, yPosition);
  }

  // Invoice Details
  yPosition += 20;
  doc.setFontSize(16);
  doc.text(`Invoice #${invoice.invoice_number}`, pageWidth - 60, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Issue Date: ${invoice.issue_date}`, pageWidth - 60, 30, { align: 'right' });
  doc.text(`Due Date: ${invoice.due_date}`, pageWidth - 60, 35, { align: 'right' });

  // Bill To
  doc.setFontSize(12);
  doc.text('Bill To:', 20, yPosition);
  yPosition += 7;
  doc.setFontSize(10);
  doc.text([
    customer.company_name || `${customer.first_name || ''} ${customer.surname || ''}`,
    customer.billing_address || '',
    customer.billing_suburb || '',
    [customer.billing_state || '', customer.billing_postcode || ''].filter(Boolean).join(' '),
    customer.billing_country || ''
  ].filter(Boolean), 20, yPosition);

  // Items Table
  yPosition += 30;
  const columns = ['Description', 'Amount'];
  const data = invoice.invoice_items.map(item => [
    item.description || '',
    `$${item.amount.toFixed(2)}`
  ]);

  // Table headers
  doc.setFontSize(10);
  doc.text('Description', 20, yPosition);
  doc.text('Amount', pageWidth - 60, yPosition, { align: 'right' });
  
  yPosition += 5;
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Table content
  data.forEach(row => {
    doc.text(row[0], 20, yPosition);
    doc.text(row[1], pageWidth - 60, yPosition, { align: 'right' });
    yPosition += 7;
  });

  // Totals
  yPosition += 10;
  doc.line(pageWidth - 80, yPosition, pageWidth - 20, yPosition);
  yPosition += 7;
  doc.text('Subtotal:', pageWidth - 80, yPosition);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 60, yPosition, { align: 'right' });
  yPosition += 7;
  doc.text('Tax:', pageWidth - 80, yPosition);
  doc.text(`$${invoice.tax.toFixed(2)}`, pageWidth - 60, yPosition, { align: 'right' });
  yPosition += 7;
  doc.text('Total:', pageWidth - 80, yPosition);
  doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - 60, yPosition, { align: 'right' });

  // Notes
  if (invoice.notes) {
    yPosition += 20;
    doc.setFontSize(12);
    doc.text('Notes:', 20, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.text(invoice.notes, 20, yPosition);
  }

  return doc.output('arraybuffer');
}
