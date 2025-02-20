
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, MoreHorizontal, Save } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface Customer {
  id: string;
  company_name: string | null;
  first_name: string | null;
  surname: string | null;
}

interface InvoiceItem {
  description: string;
  category: string;
  amount: number;
  job: string;
  tax_code: string;
}

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerPO, setCustomerPO] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", category: "4-1400 Sales", amount: 0, job: "", tax_code: "GST" },
  ]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(true);
  const [activities] = useState<Activity[]>([
    {
      id: "1",
      activity_type: "Created",
      description: "Invoice created",
      created_at: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Check if we have invoice data in localStorage
        const editInvoiceData = localStorage.getItem('editInvoiceData');
        if (editInvoiceData) {
          const invoiceData = JSON.parse(editInvoiceData);
          // Populate the form with existing invoice data
          setExistingInvoiceId(invoiceData.id);
          setSelectedCustomer(invoiceData.customer_id);
          setInvoiceNumber(invoiceData.invoice_number);
          setCustomerPO(invoiceData.customer_po_number || '');
          setIssueDate(invoiceData.issue_date);
          setDueDate(invoiceData.due_date);
          setIsTaxInclusive(invoiceData.is_tax_inclusive);
          setItems(invoiceData.items || []);
          setNotes(invoiceData.notes || '');
          
          // Clear the localStorage after using it
          localStorage.removeItem('editInvoiceData');
        } else {
          // If no edit data, generate new invoice number
          await generateInvoiceNumber();
        }

        await fetchCustomers(user.id);
      } catch (error) {
        console.error('Initialization error:', error);
        toast({
          title: "Error",
          description: "Failed to initialize invoice",
          variant: "destructive",
        });
      }
    };

    initialize();
  }, []);

  const fetchCustomers = async (userId: string) => {
    try {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!businessProfile) throw new Error('Business profile not found');

      const { data: customersList, error } = await supabase
        .from('customers')
        .select('id, company_name, first_name, surname')
        .eq('business_id', businessProfile.id);

      if (error) throw error;
      setCustomers(customersList || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  };

  const generateInvoiceNumber = async () => {
    const newInvoiceNumber = `INV${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    setInvoiceNumber(newInvoiceNumber);
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: "", category: "4-1400 Sales", amount: 0, job: "", tax_code: "GST" },
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
    return { 
      subtotal: Number(subtotal.toFixed(2)), 
      tax: Number(tax.toFixed(2)), 
      total: Number(total.toFixed(2)),
      amountPaid: 0,
      balanceDue: Number(total.toFixed(2))
    };
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
        amount_paid: 0,
        balance_due: total,
        is_tax_inclusive: isTaxInclusive,
        status: 'draft'
      };

      let invoiceId;

      if (existingInvoiceId) {
        // Update existing invoice
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', existingInvoiceId)
          .select()
          .single();

        if (updateError) throw updateError;
        invoiceId = existingInvoiceId;

        // Delete existing items first
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', existingInvoiceId);

        if (deleteError) throw deleteError;
      } else {
        // Create new invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = newInvoice.id;
      }

      // Wait for deletion to complete (if updating) before inserting new items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map(item => ({
              id: undefined, // Ensure we don't send an id to avoid conflicts
              invoice_id: invoiceId,
              description: item.description,
              category: item.category,
              amount: item.amount,
              job: item.job,
              tax_code: item.tax_code
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Add activity
      const { error: activityError } = await supabase
        .from('invoice_activities')
        .insert([{
          invoice_id: invoiceId,
          activity_type: existingInvoiceId ? 'update' : 'create',
          description: existingInvoiceId ? 'Invoice updated' : 'Invoice created'
        }]);

      if (activityError) throw activityError;

      toast({
        title: "Success",
        description: existingInvoiceId ? "Invoice updated successfully" : "Invoice created successfully",
      });
      navigate("/dashboard/invoices");
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

  const totals = calculateTotals();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              Invoice {invoiceNumber}
            </h1>
            <div className="text-sm text-muted-foreground">Draft</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSubmit} disabled={isLoading} variant="default">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-8">
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
              <div className="grid gap-4">
                <div>
                  <Label>Due date *</Label>
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Customer PO number</Label>
                  <Input 
                    value={customerPO} 
                    onChange={(e) => setCustomerPO(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 inline-block">Amounts are</Label>
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
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4-1400 Sales">4-1400 Sales</SelectItem>
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
                          <SelectValue />
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
            <div className="flex items-center mt-2">
              <Checkbox id="saveDefault" />
              <Label htmlFor="saveDefault" className="ml-2">Save as default</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-1">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Tax</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Amount paid</span>
                <span>${totals.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold">
                <span>Balance due</span>
                <span>${totals.balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Collapsible
            open={isActivityLogOpen}
            onOpenChange={setIsActivityLogOpen}
            className="bg-white rounded-lg shadow"
          >
            <div className="p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isActivityLogOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-b pb-4">
                        <div className="text-sm font-medium">
                          {activity.activity_type}
                        </div>
                        <div className="text-sm text-gray-600">
                          {activity.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {format(new Date(activity.created_at), 'dd/MM/yyyy h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
