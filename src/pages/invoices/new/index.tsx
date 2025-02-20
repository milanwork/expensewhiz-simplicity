import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/components/icons";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(3, {
    message: "Invoice number must be at least 3 characters.",
  }),
  issueDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
});

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(3, {
    message: "Description must be at least 3 characters.",
  }),
  quantity: z.coerce.number().min(1, {
    message: "Quantity must be at least 1.",
  }),
  unitPrice: z.coerce.number().min(0, {
    message: "Unit price must be at least 0.",
  }),
});

const customerSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  surname: z.string().min(2, {
    message: "Surname must be at least 2 characters.",
  }),
  company_name: z.string().optional(),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export default function NewInvoice() {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(
    null
  );

  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const customerForm = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: "",
      surname: "",
      email: "",
    },
  });

  const invoiceForm = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = invoiceForm;

  const [lineItems, setLineItems] = useState([
    { id: uuidv4(), description: "", quantity: 1, unitPrice: 0 },
  ]);

  const totals = {
    subtotal: lineItems.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0
    ),
    tax: 0,
    discount: 0,
    total: 0,
  };

  totals.total = totals.subtotal + totals.tax - totals.discount;

  const invoiceNumber = watch("invoiceNumber");

  const addLineItem = () => {
    setLineItems([...lineItems, { id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const deleteLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleOpenShareDialog = () => {
    setIsShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setIsShareDialogOpen(false);
    setShareEmail("");
    setShareMessage("");
  };

  const onSubmit = async (data: z.infer<typeof invoiceFormSchema>) => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            ...data,
            customer_id: selectedCustomer,
            line_items: lineItems,
            total: totals.total,
            user_id: user?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) {
        console.error("Error creating invoice:", invoiceError);
        toast({
          title: "Error",
          description: "Failed to create invoice",
          variant: "destructive",
        });
        return;
      }

      setExistingInvoiceId(invoiceData.id);

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      router.push(`/dashboard/invoices/${invoiceData.id}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const onCustomerSubmit = async (data: z.infer<typeof customerSchema>) => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert([
          {
            ...data,
            user_id: user?.id,
          },
        ])
        .select()
        .single();

      if (customerError) {
        console.error("Error creating customer:", customerError);
        toast({
          title: "Error",
          description: "Failed to create customer",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Customer created successfully",
      });

      customerForm.reset();
      getCustomers();
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    }
  };

  const getCustomers = async () => {
    setIsCustomerLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user?.id);

      if (error) {
        console.error("Error fetching customers:", error);
        toast({
          title: "Error",
          description: "Failed to fetch customers",
          variant: "destructive",
        });
        return;
      }

      setCustomers(data);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setIsCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getCustomers();
    }
  }, [user]);

  const handleShareInvoice = async () => {
    if (!existingInvoiceId) {
      toast({
        title: "Error",
        description: "Please save the invoice first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Find selected customer details
      const selectedCustomerDetails = customers.find(c => c.id === selectedCustomer);
      if (!selectedCustomerDetails) {
        throw new Error('Selected customer not found');
      }

      const customerDisplayName = selectedCustomerDetails.company_name || 
        `${selectedCustomerDetails.first_name} ${selectedCustomerDetails.surname}`.trim();

      console.log('Creating payment link with customer:', customerDisplayName);

      const requestData = {
        invoiceId: existingInvoiceId,
        amount: totals.total,
        customerEmail: shareEmail,
        description: shareMessage || `Payment for invoice ${invoiceNumber}`,
        invoiceNumber: invoiceNumber,
        customerName: customerDisplayName
      };

      // Log the request data for validation
      console.log('Sharing invoice with data:', requestData);

      // Validate all required fields
      if (!requestData.invoiceNumber || !requestData.customerEmail || !requestData.customerName) {
        throw new Error('Missing required fields for payment link creation');
      }

      const response = await supabase.functions.invoke('create-payment-link', {
        body: requestData,
        headers: {
          'Content-Type': 'application/json',
          'x-deno-subhost': 'edge-functions',
          // Add any additional required headers
        }
      });

      if (response.error) {
        console.error('Error response:', response.error);
        throw new Error(response.error.message);
      }

      const { data: paymentData } = response;
      if (!paymentData?.url) {
        throw new Error('No payment URL received');
      }

      console.log('Payment link created:', paymentData.url);

      // Open payment link in new window
      window.open(paymentData.url, '_blank');

      toast({
        title: "Success",
        description: "Payment link created successfully",
      });
      handleCloseShareDialog();
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment link",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Form {...invoiceForm}>
        <form
          onSubmit={invoiceForm.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormLabel>Customer</FormLabel>
            <Select onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {isCustomerLoading ? (
                  <SelectItem value="loading" disabled>
                    <Skeleton className="h-4 w-20" />
                  </SelectItem>
                ) : (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name
                        ? customer.company_name
                        : `${customer.first_name} ${customer.surname}`}
                    </SelectItem>
                  ))
                )}
                <SelectItem value="new">
                  <Badge variant="secondary">
                    New Customer <Icons.add className="ml-2 h-4 w-4" />
                  </Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedCustomer === "new" ? (
            <Card>
              <CardHeader>
                <CardTitle>New Customer</CardTitle>
                <CardDescription>
                  Add a new customer to your list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...customerForm}>
                  <form
                    onSubmit={customerForm.handleSubmit(onCustomerSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={customerForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="surname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surname</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="john.doe@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit">Create Customer</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : null}

          <Table>
            <TableCaption>
              A list of your line items for this invoice.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseInt(e.target.value))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, "unitPrice", parseFloat(e.target.value))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {(item.quantity * item.unitPrice).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete this line item from the invoice.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteLineItem(item.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>
                  <Button onClick={addLineItem}>Add Line Item</Button>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          <div className="grid grid-cols-3 gap-4">
            <div></div>
            <div></div>
            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
                <CardDescription>Invoice totals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Subtotal:</Label>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Tax:</Label>
                    <span>${totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Discount:</Label>
                    <span>${totals.discount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label>Total:</Label>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <FormField
            control={control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes about the invoice"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="submit">Save Invoice</Button>
            {existingInvoiceId ? (
              <Button onClick={handleOpenShareDialog}>Share Invoice</Button>
            ) : null}
          </div>
        </form>
      </Form>

      <Sheet open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Share Invoice</SheetTitle>
            <SheetDescription>
              Enter the email address of the person you want to share this
              invoice with.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" onClick={handleShareInvoice} disabled={isSending}>
              {isSending && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Payment Link
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
