
import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  ShoppingCart,
  Receipt,
  BarChart3,
  Building2,
  ScrollText,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Users,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  badge?: string;
  subItems?: SubMenuItem[];
}

interface SubMenuItem {
  label: string;
  path: string;
  badge?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          navigate("/auth");
          return;
        }

        setUser(user);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);
      } catch (error) {
        console.error('Error checking user:', error);
        navigate("/auth");
      }
    };

    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Contacts", path: "/dashboard/contacts" },
    { 
      icon: CreditCard, 
      label: "Sales & Payment", 
      path: "/dashboard/sales",
      subItems: [
        { label: "Estimates", path: "/dashboard/estimates" },
        { label: "Invoices", path: "/dashboard/invoices" },
      ]
    },
    { icon: ShoppingCart, label: "Purchases", path: "/dashboard/purchases" },
    { icon: Receipt, label: "Receipts", path: "/dashboard/receipts", badge: "NEW" },
    { icon: BarChart3, label: "Report", path: "/dashboard/report" },
    { icon: Building2, label: "Banking", path: "/dashboard/banking" },
  ];

  const bottomMenuItems: MenuItem[] = [
    { icon: UserCog, label: "Manage Account", path: "/dashboard/profile" },
    { icon: HelpCircle, label: "Help and Support", path: "/dashboard/support" },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications", badge: "9+" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <span className="text-xl font-semibold text-gray-600">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.first_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : user?.email}
                </h2>
                <p className="text-xs text-gray-500 truncate">Admin Manager</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="py-4">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500">MAIN</div>
            {menuItems.map((item, index) => (
              <div key={index}>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-sm"
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                  {item.subItems && <span className="ml-auto">▾</span>}
                </Button>
                {item.subItems && (
                  <div className="ml-6 space-y-1">
                    {item.subItems.map((subItem, subIndex) => (
                      <Button
                        key={subIndex}
                        variant="ghost"
                        className="w-full justify-start px-3 py-1.5 text-sm"
                        onClick={() => navigate(subItem.path)}
                      >
                        {subItem.label}
                        {subItem.badge && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                            {subItem.badge}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-8 px-3 mb-2 text-xs font-semibold text-gray-500">
              PREFERENCES
            </div>
            {bottomMenuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start px-3 py-2 text-sm"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                    {item.badge}
                  </span>
                )}
              </Button>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
