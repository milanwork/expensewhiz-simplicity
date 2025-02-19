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
import { ArrowLeft, Share2, Save, Send, MoreHorizontal, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export default function ViewInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
    if (id) {
      fetchInvoiceDetails();
      fetchActivities();
    } else {
      generateInvoiceNumber();
      setIsLoading(false);
    }
  }, [id]);

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
        toast({
          title: "Error",
          description: "Business profile not found",
          variant: "destructive",
        });
        return;
      }

      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessProfile.id);

      if (error) throw error;
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const fetchActivities = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('invoice_activities')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
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

      setSelectedCustomer(invoiceData.customer.id);
      setInvoiceNumber(invoiceData.invoice_number);
      setCustomerPO(invoiceData.customer_po_number || '');
      setIssueDate(invoiceData.issue_date);
      setDueDate(invoiceData.due_date);
      setIsTaxInclusive(invoiceData.is_tax_inclusive);
      setItems(invoiceData.items || []);
      setNotes(invoiceData.notes || '');

      // Fetch share URL if it exists
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

  const logActivity = async (activityType: string, description: string) => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('invoice_activities')
        .insert([{
          invoice_id: id,
          activity_type: activityType,
          description,
          performed_by: user.id
        }]);

      if (error) throw error;
      fetchActivities();
    } catch (error) {
      console.error('Error logging activity:', error);
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

      let savedInvoiceId = id;
      
      if (id) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', id);

        if (invoiceError) throw invoiceError;

        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);

        await logActivity('update', 'Invoice updated');
      } else {
        // Create new invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        if (newInvoice) {
          savedInvoiceId = newInvoice.id;
          await logActivity('create', 'Invoice created');
        }
      }

      // Insert invoice items
      if (savedInvoiceId) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map(item => ({
              invoice_id: savedInvoiceId,
              ...item
            }))
          );

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Success",
        description: "Invoice saved successfully",
      });

      if (!id) {
        navigate(`/dashboard/invoices/${savedInvoiceId}`);
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
        await logActivity('share', 'Invoice shared');
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

  const generateInvoiceNumber = async () => {
    // Simple invoice number generation - you might want to make this more sophisticated
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    setInvoiceNumber(number.toString());
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
          {id && (
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          )}
          <Button onClick={handleSave} disabled={isLoading}>
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

        {id && (
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
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="border-b pb-4">
                          <div className="text-sm font-medium">{activity.activity_type}</div>
                          <div className="text-sm text-gray-600">{activity.description}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <div className="text-sm text-gray-500 text-center">
                          No activities yet
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </div>
  );
}
