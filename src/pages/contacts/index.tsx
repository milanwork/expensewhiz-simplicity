
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface Contact {
  id: string;
  first_name: string;
  surname: string;
  company_name: string;
  organization_type: string;
  contact_type: string;
  billing_email: string;
  billing_phone: string;
  is_inactive: boolean;
}

export default function Contacts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(searchTerm) ||
      contact.surname?.toLowerCase().includes(searchTerm) ||
      contact.company_name?.toLowerCase().includes(searchTerm) ||
      contact.billing_email?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => navigate("/dashboard/contacts/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? "No contacts found matching your search." : "No contacts yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Name/Company</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                  >
                    <td className="px-6 py-4">
                      {contact.organization_type === 'company' 
                        ? contact.company_name 
                        : `${contact.first_name} ${contact.surname}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize">{contact.contact_type}</span>
                    </td>
                    <td className="px-6 py-4">{contact.billing_email}</td>
                    <td className="px-6 py-4">{contact.billing_phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.is_inactive 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {contact.is_inactive ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
