
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
import { Users, Search, Plus, Filter, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CustomerFormData {
  contact_type: string;
  organization_type: string;
  first_name: string;
  surname: string;
  abn: string;
  billing_country: string;
  billing_address: string;
  billing_suburb: string;
  billing_state: string;
  billing_postcode: string;
  billing_contact_person: string;
  billing_email: string;
  billing_phone: string;
  billing_fax: string;
  billing_website: string;
  has_different_shipping: boolean;
  shipping_country: string;
  shipping_address: string;
  shipping_suburb: string;
  shipping_state: string;
  shipping_postcode: string;
  shipping_contact_person: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_fax: string;
  shipping_website: string;
  notes: string;
}

const initialFormData: CustomerFormData = {
  contact_type: "customer",
  organization_type: "company",
  first_name: "",
  surname: "",
  abn: "",
  billing_country: "Australia",
  billing_address: "",
  billing_suburb: "",
  billing_state: "",
  billing_postcode: "",
  billing_contact_person: "",
  billing_email: "",
  billing_phone: "",
  billing_fax: "",
  billing_website: "",
  has_different_shipping: false,
  shipping_country: "Australia",
  shipping_address: "",
  shipping_suburb: "",
  shipping_state: "",
  shipping_postcode: "",
  shipping_contact_person: "",
  shipping_email: "",
  shipping_phone: "",
  shipping_fax: "",
  shipping_website: "",
  notes: "",
};

const CRM = () => {
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [businessId, setBusinessId] = useState<string | null>(null);
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
      }
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
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
        .insert({
          ...formData,
          business_id: businessId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer added successfully",
      });
      
      setIsAddingCustomer(false);
      setFormData(initialFormData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isAddingCustomer) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => setIsAddingCustomer(false)}
            className="w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Add New Customer</h1>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_type">Contact Type</Label>
              <Select
                value={formData.contact_type}
                onValueChange={(value) => handleInputChange("contact_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organization_type">Organization Type</Label>
              <Select
                value={formData.organization_type}
                onValueChange={(value) => handleInputChange("organization_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="surname">Surname</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => handleInputChange("surname", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="abn">ABN</Label>
            <Input
              id="abn"
              value={formData.abn}
              onChange={(e) => handleInputChange("abn", e.target.value)}
            />
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Billing Address</h2>
            <div className="space-y-4">
              <Input
                placeholder="Address"
                value={formData.billing_address}
                onChange={(e) => handleInputChange("billing_address", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Suburb"
                  value={formData.billing_suburb}
                  onChange={(e) => handleInputChange("billing_suburb", e.target.value)}
                />
                <Input
                  placeholder="State"
                  value={formData.billing_state}
                  onChange={(e) => handleInputChange("billing_state", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Postcode"
                  value={formData.billing_postcode}
                  onChange={(e) => handleInputChange("billing_postcode", e.target.value)}
                />
                <Input
                  placeholder="Country"
                  value={formData.billing_country}
                  onChange={(e) => handleInputChange("billing_country", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Contact Person"
                  value={formData.billing_contact_person}
                  onChange={(e) => handleInputChange("billing_contact_person", e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => handleInputChange("billing_email", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Phone"
                  value={formData.billing_phone}
                  onChange={(e) => handleInputChange("billing_phone", e.target.value)}
                />
                <Input
                  placeholder="Fax"
                  value={formData.billing_fax}
                  onChange={(e) => handleInputChange("billing_fax", e.target.value)}
                />
              </div>
              <Input
                placeholder="Website"
                value={formData.billing_website}
                onChange={(e) => handleInputChange("billing_website", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="different_shipping"
              checked={formData.has_different_shipping}
              onCheckedChange={(checked) => handleInputChange("has_different_shipping", checked === true)}
            />
            <Label htmlFor="different_shipping">Different shipping address</Label>
          </div>

          {formData.has_different_shipping && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Address"
                  value={formData.shipping_address}
                  onChange={(e) => handleInputChange("shipping_address", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Suburb"
                    value={formData.shipping_suburb}
                    onChange={(e) => handleInputChange("shipping_suburb", e.target.value)}
                  />
                  <Input
                    placeholder="State"
                    value={formData.shipping_state}
                    onChange={(e) => handleInputChange("shipping_state", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Postcode"
                    value={formData.shipping_postcode}
                    onChange={(e) => handleInputChange("shipping_postcode", e.target.value)}
                  />
                  <Input
                    placeholder="Country"
                    value={formData.shipping_country}
                    onChange={(e) => handleInputChange("shipping_country", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Contact Person"
                    value={formData.shipping_contact_person}
                    onChange={(e) => handleInputChange("shipping_contact_person", e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={formData.shipping_email}
                    onChange={(e) => handleInputChange("shipping_email", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Phone"
                    value={formData.shipping_phone}
                    onChange={(e) => handleInputChange("shipping_phone", e.target.value)}
                  />
                  <Input
                    placeholder="Fax"
                    value={formData.shipping_fax}
                    onChange={(e) => handleInputChange("shipping_fax", e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Website"
                  value={formData.shipping_website}
                  onChange={(e) => handleInputChange("shipping_website", e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsAddingCustomer(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save Customer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        <div className="p-6">
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
        </div>
      </div>
    </div>
  );
};

export default CRM;
