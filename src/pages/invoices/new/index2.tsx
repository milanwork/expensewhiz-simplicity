import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit_amount: number;
  amount: number;
}

export default function NewInvoice2() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnitAmount, setNewItemUnitAmount] = useState(0);

  useEffect(() => {
    fetchCustomers();
    loadInvoiceData();
  }, []);

  // Add effect to update balance due whenever relevant values change
  useEffect(() => {
    const totals = calculateTotals();
    setBalanceDue(totals.balanceDue);
  }, [items, amountPaid, isTaxInclusive]);

  const loadInvoiceData = () => {
    const storedData = localStorage.getItem('editInvoiceData');
    if (storedData) {
      const invoiceData = JSON.parse(storedData);
      setInvoiceNumber(invoiceData.invoice_number || '');
      setCustomerPoNumber(invoiceData.customer_po_number || '');
      setCustomerId(invoiceData.customer_id || '');
      setIssueDate(invoiceData.issue_date || new Date().toISOString().split('T')[0]);
      setDueDate(invoiceData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setIsTaxInclusive(invoiceData.is_tax_inclusive || false);
      setNotes(invoiceData.notes || '');
      setItems(invoiceData.items || []);
      setAmountPaid(invoiceData.amount_paid || 0);
      localStorage.removeItem('editInvoiceData');
    }
  };

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
        const { data } = await supabase
          .from('customers')
          .select('id, company_name, first_name, surname')
          .eq('business_id', businessProfile.id);

        if (data) {
          setCustomers(data.map(customer => ({
            id: customer.id,
            name: customer.company_name || `${customer.first_name} ${customer.surname}`
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const itemAmount = parseFloat(item.amount.toString()) || 0;
      return sum + itemAmount;
    }, 0);
    
    const tax = isTaxInclusive ? (subtotal / 11) : (subtotal * 0.1);
    const total = isTaxInclusive ? subtotal : (subtotal + tax);
    const newBalanceDue = total - amountPaid;
    
    return { 
      subtotal: Number(subtotal.toFixed(2)), 
      tax: Number(tax.toFixed(2)), 
      total: Number(total.toFixed(2)),
      amountPaid: Number(amountPaid.toFixed(2)),
      balanceDue: Number(newBalanceDue.toFixed(2))
    };
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: uuidv4(),
      name: newItemName,
      quantity: newItemQuantity,
      unit_amount: newItemUnitAmount,
      amount: newItemQuantity * newItemUnitAmount,
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemUnitAmount(0);
    setIsDialogOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate amount when quantity or unit_amount changes
    if (field === 'quantity' || field === 'unit_amount') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
      const unitAmount = field === 'unit_amount' ? parseFloat(value) || 0 : newItems[index].unit_amount;
      newItems[index].amount = quantity * unitAmount;
    }
    
    setItems(newItems);
    // Balance will be automatically updated by the useEffect
  };

  const handleAmountPaidChange = (value: string) => {
    const newAmountPaid = parseFloat(value) || 0;
    setAmountPaid(newAmountPaid);
    // Balance will be automatically updated by the useEffect
  };

  const handleSubmit = async () => {
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

      const totals = calculateTotals();

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            business_id: businessProfile.id,
            invoice_number: invoiceNumber,
            customer_id: customerId,
            customer_po_number: customerPoNumber,
            issue_date: issueDate,
            due_date: dueDate,
            is_tax_inclusive: isTaxInclusive,
            notes: notes,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            balance_due: totals.balanceDue,
            amount_paid: amountPaid,
            status: 'draft'
          }
        ])
        .select()

      if (invoiceError) throw invoiceError;

      if (invoiceData && invoiceData.length > 0) {
        const invoiceId = invoiceData[0].id;

        // Insert invoice items
        const invoiceItemsToInsert = items.map(item => ({
          invoice_id: invoiceId,
          name: item.name,
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          amount: item.amount,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItemsToInsert);

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
        navigate('/dashboard/invoices');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">New Invoice</h1>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              type="text"
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="customerPoNumber">Customer PO Number</Label>
            <Input
              type="text"
              id="customerPoNumber"
              value={customerPoNumber}
              onChange={(e) => setCustomerPoNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select
              value={customerId}
              onValueChange={setCustomerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              type="date"
              id="issueDate"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isTaxInclusive"
              checked={isTaxInclusive}
              onCheckedChange={(checked) => setIsTaxInclusive(!!checked)}
            />
            <Label htmlFor="isTaxInclusive">Tax Inclusive</Label>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Items</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setNewItemName('');
                  setNewItemQuantity(1);
                  setNewItemUnitAmount(0);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input id="name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">
                      Quantity
                    </Label>
                    <Input
                      type="number"
                      id="quantity"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(parseFloat(e.target.value) || 1)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="unit_amount" className="text-right">
                      Unit Amount
                    </Label>
                    <Input
                      type="number"
                      id="unit_amount"
                      value={newItemUnitAmount}
                      onChange={(e) => setNewItemUnitAmount(parseFloat(e.target.value) || 0)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <Button type="submit" onClick={addItem}>
                  Add Item
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Quantity</th>
                  <th className="py-2 text-left">Unit Amount</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        value={item.unit_amount}
                        onChange={(e) => updateItem(index, 'unit_amount', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2">
                      ${item.amount.toFixed(2)}
                    </td>
                    <td className="py-2 text-center">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
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
            <div className="flex justify-between py-1">
              <span>Amount paid</span>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => handleAmountPaidChange(e.target.value)}
                className="w-24 text-right"
              />
            </div>
            <div className="flex justify-between py-1 font-semibold">
              <span>Balance due</span>
              <span>${balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit}>Create Invoice</Button>
    </div>
  );
}
