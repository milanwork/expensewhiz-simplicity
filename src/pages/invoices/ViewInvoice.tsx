
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Share2, Save, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InvoiceItem {
  id: string;
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
  customer: {
    company_name: string;
    first_name: string;
    surname: string;
    billing_email: string;
  };
  items: InvoiceItem[];
}

export default function ViewInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>("");

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch invoice with customer details and items
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(company_name, first_name, surname, billing_email),
          items:invoice_items(*)
        `)
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) throw new Error('Invoice not found');

      setInvoice(invoiceData as Invoice);

      // Create a shareable URL if it doesn't exist
      const { data: shareData } = await supabase
        .from('shared_links')
        .select('token')
        .eq('invoice_id', id)
        .single();

      if (!shareData?.token) {
        const token = crypto.randomUUID();
        await supabase.from('shared_links').insert([
          { invoice_id: id, token }
        ]);
        setShareUrl(`${window.location.origin}/share/invoice/${token}`);
      } else {
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading invoice details...</div>
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
          <h1 className="text-2xl font-semibold">Invoice #{invoice.invoice_number}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-2">Bill To</h3>
            <div>
              {invoice.customer.company_name || 
               `${invoice.customer.first_name} ${invoice.customer.surname}`}
            </div>
            {invoice.customer.billing_email && (
              <div>{invoice.customer.billing_email}</div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number:</span>
              <span>{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Issue Date:</span>
              <span>{new Date(invoice.issue_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
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
            {invoice.items.map((item) => (
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
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 border-t pt-4">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-gray-600">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
