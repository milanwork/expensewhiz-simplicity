
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  customer: {
    company_name: string;
    first_name: string;
    surname: string;
  };
}

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

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

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(company_name, first_name, surname)
        `)
        .eq('business_id', businessProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Button onClick={() => navigate("/dashboard/invoices/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm">
                <th className="py-3 px-4 text-left font-medium text-gray-600">Number</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Customer</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Date</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Due Date</th>
                <th className="py-3 px-4 text-right font-medium text-gray-600">Total</th>
                <th className="py-3 px-4 text-center font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    No invoices found. Create your first invoice!
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                  >
                    <td className="py-3 px-4 text-sm">{invoice.invoice_number}</td>
                    <td className="py-3 px-4 text-sm">
                      {invoice.customer.company_name || 
                       `${invoice.customer.first_name} ${invoice.customer.surname}`}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      ${invoice.total.toFixed(2)}
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
