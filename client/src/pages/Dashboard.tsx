import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  Folder, 
  Search, 
  AlertTriangle, 
  Play, 
  Download, 
  Eye, 
  Pause, 
  RotateCcw,
  FileText,
  RefreshCw,
  Plus,
  Code,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Settings,
  Users,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import NewScanModal from "@/components/NewScanModal";
import NewProjectModal from "@/components/NewProjectModal";
import FuzzingWrapperGenerator from "@/components/FuzzingWrapperGenerator";
import UserManagement from "@/components/UserManagement";
import RoleSwitcher from "@/components/RoleSwitcher";
import InstallToolModal from "@/components/InstallToolModal";
import RunToolModal from "@/components/RunToolModal";
import TerminalModal from "@/components/TerminalModal";
import ConfigureToolModal from "@/components/ConfigureToolModal";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Stats {
  projects: number;
  tools: number;
  scansRunning: number;
  vulnerabilities: number;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
}

interface Tool {
  id: number;
  name: string;
  type: string;
  description: string;
  installed: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  userId: string;
  projectPath: string;
}

interface Scan {
  id: number;
  projectId: number;
  toolId: number;
  status: string;
  result?: any;
  targetUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  project?: { id: number; name: string; description: string };
  tool?: { id: number; name: string; type: string };
}

export default function Dashboard() {
  const { user } = useAuth() as { user: any };
  const { lang } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNewScanModal, setShowNewScanModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showInstallToolModal, setShowInstallToolModal] = useState(false);
  const [showRunToolModal, setShowRunToolModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [installingToolId, setInstallingToolId] = useState<number | null>(null);
  const [installingToolName, setInstallingToolName] = useState("");
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [configureTool, setConfigureTool] = useState<Tool | null>(null);

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest(`/api/projects/${projectId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (projectId: number, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const runToolMutation = useMutation({
    mutationFn: async (data: { toolId: number; projectPath: string }) => {
      const response = await apiRequest(`/api/tools/${data.toolId}/run`, "POST", {
        projectPath: data.projectPath
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tool analysis started successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run tool",
        variant: "destructive",
      });
    },
  });

  const handleRunTool = (tool: Tool) => {
    setSelectedTool(tool);
    setShowRunToolModal(true);
  };

  // Queries
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: tools = [] } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: scans = [] } = useQuery<Scan[]>({
    queryKey: ["/api/scans"],
  });

  // Mutations
  const installToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const response = await apiRequest("POST", `/api/tools/install/${toolId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Tool installed successfully",
        description: "The security tool is now available for use.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Installation failed",
        description: error.message || "Failed to install the tool.",
        variant: "destructive",
      });
    },
  });

  const uninstallToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const response = await apiRequest("DELETE", `/api/tools/${toolId}/uninstall`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Tool uninstalled successfully",
        description: "The security tool has been removed from the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Uninstallation failed",
        description: error.message || "Failed to uninstall the tool.",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/tools"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/scans"] }),
      ]);
    },
    onSuccess: () => {
      toast({
        title: "Data refreshed",
        description: "All dashboard data has been updated.",
      });
    },
  });

  const handleInstallTool = (toolId: number) => {
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      setSelectedTool(tool);
      setShowInstallToolModal(true);
    }
  };

  const handleUninstallTool = (toolId: number) => {
    uninstallToolMutation.mutate(toolId);
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleInstallStart = (toolId: number, toolName: string) => {
    setInstallingToolId(toolId);
    setInstallingToolName(toolName);
    setShowTerminalModal(true);
  };

  const handleRunStart = (toolId: number, toolName: string) => {
    setInstallingToolId(toolId);
    setInstallingToolName(toolName);
    setShowTerminalModal(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "running":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const sastTools = tools.filter(tool => tool.type === "SAST");
  const dastTools = tools.filter(tool => tool.type === "DAST");
  const wrapperGenTools = tools.filter(tool => tool.type === "WRAPPER_GEN");
  const recentScans = scans.slice(0, 10);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {lang === 'ru' ? 'Панель сканера безопасности' : 'Security Scanner Dashboard'}
              </h1>
              <p className="text-gray-600">
                {lang === 'ru'
                  ? 'Управляйте инструментами безопасности и контролируйте результаты сканирований'
                  : 'Manage your security tools and monitor scan results'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && <RoleSwitcher currentRole={user?.role} />}
              <LanguageSwitcher />
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  {lang === 'ru' ? 'Обновить' : 'Refresh'}
                </Button>
                <Button onClick={() => setShowNewScanModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {lang === 'ru' ? 'Новое сканирование' : 'New Scan'}
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="dashboard">{lang === 'ru' ? 'Панель' : 'Dashboard'}</TabsTrigger>
              <TabsTrigger value="tools">{lang === 'ru' ? 'Инструменты' : 'Tools'}</TabsTrigger>
              <TabsTrigger value="projects">{lang === 'ru' ? 'Проекты' : 'Projects'}</TabsTrigger>
              <TabsTrigger value="scans">{lang === 'ru' ? 'Сканирования' : 'Scans'}</TabsTrigger>
              <TabsTrigger value="api-docs">{lang === 'ru' ? 'Документация' : 'API Docs'}</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Folder className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="text-2xl font-bold text-primary">{stats?.projects || 0}</h3>
                    <p className="text-muted-foreground">
                      {lang === 'ru' ? 'Активные проекты' : 'Active Projects'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h3 className="text-2xl font-bold text-green-500">{stats?.tools || 0}</h3>
                    <p className="text-muted-foreground">
                      {lang === 'ru' ? 'Доступные инструменты' : 'Available Tools'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Search className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="text-2xl font-bold text-yellow-500">{stats?.scansRunning || 0}</h3>
                    <p className="text-muted-foreground">
                      {lang === 'ru' ? 'Запущенные сканирования' : 'Running Scans'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <h3 className="text-2xl font-bold text-red-500">{stats?.vulnerabilities || 0}</h3>
                    <p className="text-muted-foreground">
                      {lang === 'ru' ? 'Уязвимости' : 'Vulnerabilities'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Scans */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    {lang === 'ru' ? 'Последние сканирования' : 'Recent Scans'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{lang === 'ru' ? 'Проект' : 'Project'}</TableHead>
                        <TableHead>{lang === 'ru' ? 'Инструмент' : 'Tool'}</TableHead>
                        <TableHead>{lang === 'ru' ? 'Статус' : 'Status'}</TableHead>
                        <TableHead>{lang === 'ru' ? 'Начато' : 'Started'}</TableHead>
                        <TableHead>{lang === 'ru' ? 'Длительность' : 'Duration'}</TableHead>
                        <TableHead>{lang === 'ru' ? 'Действия' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentScans.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{scan.project?.name}</div>
                              <div className="text-sm text-muted-foreground">{scan.project?.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge variant={scan.tool?.type === "SAST" ? "default" : "secondary"}>
                                {scan.tool?.type}
                              </Badge>
                              <span>{scan.tool?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(scan.status)}</TableCell>
                          <TableCell>
                            {scan.startedAt
                              ? formatTimeAgo(scan.startedAt)
                              : lang === 'ru'
                                ? 'Не начато'
                                : 'Not started'}
                          </TableCell>
                          <TableCell>
                            {scan.status === "running" && (
                              <Progress value={Math.random() * 100} className="w-20" />
                            )}
                            {scan.status === "completed" && scan.result?.scanDuration && (
                              <span>{scan.result.scanDuration}</span>
                            )}
                            {scan.status === "failed" && (
                              <span className="text-red-500">Failed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {scan.status === "completed" && (
                                <>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {scan.status === "running" && (
                                <Button size="sm" variant="outline">
                                  <Pause className="w-4 h-4" />
                                </Button>
                              )}
                              {scan.status === "failed" && (
                                <>
                                  <Button size="sm" variant="outline">
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tools" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* SAST Tools */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Code className="w-5 h-5 mr-2" />
                      SAST Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sastTools.map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{tool.name}</h4>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </div>
                        <div className="text-right">
                          {tool.installed ? (
                            <>
                              <Badge className="bg-green-100 text-green-800 mb-2">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Installed
                              </Badge>
                              <br />
                              <Button size="sm" variant="outline">
                                <Play className="w-4 h-4 mr-1" />
                                Run
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary" className="mb-2">
                                <XCircle className="w-3 h-3 mr-1" />
                                Not Installed
                              </Badge>
                              <br />
                              {user?.role === 'admin' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleInstallTool(tool.id)}
                                  disabled={installToolMutation.isPending}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Install
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* DAST Tools */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Globe className="w-5 h-5 mr-2" />
                      DAST Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dastTools.map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{tool.name}</h4>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </div>
                        <div className="text-right">
                          {tool.installed ? (
                            <>
                              <Badge className="bg-green-100 text-green-800 mb-2">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Installed
                              </Badge>
                              <br />
                              <Button size="sm" variant="outline">
                                <Play className="w-4 h-4 mr-1" />
                                Run
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary" className="mb-2">
                                <XCircle className="w-3 h-3 mr-1" />
                                Not Installed
                              </Badge>
                              <br />
                              {user?.role === 'admin' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleInstallTool(tool.id)}
                                  disabled={installToolMutation.isPending}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Install
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Wrapper Generation Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Wrapper Generation Tools
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tools for generating fuzzing wrappers for different programming languages
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {wrapperGenTools.map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                      <div className="text-right">
                        {tool.installed ? (
                          <>
                            <Badge className="bg-green-100 text-green-800 mb-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Installed
                            </Badge>
                            <br />
                            <Button size="sm" variant="outline">
                              <Settings className="w-4 h-4 mr-1" />
                              Configure
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary" className="mb-2">
                              <XCircle className="w-3 h-3 mr-1" />
                              Not Installed
                            </Badge>
                            <br />
                            {user?.role === 'admin' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleInstallTool(tool.id)}
                                disabled={installToolMutation.isPending}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Install
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Fuzzing Wrapper Generator */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Code className="w-5 h-5 mr-2" />
                      Fuzzing Wrapper Generator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FuzzingWrapperGenerator />
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="projects">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Projects</CardTitle>
                  <Button onClick={() => setShowNewProjectModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first project to get started with security scanning.</p>
                      <Button onClick={() => setShowNewProjectModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {projects.map((project) => (
                        <div key={project.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{project.name}</h3>
                              <p className="text-sm text-muted-foreground">{project.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Path: {project.projectPath || 'Not specified'}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              disabled={deleteProjectMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scans">
              <Card>
                <CardHeader>
                  <CardTitle>All Scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Tool</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scans.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell>{scan.id}</TableCell>
                          <TableCell>{scan.project?.name}</TableCell>
                          <TableCell>{scan.tool?.name}</TableCell>
                          <TableCell>{getStatusBadge(scan.status)}</TableCell>
                          <TableCell>{formatTimeAgo(scan.createdAt)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-docs">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Authentication</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-green-100 text-green-800">POST</Badge>
                          /auth/register
                        </code>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Register a new user account</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-green-100 text-green-800">POST</Badge>
                          /auth/login
                        </code>
                        <Badge variant="outline">Public</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Authenticate and receive JWT token</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-blue-100 text-blue-800">GET</Badge>
                          /tools
                        </code>
                        <Badge variant="secondary">Auth Required</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">List all available security tools</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-green-100 text-green-800">POST</Badge>
                          /tools/install/{'{id}'}
                        </code>
                        <Badge variant="destructive">Admin Only</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Install a security tool by ID</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-blue-100 text-blue-800">GET</Badge>
                          /projects
                        </code>
                        <Badge variant="secondary">Auth Required</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">List user's projects</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-green-100 text-green-800">POST</Badge>
                          /projects
                        </code>
                        <Badge variant="secondary">Auth Required</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Create a new project</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Scans</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-green-100 text-green-800">POST</Badge>
                          /scan
                        </code>
                        <Badge variant="secondary">Auth Required</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Start a new security scan</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">
                          <Badge className="mr-2 bg-blue-100 text-blue-800">GET</Badge>
                          /scans/{'{id}'}
                        </code>
                        <Badge variant="secondary">Auth Required</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Get scan results and status</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {user?.role === 'admin' && (
              <TabsContent value="admin" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Tool Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Tool Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {tools.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{tool.name}</h4>
                            <p className="text-sm text-muted-foreground">{tool.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {tool.installed ? (
                              <>
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Installed
                                </Badge>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    console.log('Configure button clicked for tool:', tool);
                                    setConfigureTool(tool);
                                    setShowConfigureModal(true);
                                    console.log('Modal should be open now');
                                  }}
                                >
                                  <Settings className="w-4 h-4 mr-1" />
                                  Configure
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleUninstallTool(tool.id)}
                                  disabled={uninstallToolMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Uninstall
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleInstallTool(tool.id)}
                                disabled={installToolMutation.isPending}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Install
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* User Management */}
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      User Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Create and manage user accounts and permissions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <UserManagement />
                  </CardContent>
                </Card>
                </div>

                {/* System Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-primary">{projects.length}</h3>
                        <p className="text-muted-foreground">Total Projects</p>
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-green-500">{tools.filter(t => t.installed).length}</h3>
                        <p className="text-muted-foreground">Installed Tools</p>
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-yellow-500">{scans.filter(s => s.status === 'running').length}</h3>
                        <p className="text-muted-foreground">Active Scans</p>
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-red-500">
                          {scans.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.result?.vulnerabilities || 0), 0)}
                        </h3>
                        <p className="text-muted-foreground">Total Vulnerabilities</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <NewScanModal 
        open={showNewScanModal}
        onOpenChange={setShowNewScanModal}
        projects={projects}
        tools={tools.filter(t => t.installed)}
      />
      
      <NewProjectModal 
        open={showNewProjectModal}
        onOpenChange={setShowNewProjectModal}
      />

      <InstallToolModal
        tool={selectedTool}
        open={showInstallToolModal}
        onOpenChange={setShowInstallToolModal}
        onInstallStart={handleInstallStart}
      />

      <RunToolModal
        tool={selectedTool}
        projects={projects}
        open={showRunToolModal}
        onOpenChange={setShowRunToolModal}
        onRunStart={handleRunStart}
      />

      <TerminalModal
        toolId={installingToolId}
        toolName={installingToolName}
        open={showTerminalModal}
        onOpenChange={setShowTerminalModal}
      />

      <ConfigureToolModal
        tool={configureTool}
        open={showConfigureModal}
        onOpenChange={setShowConfigureModal}
      />
    </div>
  );
}
