import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Tool {
  id: number;
  name: string;
  type: string;
  description: string;
  installCommand?: string;
  runCommand?: string;
  installed: boolean;
}

interface ConfigureToolModalProps {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConfigureToolModal({ tool, open, onOpenChange }: ConfigureToolModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [installCommand, setInstallCommand] = useState("");
  const [runCommand, setRunCommand] = useState("");
  const [description, setDescription] = useState("");

  // Инициализация значений при открытии модального окна
  React.useEffect(() => {
    if (tool) {
      setInstallCommand(tool.installCommand || "");
      setRunCommand(tool.runCommand || "");
      setDescription(tool.description || "");
    }
  }, [tool]);

  const updateToolMutation = useMutation({
    mutationFn: async (data: { installCommand: string; runCommand: string; description: string }) => {
      if (!tool) throw new Error("No tool selected");
      
      return await apiRequest(`/api/tools/${tool.id}/configure`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Tool Updated",
        description: "Tool configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateToolMutation.mutate({
      installCommand,
      runCommand,
      description
    });
  };

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure {tool.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tool description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installCommand">Install Command</Label>
            <Input
              id="installCommand"
              value={installCommand}
              onChange={(e) => setInstallCommand(e.target.value)}
              placeholder="e.g., apt-get install tool-name"
            />
            <p className="text-xs text-muted-foreground">
              Command used to install this tool on the host system
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="runCommand">Run Command</Label>
            <Input
              id="runCommand"
              value={runCommand}
              onChange={(e) => setRunCommand(e.target.value)}
              placeholder="e.g., tool-name --scan"
            />
            <p className="text-xs text-muted-foreground">
              Default command to run this tool
            </p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <h4 className="font-medium mb-2">Tool Information</h4>
            <div className="space-y-1 text-muted-foreground">
              <p><strong>Type:</strong> {tool.type}</p>
              <p><strong>Status:</strong> {tool.installed ? "Installed" : "Not Installed"}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateToolMutation.isPending}
            >
              {updateToolMutation.isPending ? "Updating..." : "Update Tool"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}