
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CreditCard, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  total: number;
  balance_due: number;
  po_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  customer: {
    company_name: string;
    first_name: string;
    surname: string;
  };
  activity?: 'Viewed' | 'Emailed';
}

interface FilterState {
  status: string;
  customer: string;
  period: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    customer: 'all',
    period: 'custom',
    dateFrom: new Date(new Date().setDate(1)).toISOString().split('T')[0],   // new Date().toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    search: '',
  });

  const [totals, setTotals] = useState({
    totalAmount: 0,
    balanceDue: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, [filters]);

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

  const fetchInvoices = async () => {
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

      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(company_name, first_name, surname)
        `)
        .eq('business_id', businessProfile.id);

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.customer !== 'all') {
        query = query.eq('customer_id', filters.customer);
      }
      if (filters.dateFrom) {
        query = query.gte('issue_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('issue_date', filters.dateTo);
      }

      const { data, error } = await query.order('issue_date', { ascending: false });

      if (error) throw error;

      // Calculate totals
      const calculatedTotals = (data || []).reduce((acc, invoice) => ({
        totalAmount: acc.totalAmount + invoice.total,
        balanceDue: acc.balanceDue + invoice.balance_due,
        overdue: acc.overdue + (invoice.status === 'overdue' ? invoice.balance_due : 0)
      }), { totalAmount: 0, balanceDue: 0, overdue: 0 });

      setTotals(calculatedTotals);
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status: Invoice['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      credit: 'bg-cyan-100 text-cyan-800'
    };
    return styles[status];
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      customer: 'all',
      period: 'custom',
      dateFrom: new Date(new Date().setDate(1)).toISOString().split('T')[0], //new Date().toISOString().split('T')[0],
      dateTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      search: '',
    });
  };

  const handleInvoiceClick = async (invoice: Invoice) => {
    try {
      // First fetch the invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_id,
          customer_po_number,
          issue_date,
          due_date,
          is_tax_inclusive,
          notes,
          subtotal,
          tax,
          total,
          balance_due,
          amount_paid,
          status
        `)
        .eq('id', invoice.id)
        .single();

      if (invoiceError) throw invoiceError;

      // Then fetch the invoice items separately
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      // Combine the data
      const fullInvoiceData = {
        ...invoiceData,
        items: itemsData
      };

      // Store the complete data in localStorage
      localStorage.setItem('editInvoiceData', JSON.stringify(fullInvoiceData));
      
      // Navigate to the new invoice page
      navigate('/dashboard/invoices/new');
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard/invoice-payment")}>
            <CreditCard className="mr-2 h-4 w-4" />
            Record invoice payment
          </Button>
          <Button onClick={() => navigate("/dashboard/invoices/new")}>
            Create invoice
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className={`px-4 py-2 rounded-full cursor-pointer transition-colors
          ${filters.status === 'all' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setFilters(f => ({ ...f, status: 'all' }))}>
          All invoices
        </div>
        <div className={`px-4 py-2 rounded-full cursor-pointer transition-colors
          ${filters.status === 'draft' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setFilters(f => ({ ...f, status: 'draft' }))}>
          In progress <span className="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-sm">5</span>
        </div>
        <div className={`px-4 py-2 rounded-full cursor-pointer transition-colors
          ${filters.status === 'paid' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setFilters(f => ({ ...f, status: 'paid' }))}>
          Completed
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="col-span-4 sm:col-span-1">
              <div className="font-medium mb-2">TOTAL AMOUNT</div>
              <div className="text-2xl">${totals.totalAmount.toFixed(2)}</div>
            </div>
            <div className="col-span-4 sm:col-span-1">
              <div className="font-medium mb-2">BALANCE DUE</div>
              <div className="text-2xl">${totals.balanceDue.toFixed(2)}</div>
            </div>
            <div className="col-span-4 sm:col-span-1">
              <div className="font-medium mb-2 text-red-600">OVERDUE</div>
              <div className="text-2xl text-red-600">${totals.overdue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Customer</label>
            <Select
              value={filters.customer}
              onValueChange={(value) => setFilters(f => ({ ...f, customer: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Date from</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Date to</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Search</label>
            <div className="flex gap-2">
              <Input
                type="search"
                placeholder="Search invoices"
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              />
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm">
                <th className="py-3 px-4 text-left font-medium text-gray-600">Issue date</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Invoice no</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Customer</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">PO number</th>
                <th className="py-3 px-4 text-right font-medium text-gray-600">Amount ($)</th>
                <th className="py-3 px-4 text-right font-medium text-gray-600">Balance due ($)</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Due date</th>
                <th className="py-3 px-4 text-center font-medium text-gray-600">Status</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Activity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-gray-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-gray-500">
                    No invoices found. Create your first invoice!
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleInvoiceClick(invoice)}
                  >
                    <td className="py-3 px-4 text-sm">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-purple-600">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-purple-600">
                      {invoice.customer.company_name || 
                       `${invoice.customer.first_name} ${invoice.customer.surname}`}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {invoice.po_number || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {invoice.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {invoice.balance_due.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${getStatusStyle(invoice.status)}
                        `}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {invoice.activity || 'Viewed'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
