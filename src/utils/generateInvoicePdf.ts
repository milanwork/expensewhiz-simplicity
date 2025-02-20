
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface InvoicePdfData {
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    abn: string;
  };
  invoice: {
    number: string;
    poNumber: string;
    issueDate: string;
    dueDate: string;
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string;
  };
  customer: {
    billingDetails: {
      name: string;
      address: string;
      suburb: string;
      state: string;
      postcode: string;
      country: string;
    };
    shippingDetails?: {
      name: string;
      address: string;
      suburb: string;
      state: string;
      postcode: string;
      country: string;
    };
  };
  items: Array<{
    description: string;
    taxCode: string;
    amount: number;
  }>;
}

export const generateInvoicePdf = async (data: InvoicePdfData): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.text(data.business.name, 20, 20);
  doc.setFontSize(10);
  doc.text(data.business.address, 20, 30);
  doc.text(`Phone: ${data.business.phone}`, 20, 35);
  doc.text(`Email: ${data.business.email}`, 20, 40);
  doc.text(`ABN: ${data.business.abn}`, 20, 45);

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
  
  doc.text(data.invoice.poNumber, 20, invoiceDetailsY + 5);
  doc.text(data.invoice.number, 80, invoiceDetailsY + 5);
  doc.text(data.invoice.issueDate, 140, invoiceDetailsY + 5);
  doc.text(data.invoice.dueDate, 180, invoiceDetailsY + 5);

  // Billing and Shipping Info
  const addressY = 90;
  doc.text("Bill to", 20, addressY);
  doc.text(data.customer.billingDetails.name, 20, addressY + 5);
  doc.text(data.customer.billingDetails.address, 20, addressY + 10);
  doc.text(`${data.customer.billingDetails.suburb} ${data.customer.billingDetails.state} ${data.customer.billingDetails.postcode}`, 20, addressY + 15);
  doc.text(data.customer.billingDetails.country, 20, addressY + 20);

  if (data.customer.shippingDetails) {
    doc.text("Ship to", 120, addressY);
    doc.text(data.customer.shippingDetails.name, 120, addressY + 5);
    doc.text(data.customer.shippingDetails.address, 120, addressY + 10);
    doc.text(`${data.customer.shippingDetails.suburb} ${data.customer.shippingDetails.state} ${data.customer.shippingDetails.postcode}`, 120, addressY + 15);
    doc.text(data.customer.shippingDetails.country, 120, addressY + 20);
  }

  // Items Table
  const itemsStartY = 130;
  doc.text("Description", 20, itemsStartY);
  doc.text("Tax", 140, itemsStartY);
  doc.text("Amount ($)", 170, itemsStartY);

  let currentY = itemsStartY + 10;
  data.items.forEach((item) => {
    doc.text(item.description, 20, currentY);
    doc.text(item.taxCode, 140, currentY);
    doc.text(item.amount.toFixed(2), 170, currentY);
    currentY += 7;
  });

  // Totals
  const totalsY = currentY + 10;
  doc.text("Subtotal", 140, totalsY);
  doc.text(data.invoice.subtotal.toFixed(2), 170, totalsY);
  
  doc.text("Tax", 140, totalsY + 7);
  doc.text(data.invoice.tax.toFixed(2), 170, totalsY + 7);
  
  doc.text("Total Amount", 140, totalsY + 14);
  doc.text(data.invoice.total.toFixed(2), 170, totalsY + 14);
  
  doc.text("Amount Paid", 140, totalsY + 21);
  doc.text(data.invoice.amountPaid.toFixed(2), 170, totalsY + 21);
  
  doc.setFont("helvetica", "bold");
  doc.text("Balance Due", 140, totalsY + 28);
  doc.text(data.invoice.balanceDue.toFixed(2), 170, totalsY + 28);
  doc.setFont("helvetica", "normal");

  // Notes
  if (data.invoice.notes) {
    doc.text("Notes:", 20, totalsY + 40);
    doc.text(data.invoice.notes, 20, totalsY + 47);
  }

  // Payment Methods
  const paymentY = totalsY + 70;
  doc.text("How to pay", 20, paymentY);
  
  // Generate QR Code
  const qrCodeUrl = await QRCode.toDataURL(`https://example.com/invoices/${data.invoice.number}`);
  doc.addImage(qrCodeUrl, 'PNG', 20, paymentY + 10, 30, 30);
  
  // Bank Details
  doc.text("Bank deposit", 70, paymentY);
  doc.text("Bank: ANZ BANK", 70, paymentY + 10);
  doc.text(`Name: ${data.business.name}`, 70, paymentY + 15);
  doc.text("BSB: 013017", 70, paymentY + 20);
  doc.text("ACC: 123456789", 70, paymentY + 25);
  doc.text(`Ref: ${data.invoice.number}`, 70, paymentY + 30);

  // Footer
  const footerY = doc.internal.pageSize.height - 10;
  doc.text(`Page 1 of 1`, 20, footerY);
  doc.text(`Invoice no: ${data.invoice.number}`, pageWidth/2 - 20, footerY);
  doc.text(`Due date: ${data.invoice.dueDate}`, pageWidth - 60, footerY);

  return doc.output('blob');
};
