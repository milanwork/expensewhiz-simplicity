import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Plus, Filter, ArrowLeft, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CustomerFormData {
  first_name: string | null;
  surname: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  shipping_address: string | null;
  city: string | null;
  zip_code: string | null;
  country: string | null;
  company_name: string | null;
  eu_vat_number: string | null;
  notes: string | null;
  opt_in_for_marketing: boolean;
}

const initialFormData: CustomerFormData = {
  first_name: null,
  surname: null,
  billing_email: null,
  billing_phone: null,
  shipping_address: null,
  city: null,
  zip_code: null,
  country: null,
  company_name: null,
  eu_vat_number: null,
  notes: null,
  opt_in_for_marketing: false,
};

interface Customer extends CustomerFormData {
  id: string;
  created_at: string;
}

const CRM = () => {
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchBusinessId();
  }, []);

  const fetchBusinessId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setBusinessId(data.id);
        fetchCustomers(data.id);
      }
    }
  };

  const fetchCustomers = async (bid?: string) => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", bid || businessId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching customers",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCustomers(data || []);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = async (customer: Customer) => {
    setFormData(customer);
    setEditingCustomerId(customer.id);
    setIsAddingCustomer(true);
  };

  const handleSubmit = async () => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Business profile not found",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("customers")
      .upsert({
        ...formData,
        business_id: businessId,
        id: editingCustomerId,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: editingCustomerId ? "Customer updated successfully" : "Customer added successfully",
    });
    
    fetchCustomers();
    setIsAddingCustomer(false);
    setFormData(initialFormData);
    setEditingCustomerId(null);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.billing_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.billing_phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mainContent = isAddingCustomer ? (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => {
            setIsAddingCustomer(false);
            setEditingCustomerId(null);
            setFormData(initialFormData);
          }}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">
          {editingCustomerId ? 'Edit Customer' : 'Add New Customer'}
        </h1>
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            type="text"
            id="firstName"
            name="first_name"
            value={formData.first_name || ""}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="surname">Surname</Label>
          <Input
            type="text"
            id="surname"
            name="surname"
            value={formData.surname || ""}
            onChange={(e) => handleInputChange('surname', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="billingEmail">Billing Email</Label>
          <Input
            type="email"
            id="billingEmail"
            name="billing_email"
            value={formData.billing_email || ""}
            onChange={(e) => handleInputChange('billing_email', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="billingPhone">Billing Phone</Label>
          <Input
            type="tel"
            id="billingPhone"
            name="billing_phone"
            value={formData.billing_phone || ""}
            onChange={(e) => handleInputChange('billing_phone', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="shippingAddress">Shipping Address</Label>
          <Input
            type="text"
            id="shippingAddress"
            name="shipping_address"
            value={formData.shipping_address || ""}
            onChange={(e) => handleInputChange('shipping_address', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            type="text"
            id="city"
            name="city"
            value={formData.city || ""}
            onChange={(e) => handleInputChange('city', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            type="text"
            id="zipCode"
            name="zip_code"
            value={formData.zip_code || ""}
            onChange={(e) => handleInputChange('zip_code', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            type="text"
            id="country"
            name="country"
            value={formData.country || ""}
            onChange={(e) => handleInputChange('country', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            type="text"
            id="companyName"
            name="company_name"
            value={formData.company_name || ""}
            onChange={(e) => handleInputChange('company_name', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="euVatNumber">EU VAT Number</Label>
          <Input
            type="text"
            id="euVatNumber"
            name="eu_vat_number"
            value={formData.eu_vat_number || ""}
            onChange={(e) => handleInputChange('eu_vat_number', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input
            type="textarea"
            id="notes"
            name="notes"
            value={formData.notes || ""}
            onChange={(e) => handleInputChange('notes', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="optIn">
            <Checkbox
              id="optIn"
              name="opt_in_for_marketing"
              checked={!!formData.opt_in_for_marketing}
              onCheckedChange={(checked) => handleInputChange('opt_in_for_marketing', !!checked)}
            />
            Opt-in for Marketing
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={() => {
          setIsAddingCustomer(false);
          setEditingCustomerId(null);
          setFormData(initialFormData);
        }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {editingCustomerId ? 'Update Customer' : 'Save Customer'}
        </Button>
      </div>
    </div>
  ) : (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Customer Relationship Management</h1>
        </div>
        <Button onClick={() => setIsAddingCustomer(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        <div className="p-6">
          {customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No customers yet</h3>
              <p className="text-sm text-gray-400 mb-4">
                Start adding customers to manage your relationships
              </p>
              <Button onClick={() => setIsAddingCustomer(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Customer
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">
                      {customer.first_name} {customer.surname}
                    </h3>
                    <div className="text-sm text-gray-500">
                      {customer.billing_email && (
                        <p>{customer.billing_email}</p>
                      )}
                      {customer.billing_phone && (
                        <p>{customer.billing_phone}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1">
      {mainContent}
    </div>
  );
};

export default CRM;
