
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
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
    is_inactive: false
  });

  useEffect(() => {
    if (id) {
      fetchContact();
    }
  }, [id]);

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
      if (id) {
        // Update existing contact
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Contact updated successfully" });
      } else {
        // Create new contact
        const { error } = await supabase
          .from('customers')
          .insert([formData]);
        
        if (error) throw error;
        toast({ title: "Success", description: "Contact created successfully" });
      }
      
      navigate("/dashboard/contacts");
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save contact",
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.billing_email || ''}
            onChange={(e) => handleChange('billing_email', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={formData.billing_phone || ''}
            onChange={(e) => handleChange('billing_phone', e.target.value)}
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
          <Label>Suburb</Label>
          <Input
            value={formData.billing_suburb || ''}
            onChange={(e) => handleChange('billing_suburb', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>State</Label>
          <Input
            value={formData.billing_state || ''}
            onChange={(e) => handleChange('billing_state', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Postcode</Label>
          <Input
            value={formData.billing_postcode || ''}
            onChange={(e) => handleChange('billing_postcode', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            value={formData.billing_country || ''}
            onChange={(e) => handleChange('billing_country', e.target.value)}
          />
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
