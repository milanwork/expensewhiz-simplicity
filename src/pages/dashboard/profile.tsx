
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user");

      let { data, error } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
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

  async function updateProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user");

      const updates = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("profiles")
        .upsert(updates);

      if (error) throw error;
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
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
            Profile Settings
          </h1>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={updateProfile}
              disabled={loading}
            >
              {loading ? "Loading..." : "Update Profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
