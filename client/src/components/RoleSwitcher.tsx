import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Crown, User, RotateCcw } from "lucide-react";

interface RoleSwitcherProps {
  currentRole?: string;
}

export default function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const switchRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      const response = await apiRequest("/api/auth/switch-role", "POST", { role: newRole });
      return response;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      toast({
        title: "Role switched successfully",
        description: result.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Role switch failed",
        description: error.message || "Failed to switch role",
        variant: "destructive",
      });
    },
  });

  const handleRoleSwitch = (newRole: string) => {
    if (newRole === currentRole) return;
    switchRoleMutation.mutate(newRole);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Switch to:</span>
      <Button
        size="sm"
        variant={currentRole === "admin" ? "default" : "outline"}
        onClick={() => handleRoleSwitch("admin")}
        disabled={switchRoleMutation.isPending || currentRole === "admin"}
      >
        <Crown className="w-3 h-3 mr-1" />
        Admin
      </Button>
      <Button
        size="sm"
        variant={currentRole === "user" ? "default" : "outline"}
        onClick={() => handleRoleSwitch("user")}
        disabled={switchRoleMutation.isPending || currentRole === "user"}
      >
        <User className="w-3 h-3 mr-1" />
        User
      </Button>
      {switchRoleMutation.isPending && (
        <RotateCcw className="w-4 h-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}