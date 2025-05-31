import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, Copy, CheckCircle } from "lucide-react";

interface Tool {
  id: number;
  name: string;
  type: string;
  description: string;
  installCommand?: string;
  runCommand?: string;
  installed: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  projectPath: string;
}

interface RunToolModalProps {
  tool: Tool | null;
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunStart?: (toolId: number, toolName: string) => void;
}

export default function RunToolModal({ tool, projects, open, onOpenChange, onRunStart }: RunToolModalProps) {
  const [command, setCommand] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (tool) {
      setCommand(tool.runCommand || "");
      setSelectedProject("");
    }
  }, [tool]);

  const runMutation = useMutation({
    mutationFn: async (data: { id: number; command: string; projectPath?: string }) => {
      const response = await apiRequest("POST", `/api/tools/${data.id}/run`, {
        command: data.command,
        projectPath: data.projectPath
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Tool Started",
        description: `${tool?.name} execution has been started`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      onOpenChange(false);
      
      // Открываем терминал для отслеживания выполнения
      if (onRunStart && tool) {
        onRunStart(tool.id, tool.name);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Execution Failed", 
        description: error.message || "Failed to start tool execution",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tool || !command.trim()) return;

    const selectedProjectData = projects.find(p => p.id.toString() === selectedProject);
    
    runMutation.mutate({
      id: tool.id,
      command: command.trim(),
      projectPath: selectedProjectData?.projectPath
    });
  };

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Run {tool.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tool-info">Tool Information</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{tool.name}</span>
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                  {tool.type}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-select">Target Project (Optional)</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project or leave empty for general execution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name} ({project.projectPath})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="run-command">Run Command</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(command)}
                className="flex items-center gap-1"
              >
                {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Textarea
              id="run-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter the command to run this tool..."
              rows={4}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              This command will be executed on the host machine. 
              Use project paths relative to /home/$USER/fuzzbench-data/projects/
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            Tool is installed and ready to run
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={runMutation.isPending || !command.trim()}
              className="flex items-center gap-2"
            >
              {runMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Tool
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}