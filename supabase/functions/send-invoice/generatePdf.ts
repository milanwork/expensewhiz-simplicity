
import { jsPDF } from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.es.min.js";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  notes: string | null;
  status: string;
  total: number;
  tax: number;
  invoice_items: Array<{
    description: string;
    amount: number;
    tax_code: string;
  }>;
}

interface BusinessProfile {
  business_name: string | null;
  abn_acn: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  pdf_notes_template: string | null;
}

interface Customer {
  company_name: string | null;
  first_name: string | null;
  surname: string | null;
}

export async function generatePDF(
  invoice: Invoice,
  business: BusinessProfile,
  customer: Customer,
  paymentDate?: string | null
): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Business Header
  doc.setFontSize(24);
  doc.text(business.business_name || '', 20, 30);

  // Business Details
  doc.setFontSize(10);
  let yPos = 45;
  if (business.address_line1) {
    doc.text(business.address_line1, 20, yPos);
    yPos += 5;
  }
  if (business.city || business.state || business.postcode) {
    doc.text(`${business.city || ''} ${business.state || ''} ${business.postcode || ''}`, 20, yPos);
    yPos += 5;
  }
  doc.text(`Phone: ${business.phone || ''}`, 20, yPos);
  yPos += 5;
  doc.text(`Email: ${business.email || ''}`, 20, yPos);
  yPos += 5;
  doc.text(`ABN: ${business.abn_acn || ''}`, 20, yPos);
  
  // Tax Invoice Title
  doc.setFontSize(20);
  doc.text('Tax invoice', 20, yPos + 20);

  // Invoice Details
  doc.setFontSize(10);
  const gridStartY = yPos + 30;
  doc.text('Invoice number:', 120, gridStartY);
  doc.text(invoice.invoice_number, 160, gridStartY);
  doc.text('Issue date:', 120, gridStartY + 7);
  doc.text(invoice.issue_date, 160, gridStartY + 7);
  doc.text('Due date:', 120, gridStartY + 14);
  doc.text(invoice.due_date, 160, gridStartY + 14);

  // Bill To
  doc.text('Bill to:', 20, gridStartY + 30);
  doc.text(customer.company_name || `${customer.first_name} ${customer.surname}`, 20, gridStartY + 37);

  // Items Table
  const tableTop = gridStartY + 50;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, tableTop, 170, 10, 'F');
  
  doc.text('Description', 30, tableTop + 7);
  doc.text('Tax', 140, tableTop + 7);
  doc.text('Amount ($)', 160, tableTop + 7);
  
  let itemY = tableTop + 20;
  invoice.invoice_items.forEach(item => {
    doc.text(item.description || '', 30, itemY);
    doc.text(item.tax_code || '', 140, itemY);
    doc.text(item.amount.toFixed(2), 160, itemY);
    itemY += 10;
  });

  // Totals
  const totalsY = Math.max(itemY + 20, tableTop + 120);
  doc.text('Tax:', 140, totalsY);
  doc.text(invoice.tax.toFixed(2), 160, totalsY);
  
  doc.text('Total Amount:', 140, totalsY + 10);
  doc.text(invoice.total.toFixed(2), 160, totalsY + 10);

  // Add pdf_notes_template at the bottom left
  if (business.pdf_notes_template) {
    doc.setFontSize(9);
    doc.text(business.pdf_notes_template, 20, doc.internal.pageSize.height - 30);
  }

  // Payment Status if paid
  if (invoice.status === 'paid') {
    doc.setFontSize(24);
    doc.setTextColor(0, 150, 0);
    doc.text('PAID', 160, 40);
    if (paymentDate) {
      doc.setFontSize(12);
      doc.text(`Paid on ${paymentDate}`, 160, 50);
    }
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('arraybuffer');
}
