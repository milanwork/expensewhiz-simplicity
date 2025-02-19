import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Share2, Save, Send, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Customer {
  id: string;
  company_name: string;
  first_name: string;
  surname: string;
  billing_email: string;
}

interface InvoiceItem {
  id?: string;
  description: string;
  category: string;
  amount: number;
  job: string;
  tax_code: string;
}

interface Invoice {
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

export default function ViewInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(!id);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerPO, setCustomerPO] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", category: "", amount: 0, job: "", tax_code: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>("");

  useEffect(() => {
    fetchCustomers();
    if (id) {
      fetchInvoiceDetails();
    } else {
      generateInvoiceNumber();
      setIsLoading(false);
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (businessProfile) {
        const { data: customersList, error } = await supabase
          .from('customers')
          .select('id, company_name, first_name, surname, billing_email')
          .eq('business_id', businessProfile.id);

        if (error) throw error;
        setCustomers(customersList || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const generateInvoiceNumber = async () => {
    // Simple invoice number generation - you might want to make this more sophisticated
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    setInvoiceNumber(number.toString());
  };

  const fetchInvoiceDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, company_name, first_name, surname, billing_email),
          items:invoice_items(*)
        `)
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) throw new Error('Invoice not found');

      setInvoice(invoiceData);
      setSelectedCustomer(invoiceData.customer.id);
      setInvoiceNumber(invoiceData.invoice_number);
      setCustomerPO(invoiceData.customer_po_number || '');
      setIssueDate(invoiceData.issue_date);
      setDueDate(invoiceData.due_date);
      setIsTaxInclusive(invoiceData.is_tax_inclusive);
      setItems(invoiceData.items);
      setNotes(invoiceData.notes || '');

      // Handle share URL
      const { data: shareData } = await supabase
        .from('shared_links')
        .select('token')
        .eq('invoice_id', id)
        .single();

      if (shareData?.token) {
        setShareUrl(`${window.location.origin}/share/invoice/${shareData.token}`);
      }
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: "", category: "", amount: 0, job: "", tax_code: "" },
    ]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount.toString()) || 0), 0);
    const tax = subtotal * 0.1; // Assuming 10% tax rate
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleShare = async () => {
    if (!id) return;
    
    try {
      let shareToken = shareUrl;
      
      if (!shareToken) {
        const token = crypto.randomUUID();
        await supabase.from('shared_links').insert([
          { invoice_id: id, token }
        ]);
        shareToken = `${window.location.origin}/share/invoice/${token}`;
        setShareUrl(shareToken);
      }

      await navigator.clipboard.writeText(shareToken);
      toast({
        title: "Success",
        description: "Invoice link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) throw new Error("Business profile not found");

      const { subtotal, tax, total } = calculateTotals();

      const invoiceData = {
        business_id: businessProfile.id,
        customer_id: selectedCustomer,
        invoice_number: invoiceNumber,
        customer_po_number: customerPO,
        issue_date: issueDate,
        due_date: dueDate,
        notes,
        subtotal,
        tax,
        total,
        is_tax_inclusive: isTaxInclusive,
        status: 'draft' as const
      };

      if (id) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', id);

        if (invoiceError) throw invoiceError;

        // Delete existing items and insert new ones
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);
      } else {
        // Create new invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        if (invoice) {
          id = invoice.id;
        }
      }

      // Insert invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          items.map(item => ({
            invoice_id: id,
            ...item
          }))
        );

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Invoice saved successfully",
      });

      if (!id) {
        navigate(`/dashboard/invoices/${id}`);
      } else {
        setIsEditing(false);
        fetchInvoiceDetails();
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">
            {id ? `Invoice #${invoiceNumber}` : 'Create Invoice'}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {id && !isEditing && (
            <>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </>
          )}
          {(isEditing || !id) && (
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isEditing || !id ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <Label>Customer *</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name || `${customer.first_name} ${customer.surname}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice number *</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Customer PO number</Label>
                  <Input value={customerPO} onChange={(e) => setCustomerPO(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue date *</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <Label>Due date *</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Amounts are</Label>
                <RadioGroup
                  value={isTaxInclusive ? "inclusive" : "exclusive"}
                  onValueChange={(value) => setIsTaxInclusive(value === "inclusive")}
                  className="flex items-center space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inclusive" id="inclusive" />
                    <Label htmlFor="inclusive">Tax inclusive</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exclusive" id="exclusive" />
                    <Label htmlFor="exclusive">Tax exclusive</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Category *</th>
                  <th className="pb-2">Amount ($) *</th>
                  <th className="pb-2">Job</th>
                  <th className="pb-2">Tax code *</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateItem(index, "category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(index, "amount", parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        value={item.job}
                        onChange={(e) => updateItem(index, "job", e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <Select
                        value={item.tax_code}
                        onValueChange={(value) => updateItem(index, "tax_code", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax code" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GST">GST</SelectItem>
                          <SelectItem value="NO_GST">No GST</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="outline" onClick={addItem}>Add line item</Button>
          </div>

          <div>
            <Label>Notes to customer</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-24"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2">Bill To</h3>
              <div>
                {invoice?.customer.company_name || 
                 `${invoice?.customer.first_name} ${invoice?.customer.surname}`}
              </div>
              {invoice?.customer.billing_email && (
                <div>{invoice.customer.billing_email}</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Number:</span>
                <span>{invoice?.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Issue Date:</span>
                <span>{new Date(invoice?.issue_date || '').toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span>{new Date(invoice?.due_date || '').toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs
                  ${invoice?.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoice?.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    invoice?.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'}
                `}>
                  {invoice?.status.charAt(0).toUpperCase() + invoice?.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b text-sm">
                <th className="py-3 px-4 text-left font-medium text-gray-600">Description</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Category</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Job</th>
                <th className="py-3 px-4 text-right font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice?.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4">{item.category}</td>
                  <td className="py-3 px-4">{item.job}</td>
                  <td className="py-3 px-4 text-right">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${invoice?.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>${invoice?.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${invoice?.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {invoice?.notes && (
            <div className="mt-8 border-t pt-4">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
