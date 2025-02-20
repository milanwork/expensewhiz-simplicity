
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, Save } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Customer {
  id: string;
  company_name: string;
  first_name: string;
  surname: string;
}

interface InvoiceItem {
  description: string;
  category: string;
  amount: number;
  job: string;
  tax_code: string;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerPO, setCustomerPO] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", category: "", amount: 0, job: "", tax_code: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchCustomers(),
          generateInvoiceNumber()
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) {
        throw new Error('Business profile not found');
      }

      const { data: customersList, error } = await supabase
        .from('customers')
        .select('id, company_name, first_name, surname')
        .eq('business_id', businessProfile.id);

      if (error) throw error;
      setCustomers(customersList || []);
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
    try {
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      const newInvoiceNumber = `INV-${timestamp}-${randomNum}`;
      setInvoiceNumber(newInvoiceNumber);
    } catch (error) {
      console.error('Error generating invoice number:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice number",
        variant: "destructive",
      });
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
    const tax = isTaxInclusive ? (subtotal / 11) : (subtotal * 0.1);
    const total = isTaxInclusive ? subtotal : (subtotal + tax);
    return { subtotal: Number(subtotal.toFixed(2)), tax: Number(tax.toFixed(2)), total: Number(total.toFixed(2)) };
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

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

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
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
          status: 'draft'
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (invoice) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map(item => ({
              invoice_id: invoice.id,
              ...item
            }))
          );

        if (itemsError) throw itemsError;

        await supabase.from('invoice_activities').insert([{
          invoice_id: invoice.id,
          activity_type: 'create',
          description: 'Invoice created'
        }]);
      }

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      navigate("/dashboard/invoices");
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium">Loading...</div>
          <div className="text-sm text-gray-500">Please wait while we initialize the invoice</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Create invoice</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
              <Input value={invoiceNumber} readOnly className="bg-gray-50" />
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

      <div className="space-y-4">
        <div>
          <Label>Notes to customer</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-24"
          />
        </div>
      </div>

      <div className="flex justify-end space-y-2">
        <div className="w-64">
          {items.length > 0 && (
            <>
              <div className="flex justify-between py-1">
                <span>Subtotal</span>
                <span>${calculateTotals().subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Tax</span>
                <span>${calculateTotals().tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold">
                <span>Total</span>
                <span>${calculateTotals().total.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
