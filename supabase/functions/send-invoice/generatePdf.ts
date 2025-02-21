import { jsPDF } from 'jspdf';

interface Invoice {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  customer_po_number: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoice_items: {
    description: string | null;
    category: string;
    amount: number;
    job: string;
    tax_code: string;
  }[];
}

interface BusinessProfile {
  business_name: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  abn_acn: string | null;
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

  // Invoice Details Grid
  doc.setFontSize(10);
  const gridStartY = yPos + 30;
  doc.text('Invoice number', 400, gridStartY);
  doc.text('Issue date', 500, gridStartY);
  doc.text('Due date', 600, gridStartY);
  
  doc.text(invoice.invoice_number, 400, gridStartY + 15);
  doc.text(invoice.issue_date, 500, gridStartY + 15);
  doc.text(invoice.due_date, 600, gridStartY + 15);

  // Bill To
  doc.text('Bill to', 20, gridStartY + 40);
  doc.text(customer.company_name || `${customer.first_name} ${customer.surname}`, 20, gridStartY + 55);

  // Items Table
  const tableTop = gridStartY + 80;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, tableTop, doc.internal.pageSize.width - 40, 10, 'F');
  
  doc.text('Description', 30, tableTop + 7);
  doc.text('Tax', 450, tableTop + 7);
  doc.text('Amount ($)', 500, tableTop + 7, { align: 'right' });
  
  let itemY = tableTop + 20;
  invoice.invoice_items.forEach(item => {
    doc.text(item.description || '', 30, itemY);
    doc.text(item.tax_code || '', 450, itemY);
    doc.text(item.amount.toFixed(2), 500, itemY, { align: 'right' });
    itemY += 15;
  });

  // Totals
  const totalsY = itemY + 20;
  doc.text('Tax', 400, totalsY);
  doc.text(invoice.tax.toFixed(2), 500, totalsY, { align: 'right' });
  
  doc.text('Total Amount (inc. tax)', 400, totalsY + 15);
  doc.text(invoice.total.toFixed(2), 500, totalsY + 15, { align: 'right' });
  
  doc.text('Total paid', 400, totalsY + 30);
  doc.text('0.00', 500, totalsY + 30, { align: 'right' });
  
  doc.text('Balance due', 400, totalsY + 45);
  doc.text(invoice.total.toFixed(2), 500, totalsY + 45, { align: 'right' });

  // Notes Section (including pdf_notes_template)
  const notesY = totalsY + 70;
  doc.text('Notes', 20, notesY);
  if (business.pdf_notes_template) {
    doc.setFontSize(9);
    doc.text(business.pdf_notes_template, 20, notesY + 10);
  }
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.text(invoice.notes, 20, notesY + 30);
  }

  // Payment Status if paid
  if (invoice.status === 'paid') {
    doc.setFontSize(24);
    doc.setTextColor(0, 150, 0);
    doc.text('PAID', doc.internal.pageSize.width - 60, 40, { align: 'right' });
    if (paymentDate) {
      doc.setFontSize(12);
      doc.text(`Paid on ${paymentDate}`, doc.internal.pageSize.width - 60, 50, { align: 'right' });
    }
  }

  return doc.output('arraybuffer');
}
