import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal, 
  Save, 
  Trash2, 
  Plus, 
  Mail,
  Download,
  Link,
  Printer,
  Share
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

interface Customer {
  id: string;
  company_name: string | null;
  first_name: string | null;
  surname: string | null;
}

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

interface InvoiceData {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  customer_po_number: string | null;
  issue_date: string;
  due_date: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  is_tax_inclusive: boolean;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  category: string;
  amount: number;
  job: string;
  tax_code: string;
}

// Add interfaces for API requests
interface ShareInvoiceRequest {
  invoiceId: string;
  amount: number;
  customerEmail: string;
  description: string;
  invoiceNumber: string;
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
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        const editInvoiceData = localStorage.getItem('editInvoiceData');
        if (editInvoiceData) {
          const invoiceData = JSON.parse(editInvoiceData);
          console.log('Loading existing invoice data:', invoiceData);
          
          setExistingInvoiceId(invoiceData.id);
          setSelectedCustomer(invoiceData.customer_id);
          setInvoiceNumber(invoiceData.invoice_number);
          setCustomerPO(invoiceData.customer_po_number || '');
          setIssueDate(invoiceData.issue_date);
          setDueDate(invoiceData.due_date);
          setIsTaxInclusive(invoiceData.is_tax_inclusive);
          setItems(invoiceData.items || []);
          setNotes(invoiceData.notes || '');
          
          localStorage.removeItem('editInvoiceData');
        } else {
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

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
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
        customer_po_number: customerPO || null,
        issue_date: issueDate,
        due_date: dueDate,
        notes: notes || null,
        subtotal,
        tax,
        total,
        amount_paid: 0,
        balance_due: total,
        is_tax_inclusive: isTaxInclusive, // Fixed the column name here
        status: 'draft' as const
      };

      let invoiceId: string;

      if (existingInvoiceId) {
        // First, update the invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', existingInvoiceId);

        if (updateError) throw updateError;
        invoiceId = existingInvoiceId;

        // Then, delete ALL existing items
        console.log('Deleting existing items for invoice:', invoiceId);
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        if (deleteError) {
          console.error('Error deleting items:', deleteError);
          throw new Error('Failed to delete existing items');
        }
      } else {
        // Create new invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        if (!newInvoice) throw new Error("Failed to create invoice");
        invoiceId = newInvoice.id;
      }

      // Wait a brief moment to ensure deletion is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now insert the current items
      if (items.length > 0) {
        const newItems = items.map(item => ({
          invoice_id: invoiceId,
          description: item.description || '',
          category: item.category || '4-1400 Sales',
          amount: Number(item.amount) || 0,
          job: item.job || '',
          tax_code: item.tax_code || 'GST'
        }));

        console.log('Inserting new items:', newItems);
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(newItems);

        if (itemsError) {
          console.error('Error inserting items:', itemsError);
          throw new Error('Failed to insert invoice items');
        }
      }

      // Add activity log entry
      const { error: activityError } = await supabase
        .from('invoice_activities')
        .insert([{
          invoice_id: invoiceId,
          activity_type: existingInvoiceId ? 'update' : 'create',
          description: existingInvoiceId ? 'Invoice updated' : 'Invoice created',
          performed_by: user.id
        }]);

      if (activityError) throw activityError;

      // Fetch the latest data after all operations are complete
      const { data: refreshedData, error: refreshError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (!refreshError && refreshedData) {
        console.log('Refreshed items:', refreshedData);
        setItems(refreshedData);
      }

      toast({
        title: "Success",
        description: existingInvoiceId ? "Invoice updated successfully" : "Invoice created successfully",
      });

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

  const totals = calculateTotals();

  const handleShareInvoice = async () => {
    if (!existingInvoiceId) {
      toast({
        title: "Error",
        description: "Please save the invoice first",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceNumber) {
      toast({
        title: "Error",
        description: "Invoice number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const requestData: ShareInvoiceRequest = {
        invoiceId: existingInvoiceId,
        amount: totals.total,
        customerEmail: shareEmail,
        description: shareMessage || `Payment for invoice ${invoiceNumber}`,
        invoiceNumber: invoiceNumber,
      };

      // Log the request data for validation
      console.log('Sharing invoice with data:', requestData);

      // Validate required fields before making the request
      if (!requestData.invoiceNumber || !requestData.customerEmail || !requestData.amount) {
        throw new Error('Missing required fields for payment link creation');
      }

      const response = await supabase.functions.invoke('create-payment-link', {
        body: requestData,
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Success",
        description: "Invoice sent successfully",
      });
      setIsShareDialogOpen(false);
    } catch (error: any) {
      console.error('Error sharing invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share invoice",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

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
          {existingInvoiceId && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Share className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link className="mr-2 h-4 w-4" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Record payment functionality will be added soon",
                  });
                }}
              >
                Record Payment
              </Button>
            </>
          )}
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save
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
              <div>
                <Label>Issue Date *</Label>
                <Input 
                  type="date" 
                  value={issueDate} 
                  onChange={(e) => setIssueDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Due Date *</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                />
              </div>
              <div>
                <Label>Customer PO Number</Label>
                <Input 
                  value={customerPO} 
                  onChange={(e) => setCustomerPO(e.target.value)} 
                />
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
                  <th className="pb-2"></th>
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
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add line item
            </Button>
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

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
            <DialogDescription>
              Send this invoice via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Add a message to your invoice"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareInvoice} disabled={isSending}>
              {isSending ? "Sending..." : "Send Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
