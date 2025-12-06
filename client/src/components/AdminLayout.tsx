import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  FileText, 
  MessageCircle, 
  Settings, 
  Users, 
  PlusCircle,
  CreditCard,
  Mail,
  Menu,
  X,
  Sun,
  Moon,
  LogOut
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AdminLogin from "@/pages/admin/AdminLogin";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Simple admin authentication state - no API calls
  useEffect(() => {
    const adminAuth = localStorage.getItem('admin_authenticated');
    setIsAdminAuthenticated(adminAuth === 'true');
  }, []);

  // Show admin login if not authenticated
  if (!isAdminAuthenticated) {
    return <AdminLogin onAuthSuccess={() => setIsAdminAuthenticated(true)} />;
  }

  const ADMIN_BASE = "/toolx-adminUser-auth";
  const navigation = [
    { name: "Dashboard", href: `${ADMIN_BASE}`, icon: LayoutDashboard },
    { name: "All Users", href: `${ADMIN_BASE}/users`, icon: Users },
    { name: "User analytics", href: `${ADMIN_BASE}/users/analytics`, icon: Users },
    { name: "Manage Blog", href: `${ADMIN_BASE}/blog`, icon: FileText },
    { name: "Manage Tools", href: `${ADMIN_BASE}/tools`, icon: Settings },
    { name: "Create & Post Blog", href: `${ADMIN_BASE}/blog/create`, icon: PlusCircle },
    { name: "Subscription Pricing", href: `${ADMIN_BASE}/pricing`, icon: CreditCard },
    { name: "View Reviews", href: `${ADMIN_BASE}/reviews`, icon: CreditCard },
    { name: "Contact Messages", href: `${ADMIN_BASE}/contact-messages`, icon: MessageCircle },
  ];

  const isActive = (href: string) => {
    if (href === ADMIN_BASE) {
      return location === ADMIN_BASE;
    }
    return location.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="mt-6 px-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="" />
              <AvatarFallback>
                A
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Admin User
              </p>
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="hidden lg:block">
                {/* Empty space for alignment */}
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('admin_authenticated');
                  window.location.reload();
                }}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}