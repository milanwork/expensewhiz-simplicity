
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  customer_id: string | null;
}

interface BusinessProfile {
  id: string;
  business_name: string | null;
  abn_acn: string | null;
  client_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [abnAcn, setAbnAcn] = useState("");
  const [clientId, setClientId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("VIC");
  const [country, setCountry] = useState("Australia");
  const [postcode, setPostcode] = useState("");
  const [sameAsBusiness, setSameAsBusiness] = useState(true);
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("VIC");
  const [billingCountry, setBillingCountry] = useState("Australia");
  const [billingPostcode, setBillingPostcode] = useState("");

  useEffect(() => {
    getProfiles();
  }, []);

  async function getProfiles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user");

      // Get personal profile
      let { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      
      // Get business profile
      let { data: businessData, error: businessError } = await supabase
        .from("business_profiles")
        .select(`*`)
        .eq("user_id", user.id)
        .single();

      if (!businessError) {
        setBusinessProfile(businessData);
        setBusinessName(businessData.business_name || "");
        setAbnAcn(businessData.abn_acn || "");
        setClientId(businessData.client_id || "");
        setAddressLine1(businessData.address_line1 || "");
        setAddressLine2(businessData.address_line2 || "");
        setCity(businessData.city || "");
        setState(businessData.state || "VIC");
        setCountry(businessData.country || "Australia");
        setPostcode(businessData.postcode || "");
      }
      
      setProfile(profileData);
      setFirstName(profileData.first_name || "");
      setLastName(profileData.last_name || "");
    } catch (error) {
      toast({
        title: "Error fetching profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateProfiles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user");

      // Update personal profile
      const profileUpdates = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      };

      let { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileUpdates);

      if (profileError) throw profileError;

      // Check if business profile exists
      const { data: existingProfile } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const businessUpdates = {
        id: existingProfile?.id, // Include the existing ID if it exists
        user_id: user.id,
        business_name: businessName,
        abn_acn: abnAcn,
        client_id: clientId,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city: city,
        state: state,
        country: country,
        postcode: postcode,
        updated_at: new Date().toISOString(),
      };

      let { error: businessError } = await supabase
        .from("business_profiles")
        .upsert(businessUpdates, {
          onConflict: 'user_id' // Specify the column to check for conflicts
        });

      if (businessError) throw businessError;
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error updating profiles:", error);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Account details
          </h1>

          <div className="space-y-8">
            {/* Business Details Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Business details
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="abnAcn">Your business ABN or ACN</Label>
                  <Input
                    id="abnAcn"
                    value={abnAcn}
                    onChange={(e) => setAbnAcn(e.target.value)}
                    placeholder="Enter ABN or ACN"
                  />
                </div>
                <div>
                  <Label htmlFor="clientId">Your client ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter client ID"
                  />
                </div>
              </div>
            </div>

            {/* Address Details Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Address details
              </h2>
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">Business address</h3>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australia">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="addressLine1">Business address</Label>
                  <Input
                    id="addressLine1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Enter address line 1"
                  />
                </div>

                <div>
                  <Label htmlFor="addressLine2">Business address line 2</Label>
                  <Input
                    id="addressLine2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Enter address line 2"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City / Suburb</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city or suburb"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="Enter postcode"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="sameAddress"
                    checked={sameAsBusiness}
                    onCheckedChange={(checked) => {
                      setSameAsBusiness(checked as boolean);
                      if (checked) {
                        setBillingAddressLine1(addressLine1);
                        setBillingAddressLine2(addressLine2);
                        setBillingCity(city);
                        setBillingState(state);
                        setBillingCountry(country);
                        setBillingPostcode(postcode);
                      }
                    }}
                  />
                  <Label htmlFor="sameAddress" className="text-sm">
                    My billing address is the same as my business address
                  </Label>
                </div>

                {!sameAsBusiness && (
                  <div className="space-y-4 mt-4">
                    <h3 className="text-base font-medium">Billing address</h3>
                    
                    {/* Billing address fields */}
                    <div>
                      <Label htmlFor="billingCountry">Country</Label>
                      <Select value={billingCountry} onValueChange={setBillingCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="billingAddressLine1">Billing address</Label>
                      <Input
                        id="billingAddressLine1"
                        value={billingAddressLine1}
                        onChange={(e) => setBillingAddressLine1(e.target.value)}
                        placeholder="Enter billing address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingAddressLine2">Billing address line 2</Label>
                      <Input
                        id="billingAddressLine2"
                        value={billingAddressLine2}
                        onChange={(e) => setBillingAddressLine2(e.target.value)}
                        placeholder="Enter billing address line 2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingCity">City / Suburb</Label>
                      <Input
                        id="billingCity"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        placeholder="Enter city or suburb"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingState">State</Label>
                        <Select value={billingState} onValueChange={setBillingState}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIC">VIC</SelectItem>
                            <SelectItem value="NSW">NSW</SelectItem>
                            <SelectItem value="QLD">QLD</SelectItem>
                            <SelectItem value="WA">WA</SelectItem>
                            <SelectItem value="SA">SA</SelectItem>
                            <SelectItem value="TAS">TAS</SelectItem>
                            <SelectItem value="ACT">ACT</SelectItem>
                            <SelectItem value="NT">NT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="billingPostcode">Postcode</Label>
                        <Input
                          id="billingPostcode"
                          value={billingPostcode}
                          onChange={(e) => setBillingPostcode(e.target.value)}
                          placeholder="Enter postcode"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={updateProfiles}
              disabled={loading}
            >
              {loading ? "Loading..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
