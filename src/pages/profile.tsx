
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

interface BusinessProfile {
  id: string;
  business_name: string | null;
  abn_acn: string | null;
  client_id: string;
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
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  
  // Personal Details State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Business Details State
  const [businessName, setBusinessName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [abn, setAbn] = useState("");
  const [gstBranchNumber, setGstBranchNumber] = useState("");
  const [acn, setAcn] = useState("");
  const [clientCode, setClientCode] = useState("");
  
  // Industry Details State
  const [businessIndustry, setBusinessIndustry] = useState("Other Services");
  const [specificIndustry, setSpecificIndustry] = useState("Automotive Body, Paint and Interior Repair");
  
  // Contact Details State
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");

  useEffect(() => {
    getProfiles();
  }, []);

  async function getProfiles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user");

      // Get personal profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setFirstName(profileData.first_name || "");
        setLastName(profileData.last_name || "");
      }
      
      // Get business profile
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select(`*`)
        .eq("user_id", user.id)
        .single();

      if (businessData) {
        setBusinessProfile(businessData);
        setBusinessName(businessData.business_name || "");
        setAbn(businessData.abn_acn || "");
        setClientCode(businessData.client_id || "");
        setAddress(businessData.address_line1 || "");
        setEmail(user.email || "");
      }
    } catch (error: any) {
      toast({
        title: "Error fetching profile",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function updateProfiles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user");

      // Update personal profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update business profile
      const { error: businessError } = await supabase
        .from("business_profiles")
        .update({
          business_name: businessName,
          abn_acn: abn,
          address_line1: address,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (businessError) throw businessError;
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="bg-white rounded-lg shadow">
        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Personal Details</TabsTrigger>
            <TabsTrigger value="business">Business Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="business" className="p-6">
            <div className="space-y-8">
              {/* Business Details Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Business Details</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="myobSerialNumber">MYOB serial number</Label>
                    <Input
                      id="myobSerialNumber"
                      value="614405472911"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessName">Business name*</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tradingName">Trading name</Label>
                    <Input
                      id="tradingName"
                      value={tradingName}
                      onChange={(e) => setTradingName(e.target.value)}
                      placeholder="Enter trading name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      value={abn}
                      onChange={(e) => setAbn(e.target.value)}
                      placeholder="Enter ABN"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstBranchNumber">GST branch number</Label>
                    <Input
                      id="gstBranchNumber"
                      value={gstBranchNumber}
                      onChange={(e) => setGstBranchNumber(e.target.value)}
                      placeholder="Enter GST branch number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="acn">ACN</Label>
                    <Input
                      id="acn"
                      value={acn}
                      onChange={(e) => setAcn(e.target.value)}
                      placeholder="Enter ACN"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientCode">Client code</Label>
                    <Input
                      id="clientCode"
                      value={clientCode}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Industry Details Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Industry Details</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessIndustry">Business industry</Label>
                    <Input
                      id="businessIndustry"
                      value={businessIndustry}
                      onChange={(e) => setBusinessIndustry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specificIndustry">Specific industry code</Label>
                    <Input
                      id="specificIndustry"
                      value={specificIndustry}
                      onChange={(e) => setSpecificIndustry(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Details Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Details</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="Enter website"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      type="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fax">Fax</Label>
                    <Input
                      id="fax"
                      value={fax}
                      onChange={(e) => setFax(e.target.value)}
                      placeholder="Enter fax number"
                    />
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={updateProfiles}
              >
                Save changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
