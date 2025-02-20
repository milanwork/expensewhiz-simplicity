
import {
  ArrowLeft,
  Download,
  Link,
  Mail,
  Printer,
  Share,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoicePdf } from "@/utils/generateInvoicePdf";

export default function NewInvoice() {
  const navigate = useNavigate();
  const params = useParams();
  const existingInvoiceId = params.id;

  const [customerPoNumber, setCustomerPoNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [notes, setNotes] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    if (existingInvoiceId) {
      fetchInvoiceData(existingInvoiceId);
    } else {
      generateInvoiceNumber();
    }
  }, [existingInvoiceId]);

  const fetchInvoiceData = async (invoiceId: string) => {
    try {
      const { data: invoice, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (error) throw error;

      setCustomerPoNumber(invoice.customer_po_number || "");
      setInvoiceNumber(invoice.invoice_number);
      setIssueDate(invoice.issue_date);
      setDueDate(invoice.due_date);
      setSubtotal(invoice.subtotal);
      setTax(invoice.tax);
      setTotal(invoice.total);
      setAmountPaid(invoice.amount_paid);
      setBalanceDue(invoice.balance_due);
      setNotes(invoice.notes || "");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-invoice-number"
      );

      if (error) {
        throw error;
      }

      setInvoiceNumber(data.invoiceNumber);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveInvoice = async () => {
    try {
      if (existingInvoiceId) {
        // Update existing invoice
        const { data, error } = await supabase
          .from("invoices")
          .update({
            customer_po_number: customerPoNumber,
            invoice_number: invoiceNumber,
            issue_date: issueDate,
            due_date: dueDate,
            subtotal: subtotal,
            tax: tax,
            total: total,
            amount_paid: amountPaid,
            balance_due: balanceDue,
            notes: notes,
          })
          .eq("id", existingInvoiceId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Invoice updated successfully",
        });
      } else {
        // Create new invoice
        const { data, error } = await supabase.from("invoices").insert([
          {
            customer_po_number: customerPoNumber,
            invoice_number: invoiceNumber,
            issue_date: issueDate,
            due_date: dueDate,
            subtotal: subtotal,
            tax: tax,
            total: total,
            amount_paid: amountPaid,
            balance_due: balanceDue,
            notes: notes,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Invoice created successfully",
        });

        navigate(`/invoices/new/${data[0].id}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = async () => {
    try {
      if (!existingInvoiceId) {
        toast({
          title: "Error",
          description: "Please save the invoice first",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-invoice", {
        body: {
          invoiceId: existingInvoiceId,
          recipientEmail: recipientEmail,
          message: emailMessage,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Invoice sent successfully",
      });
      setIsShareDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (!existingInvoiceId) {
      toast({
        title: "Error",
        description: "Please save the invoice first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (*),
          business_profiles (*),
          invoice_items (*)
        `)
        .eq('id', existingInvoiceId)
        .single();

      if (invoiceError || !invoice) throw new Error('Invoice not found');

      // Format data for PDF generation
      const pdfData = {
        business: {
          name: invoice.business_profiles.business_name || '',
          address: invoice.business_profiles.address || '',
          phone: invoice.business_profiles.phone || '',
          email: invoice.business_profiles.email || '',
          abn: invoice.business_profiles.abn || '',
        },
        invoice: {
          number: invoice.invoice_number,
          poNumber: invoice.customer_po_number || '',
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          amountPaid: invoice.amount_paid,
          balanceDue: invoice.balance_due,
          notes: invoice.notes,
        },
        customer: {
          billingDetails: {
            name: invoice.customers.company_name,
            address: invoice.customers.billing_address,
            suburb: invoice.customers.billing_suburb,
            state: invoice.customers.billing_state,
            postcode: invoice.customers.billing_postcode,
            country: invoice.customers.billing_country,
          },
          shippingDetails: invoice.customers.shipping_address ? {
            name: invoice.customers.company_name,
            address: invoice.customers.shipping_address,
            suburb: invoice.customers.shipping_suburb,
            state: invoice.customers.shipping_state,
            postcode: invoice.customers.shipping_postcode,
            country: invoice.customers.shipping_country,
          } : undefined,
        },
        items: invoice.invoice_items.map((item: any) => ({
          description: item.description,
          taxCode: item.tax_code,
          amount: item.amount,
        })),
      };

      // Generate and download PDF
      const pdfBlob = await generateInvoicePdf(pdfData);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Log activity
      await supabase
        .from('invoice_activities')
        .insert([{
          invoice_id: existingInvoiceId,
          activity_type: 'pdf_downloaded',
          description: 'Invoice PDF was downloaded',
        }]);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container relative pb-20">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">New Invoice</h2>
          <p className="text-muted-foreground">
            {existingInvoiceId
              ? "Edit your invoice here."
              : "Create a new invoice here."}
          </p>
        </div>
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
            <DropdownMenuItem onClick={handleDownloadPdf}>
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
      </div>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerPoNumber">Customer PO Number</Label>
          <Input
            type="text"
            id="customerPoNumber"
            value={customerPoNumber}
            onChange={(e) => setCustomerPoNumber(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            type="text"
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            disabled
          />
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
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="subtotal">Subtotal</Label>
          <Input
            type="number"
            id="subtotal"
            value={subtotal}
            onChange={(e) => setSubtotal(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="tax">Tax</Label>
          <Input
            type="number"
            id="tax"
            value={tax}
            onChange={(e) => setTax(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="total">Total</Label>
          <Input
            type="number"
            id="total"
            value={total}
            onChange={(e) => setTotal(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="amountPaid">Amount Paid</Label>
          <Input
            type="number"
            id="amountPaid"
            value={amountPaid}
            onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="balanceDue">Balance Due</Label>
          <Input
            type="number"
            id="balanceDue"
            value={balanceDue}
            onChange={(e) => setBalanceDue(parseFloat(e.target.value))}
          />
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
      <Button className="absolute bottom-4 right-0" onClick={handleSaveInvoice}>
        Save Invoice
      </Button>

      <Sheet open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <SheetContent>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                placeholder="calvin.kline@example.com"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Your message here"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSendInvoice}>Send Invoice</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
