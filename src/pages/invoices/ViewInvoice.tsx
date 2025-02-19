
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
import { ArrowLeft, Share2, Save, MoreHorizontal, ChevronRight, ChevronDown } from "lucide-react";
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
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice();
      fetchActivities();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, company_name, first_name, surname, billing_email),
          items:invoice_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!invoiceData) throw new Error('Invoice not found');

      setInvoice(invoiceData);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice",
        variant: "destructive",
      });
      navigate('/dashboard/invoices');
    } finally {
      setIsLoading(false);
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

  const handleSave = async () => {
    if (!invoice || !id) return;

    try {
      setIsLoading(true);
      
      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          customer_po_number: invoice.customer_po_number,
          notes: invoice.notes,
          is_tax_inclusive: invoice.is_tax_inclusive,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total
        })
        .eq('id', id);

      if (invoiceError) throw invoiceError;

      // Update items
      if (invoice.items && invoice.items.length > 0) {
        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);

        // Insert updated items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoice.items.map(item => ({
            invoice_id: id,
            description: item.description,
            category: item.category,
            amount: item.amount,
            job: item.job,
            tax_code: item.tax_code
          })));

        if (itemsError) throw itemsError;
      }

      // Log activity
      await supabase.from('invoice_activities').insert([{
        invoice_id: id,
        activity_type: 'update',
        description: 'Invoice updated'
      }]);

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      
      setIsEditMode(false);
      fetchInvoice();
      fetchActivities();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvoiceField = (field: keyof Invoice, value: any) => {
    if (!invoice) return;
    setInvoice({ ...invoice, [field]: value });
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!invoice) return;
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoice({ ...invoice, items: newItems });
  };

  const addInvoiceItem = () => {
    if (!invoice) return;
    const newItem: InvoiceItem = {
      description: "",
      category: "",
      amount: 0,
      job: "",
      tax_code: ""
    };
    setInvoice({
      ...invoice,
      items: [...invoice.items, newItem]
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center">Invoice not found</div>
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
            Invoice #{invoice.invoice_number}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditMode ? (
            <Button onClick={() => setIsEditMode(true)}>
              Edit Invoice
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}
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
                <Label>Customer</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  {invoice.customer.company_name || 
                   `${invoice.customer.first_name} ${invoice.customer.surname}`}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice number</Label>
                  <div className="p-2 border rounded-md bg-gray-50">
                    {invoice.invoice_number}
                  </div>
                </div>
                <div>
                  <Label>Customer PO number</Label>
                  {isEditMode ? (
                    <Input
                      value={invoice.customer_po_number || ''}
                      onChange={(e) => updateInvoiceField('customer_po_number', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 border rounded-md bg-gray-50">
                      {invoice.customer_po_number || '-'}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue date</Label>
                  <div className="p-2 border rounded-md bg-gray-50">
                    {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <Label>Due date</Label>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={invoice.due_date}
                      onChange={(e) => updateInvoiceField('due_date', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 border rounded-md bg-gray-50">
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Amount ($)</th>
                  <th className="pb-2">Job</th>
                  <th className="pb-2">Tax code</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-2">
                      {isEditMode ? (
                        <Input
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                        />
                      ) : (
                        <div className="p-2">{item.description}</div>
                      )}
                    </td>
                    <td className="py-2">
                      {isEditMode ? (
                        <Select
                          value={item.category}
                          onValueChange={(value) => updateInvoiceItem(index, "category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-2">{item.category}</div>
                      )}
                    </td>
                    <td className="py-2">
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateInvoiceItem(index, "amount", parseFloat(e.target.value))}
                        />
                      ) : (
                        <div className="p-2">{item.amount}</div>
                      )}
                    </td>
                    <td className="py-2">
                      {isEditMode ? (
                        <Input
                          value={item.job}
                          onChange={(e) => updateInvoiceItem(index, "job", e.target.value)}
                        />
                      ) : (
                        <div className="p-2">{item.job}</div>
                      )}
                    </td>
                    <td className="py-2">
                      {isEditMode ? (
                        <Select
                          value={item.tax_code}
                          onValueChange={(value) => updateInvoiceItem(index, "tax_code", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GST">GST</SelectItem>
                            <SelectItem value="NO_GST">No GST</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-2">{item.tax_code}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditMode && (
              <Button variant="outline" onClick={addInvoiceItem}>
                Add line item
              </Button>
            )}
          </div>

          <div>
            <Label>Notes to customer</Label>
            {isEditMode ? (
              <Input
                value={invoice.notes || ''}
                onChange={(e) => updateInvoiceField('notes', e.target.value)}
                className="h-24"
              />
            ) : (
              <div className="p-2 border rounded-md bg-gray-50 min-h-[6rem]">
                {invoice.notes || '-'}
              </div>
            )}
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
                <ScrollArea className="h-[600px]">
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
      </div>
    </div>
  );
}
