
import { jsPDF } from "npm:jspdf@latest";

interface BusinessProfile {
  business_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  abn?: string;
  bank_name?: string;
  bank_account_name?: string;
  bsb?: string;
  account_number?: string;
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
  status: string;
  invoice_items: InvoiceItem[];
}

export async function generatePDF(
  invoice: Invoice,
  business: BusinessProfile,
  customer: Customer,
  paymentDate?: string | null
): Promise<Uint8Array> {
  const doc = new jsPDF();
  let yPosition = 20;

  // Business Name
  doc.setFontSize(24);
  doc.text(business.business_name || 'Business Name', 20, yPosition);
  
  // Business Address and ABN
  yPosition += 15;
  doc.setFontSize(10);
  const businessAddress = [
    business.address_line1,
    `${business.city || ''} ${business.state || ''} ${business.postcode || ''}, ${business.country || ''}`,
    `ABN: ${business.abn || business.business_name}`
  ].filter(Boolean);
  businessAddress.forEach(line => {
    doc.text(line, 20, yPosition);
    yPosition += 6;
  });

  // Tax Invoice Title
  yPosition += 10;
  doc.setFontSize(16);
  doc.text('Tax Invoice', 20, yPosition);
  
  // Invoice Details
  yPosition += 15;
  doc.setFontSize(10);
  const invoiceDetails = [
    ['Invoice Number:', invoice.invoice_number],
    ['Date:', invoice.issue_date],
    ['Due Date:', invoice.due_date]
  ];

  invoiceDetails.forEach(([label, value]) => {
    doc.text(label, 20, yPosition);
    doc.text(value, 100, yPosition);
    yPosition += 7;
  });

  // Bill To Section
  yPosition += 10;
  doc.text('Bill To:', 20, yPosition);
  yPosition += 7;
  
  const billingAddress = [
    customer.company_name || `${customer.first_name || ''} ${customer.surname || ''}`,
    customer.billing_address,
    `${customer.billing_suburb || ''} ${customer.billing_state || ''} ${customer.billing_postcode || ''}`,
    customer.billing_country
  ].filter(Boolean);

  billingAddress.forEach(line => {
    doc.text(line, 20, yPosition);
    yPosition += 6;
  });

  // Items Table
  yPosition += 15;
  // Gray background for header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPosition - 5, doc.internal.pageSize.width - 40, 8, 'F');
  
  // Header
  doc.text('Description', 20, yPosition);
  doc.text('Amount', doc.internal.pageSize.width - 60, yPosition, { align: 'right' });
  yPosition += 10;

  // Items
  invoice.invoice_items.forEach(item => {
    doc.text(item.description || '', 20, yPosition);
    doc.text(`${item.amount.toFixed(2)}`, doc.internal.pageSize.width - 60, yPosition, { align: 'right' });
    yPosition += 7;
  });

  // Totals
  yPosition += 10;
  const totalsStart = doc.internal.pageSize.width - 140;
  const totalsValueX = doc.internal.pageSize.width - 60;
  
  doc.text('Subtotal:', totalsStart, yPosition);
  doc.text(`${invoice.subtotal.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });
  yPosition += 7;
  
  doc.text('Tax:', totalsStart, yPosition);
  doc.text(`${invoice.tax.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });
  yPosition += 7;
  
  doc.setFontSize(11);
  doc.text('Total Due:', totalsStart, yPosition);
  doc.text(`${invoice.total.toFixed(2)}`, totalsValueX, yPosition, { align: 'right' });

  // Notes
  if (invoice.notes) {
    yPosition += 20;
    doc.setFontSize(10);
    doc.text('Notes:', 20, yPosition);
    yPosition += 7;
    doc.text(invoice.notes, 20, yPosition);
  }

  // Payment Details
  yPosition += 30;
  doc.text('Payment Details:', 20, yPosition);
  yPosition += 7;
  
  const paymentDetails = [
    ['Bank:', business.bank_name || 'ANZ BANK'],
    ['Account Name:', business.bank_account_name || business.business_name],
    ['BSB:', business.bsb || ''],
    ['Account:', business.account_number || '']
  ];

  paymentDetails.forEach(([label, value]) => {
    if (value) {
      doc.text(label, 20, yPosition);
      doc.text(value, 70, yPosition);
      yPosition += 7;
    }
  });

  // Payment Status for paid invoices
  if (invoice.status === 'paid') {
    doc.setFontSize(14);
    doc.setTextColor(0, 150, 0);
    const paidText = `PAID${paymentDate ? ` on ${paymentDate}` : ''}`;
    doc.text(paidText, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 20, { align: 'right' });
  }

  return doc.output('arraybuffer');
}
