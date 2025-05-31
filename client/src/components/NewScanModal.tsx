import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, Search } from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string;
}

interface Tool {
  id: number;
  name: string;
  type: string;
  installed: boolean;
}

interface NewScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tools: Tool[];
}

const scanSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  toolId: z.string().min(1, "Please select a tool"),
  targetUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  options: z.string().optional(),
});

type ScanFormData = z.infer<typeof scanSchema>;

export default function NewScanModal({ open, onOpenChange, projects, tools }: NewScanModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ScanFormData>({
    resolver: zodResolver(scanSchema),
    defaultValues: {
      projectId: "",
      toolId: "",
      targetUrl: "",
      options: "",
    },
  });

  const createScanMutation = useMutation({
    mutationFn: async (data: ScanFormData) => {
      const payload = {
        projectId: parseInt(data.projectId),
        toolId: parseInt(data.toolId),
        targetUrl: data.targetUrl || undefined,
        options: data.options || undefined,
      };
      
      const response = await apiRequest("POST", "/api/scan", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Scan started successfully",
        description: "Your security scan has been initiated and is now running.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start scan",
        description: error.message || "There was an error starting the scan.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScanFormData) => {
    createScanMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Configure New Security Scan
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Tool</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tool..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tools.map((tool) => (
                        <SelectItem key={tool.id} value={tool.id.toString()}>
                          {tool.name} ({tool.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://api.example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="options"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scan Options (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional parameters for the scan..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createScanMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                {createScanMutation.isPending ? "Starting..." : "Start Scan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
