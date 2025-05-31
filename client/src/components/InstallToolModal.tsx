import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Copy, CheckCircle } from "lucide-react";

interface Tool {
  id: number;
  name: string;
  type: string;
  description: string;
  installCommand?: string;
  runCommand?: string;
  installed: boolean;
}

interface InstallToolModalProps {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstallStart?: (toolId: number, toolName: string) => void;
}

export default function InstallToolModal({ tool, open, onOpenChange, onInstallStart }: InstallToolModalProps) {
  const [installCommand, setInstallCommand] = useState("");
  const [runCommand, setRunCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when tool changes
  React.useEffect(() => {
    if (tool) {
      setInstallCommand(tool.installCommand || "");
      setRunCommand(tool.runCommand || "");
    }
  }, [tool]);

  const installMutation = useMutation({
    mutationFn: async (data: { id: number; installCommand: string; runCommand: string }) => {
      const response = await apiRequest("PATCH", `/api/tools/${data.id}/install`, {
        installCommand: data.installCommand,
        runCommand: data.runCommand
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Installation Started",
        description: `${tool?.name} installation has been started`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      onOpenChange(false);
      
      // Открываем терминал для отслеживания установки
      if (onInstallStart && tool) {
        onInstallStart(tool.id, tool.name);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Installation Failed", 
        description: error.message || "Failed to start installation",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Command copied to clipboard",
    });
  };

  const handleInstall = () => {
    if (!tool) return;
    installMutation.mutate({
      id: tool.id,
      installCommand,
      runCommand
    });
  };

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Terminal className="w-5 h-5 mr-2" />
            Install {tool.name}
          </DialogTitle>
          <DialogDescription>
            Configure installation and run commands for this security tool
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant={tool.type === "SAST" ? "default" : tool.type === "DAST" ? "secondary" : "outline"}>
              {tool.type}
            </Badge>
            <Badge variant={tool.installed ? "default" : "secondary"}>
              {tool.installed ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Installed
                </>
              ) : (
                "Not Installed"
              )}
            </Badge>
          </div>

          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="installCommand">Installation Command</Label>
              <div className="flex mt-1">
                <Textarea
                  id="installCommand"
                  value={installCommand}
                  onChange={(e) => setInstallCommand(e.target.value)}
                  placeholder="Enter installation command..."
                  className="min-h-[60px] font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 self-start"
                  onClick={() => copyToClipboard(installCommand)}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="runCommand">Run Command</Label>
              <div className="flex mt-1">
                <Input
                  id="runCommand"
                  value={runCommand}
                  onChange={(e) => setRunCommand(e.target.value)}
                  placeholder="Enter run command..."
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => copyToClipboard(runCommand)}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Run the installation command in your terminal to install the tool. 
              After installation, you can use the run command to execute the tool.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInstall}
            disabled={installMutation.isPending}
          >
            {installMutation.isPending ? "Updating..." : "Save & Mark Installed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}