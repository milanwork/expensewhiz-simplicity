import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ContactFormData {
  organization_type: string;
  contact_type: string;
  first_name?: string;
  surname?: string;
  company_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  billing_suburb?: string;
  billing_state?: string;
  billing_postcode?: string;
  billing_country?: string;
  billing_contact_person?: string;
  billing_fax?: string;
  billing_website?: string;
  shipping_address?: string;
  shipping_suburb?: string;
  shipping_state?: string;
  shipping_postcode?: string;
  shipping_country?: string;
  shipping_contact_person?: string;
  shipping_email?: string;
  shipping_fax?: string;
  shipping_phone?: string;
  shipping_website?: string;
  has_different_shipping: boolean;
  is_inactive: boolean;
}

export default function ContactForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    organization_type: 'individual',
    contact_type: 'customer',
    billing_country: 'Australia',
    shipping_country: 'Australia',
    has_different_shipping: false,
    is_inactive: false
  });
  const [showCcEmail, setShowCcEmail] = useState(false);
  const [showAdditionalPhone, setShowAdditionalPhone] = useState(false);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchContact();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage contacts",
        variant: "destructive",
      });
      navigate("/auth");
    }
  };

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast({
        title: "Error",
        description: "Failed to load contact details",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // If shipping is same as billing, copy billing address to shipping
      const dataToSubmit = formData.has_different_shipping
        ? formData
        : {
            ...formData,
            shipping_address: formData.billing_address,
            shipping_suburb: formData.billing_suburb,
            shipping_state: formData.billing_state,
            shipping_postcode: formData.billing_postcode,
            shipping_country: formData.billing_country,
            shipping_contact_person: formData.billing_contact_person,
            shipping_email: formData.billing_email,
            shipping_phone: formData.billing_phone,
            shipping_fax: formData.billing_fax,
            shipping_website: formData.billing_website,
          };

      const finalData = {
        ...dataToSubmit,
        business_id: user.id
      };

      const { error } = await supabase
        .from('customers')
        .insert([finalData]);
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      toast({ title: "Success", description: "Contact created successfully" });
      navigate("/dashboard/contacts");
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {id ? 'Edit Contact' : 'New Contact'}
        </h1>
        <div className="space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/contacts")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Organization Type</Label>
            <Select
              value={formData.organization_type}
              onValueChange={(value) => handleChange('organization_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contact Type</Label>
            <Select
              value={formData.contact_type}
              onValueChange={(value) => handleChange('contact_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.organization_type === 'individual' ? (
            <>
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name || ''}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Surname</Label>
                <Input
                  value={formData.surname || ''}
                  onChange={(e) => handleChange('surname', e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 col-span-2">
              <Label>Company Name</Label>
              <Input
                value={formData.company_name || ''}
                onChange={(e) => handleChange('company_name', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Billing address</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.billing_country}
                onValueChange={(value) => handleChange('billing_country', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Australia">Australia</SelectItem>
                  {/* Add more countries as needed */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contact person</Label>
              <Input
                value={formData.billing_contact_person || ''}
                onChange={(e) => handleChange('billing_contact_person', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.billing_address || ''}
                onChange={(e) => handleChange('billing_address', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Suburb/town/locality</Label>
              <Input
                value={formData.billing_suburb || ''}
                onChange={(e) => handleChange('billing_suburb', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>State/territory</Label>
              <Select
                value={formData.billing_state || ''}
                onValueChange={(value) => handleChange('billing_state', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSW">New South Wales</SelectItem>
                  <SelectItem value="VIC">Victoria</SelectItem>
                  <SelectItem value="QLD">Queensland</SelectItem>
                  <SelectItem value="WA">Western Australia</SelectItem>
                  <SelectItem value="SA">South Australia</SelectItem>
                  <SelectItem value="TAS">Tasmania</SelectItem>
                  <SelectItem value="ACT">Australian Capital Territory</SelectItem>
                  <SelectItem value="NT">Northern Territory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Postcode</Label>
              <Input
                value={formData.billing_postcode || ''}
                onChange={(e) => handleChange('billing_postcode', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.billing_email || ''}
                onChange={(e) => handleChange('billing_email', e.target.value)}
              />
            </div>

            {showCcEmail && (
              <div className="space-y-2">
                <Label>CC Email</Label>
                <Input type="email" />
              </div>
            )}

            {!showCcEmail && (
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-purple-600"
                  onClick={() => setShowCcEmail(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add CC Email
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.billing_phone || ''}
                onChange={(e) => handleChange('billing_phone', e.target.value)}
              />
            </div>

            {showAdditionalPhone && (
              <div className="space-y-2">
                <Label>Additional Phone</Label>
                <Input type="tel" />
              </div>
            )}

            {!showAdditionalPhone && (
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-purple-600"
                  onClick={() => setShowAdditionalPhone(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add another phone number
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Fax</Label>
              <Input
                value={formData.billing_fax || ''}
                onChange={(e) => handleChange('billing_fax', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.billing_website || ''}
                onChange={(e) => handleChange('billing_website', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold">Shipping address</h2>
            <Checkbox
              id="same_as_billing"
              checked={!formData.has_different_shipping}
              onCheckedChange={(checked) => handleChange('has_different_shipping', !checked)}
            />
            <Label htmlFor="same_as_billing">Same as billing address</Label>
          </div>

          {formData.has_different_shipping && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={formData.shipping_country}
                  onValueChange={(value) => handleChange('shipping_country', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Australia">Australia</SelectItem>
                    {/* Add more countries as needed */}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contact person</Label>
                <Input
                  value={formData.shipping_contact_person || ''}
                  onChange={(e) => handleChange('shipping_contact_person', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.shipping_address || ''}
                  onChange={(e) => handleChange('shipping_address', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Suburb/town/locality</Label>
                <Input
                  value={formData.shipping_suburb || ''}
                  onChange={(e) => handleChange('shipping_suburb', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>State/territory</Label>
                <Select
                  value={formData.shipping_state || ''}
                  onValueChange={(value) => handleChange('shipping_state', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSW">New South Wales</SelectItem>
                    <SelectItem value="VIC">Victoria</SelectItem>
                    <SelectItem value="QLD">Queensland</SelectItem>
                    <SelectItem value="WA">Western Australia</SelectItem>
                    <SelectItem value="SA">South Australia</SelectItem>
                    <SelectItem value="TAS">Tasmania</SelectItem>
                    <SelectItem value="ACT">Australian Capital Territory</SelectItem>
                    <SelectItem value="NT">Northern Territory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={formData.shipping_postcode || ''}
                  onChange={(e) => handleChange('shipping_postcode', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.shipping_email || ''}
                  onChange={(e) => handleChange('shipping_email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.shipping_phone || ''}
                  onChange={(e) => handleChange('shipping_phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fax</Label>
                <Input
                  value={formData.shipping_fax || ''}
                  onChange={(e) => handleChange('shipping_fax', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.shipping_website || ''}
                  onChange={(e) => handleChange('shipping_website', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_inactive"
              checked={formData.is_inactive}
              onCheckedChange={(checked) => handleChange('is_inactive', checked)}
            />
            <Label htmlFor="is_inactive">Inactive</Label>
          </div>
        </div>
      </div>
    </form>
  );
}
