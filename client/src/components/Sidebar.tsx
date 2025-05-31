import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, 
  BarChart3, 
  Settings, 
  Folder, 
  Search, 
  Code, 
  LogOut,
  Crown,
  User as UserIcon,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
}

interface SidebarProps {
  user?: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ user, activeTab, onTabChange }: SidebarProps) {
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "tools", label: "Security Tools", icon: Shield },
    { id: "projects", label: "Projects", icon: Folder },
    { id: "scans", label: "Scans", icon: Search },
    { id: "api-docs", label: "API Documentation", icon: Code },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: "admin", label: "Admin Panel", icon: Settings });
  }

  return (
    <div className="w-64 bg-gradient-to-b from-blue-600 to-purple-700 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="w-8 h-8" />
          <h1 className="text-xl font-bold">DevSec Scanner</h1>
        </div>
        <p className="text-sm text-blue-100">Security Tool Management</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Avatar className="w-12 h-12 mx-auto mb-2">
                <AvatarImage src={user.profileImageUrl} alt={user.email} />
                <AvatarFallback className="bg-white/20 text-white">
                  <UserIcon className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <h6 className="font-medium text-sm truncate">{user.email}</h6>
              <Badge 
                className={`mt-2 ${
                  user.role === 'admin' 
                    ? 'bg-yellow-500 text-yellow-900' 
                    : 'bg-blue-500 text-blue-100'
                }`}
              >
                {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/20">
        <Button
          variant="ghost"
          className="w-full justify-start text-blue-100 hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
