
export interface Customer {
  id: string;
  company_name: string;
  first_name: string;
  surname: string;
  billing_email: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  category: string;
  amount: number;
  job: string;
  tax_code: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_po_number: string;
  issue_date: string;
  due_date: string;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  is_tax_inclusive: boolean;
  customer: Customer;
  items: InvoiceItem[];
}

export interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}
