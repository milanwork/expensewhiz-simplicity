
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  total: number;
  status: string;
  customer: {
    company_name: string;
    first_name: string;
    surname: string;
  };
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (businessProfile) {
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
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
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
              <tr className="border-b">
                <th className="py-3 px-4 text-left">Number</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center">
                    No invoices found. Create your first invoice!
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                  >
                    <td className="py-3 px-4">{invoice.invoice_number}</td>
                    <td className="py-3 px-4">
                      {invoice.customer.company_name || 
                       `${invoice.customer.first_name} ${invoice.customer.surname}`}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      ${invoice.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span className={`
                          px-2 py-1 rounded-full text-xs
                          ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'}
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
