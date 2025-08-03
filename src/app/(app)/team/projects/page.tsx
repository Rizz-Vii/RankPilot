"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Folder,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Target,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "paused" | "planning";
  priority: "low" | "medium" | "high" | "critical";
  assignedMembers: string[];
  keywords: string[];
  targetUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  progress: number;
  metrics: {
    totalKeywords: number;
    rankedKeywords: number;
    avgPosition: number;
    trafficIncrease: number;
  };
}

const statusConfig = {
  active: { color: "bg-green-500", label: "Active", icon: CheckCircle },
  completed: { color: "bg-blue-500", label: "Completed", icon: CheckCircle },
  paused: { color: "bg-yellow-500", label: "Paused", icon: Clock },
  planning: { color: "bg-gray-500", label: "Planning", icon: AlertCircle },
};

const priorityConfig = {
  low: { color: "bg-gray-400", label: "Low" },
  medium: { color: "bg-yellow-500", label: "Medium" },
  high: { color: "bg-orange-500", label: "High" },
  critical: { color: "bg-red-500", label: "Critical" },
};

export default function TeamProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "planning" as Project["status"],
    priority: "medium" as Project["priority"],
    keywords: "",
    targetUrls: "",
    deadline: "",
  });

  // Mock data for demonstration
  const mockProjects: Project[] = [
    {
      id: "1",
      name: "E-commerce SEO Campaign",
      description: "Comprehensive SEO optimization for online store",
      status: "active",
      priority: "high",
      assignedMembers: ["john@example.com", "jane@example.com"],
      keywords: ["online shopping", "buy products", "e-commerce store"],
      targetUrls: ["https://example-store.com"],
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-20"),
      deadline: new Date("2024-03-01"),
      progress: 75,
      metrics: {
        totalKeywords: 150,
        rankedKeywords: 112,
        avgPosition: 8.5,
        trafficIncrease: 35,
      },
    },
    {
      id: "2",
      name: "Blog Content Strategy",
      description: "Content planning and optimization for company blog",
      status: "planning",
      priority: "medium",
      assignedMembers: ["sarah@example.com"],
      keywords: ["tech blog", "industry insights", "tutorials"],
      targetUrls: ["https://example.com/blog"],
      createdAt: new Date("2024-01-18"),
      updatedAt: new Date("2024-01-22"),
      deadline: new Date("2024-02-15"),
      progress: 25,
      metrics: {
        totalKeywords: 80,
        rankedKeywords: 20,
        avgPosition: 15.2,
        trafficIncrease: 12,
      },
    },
    {
      id: "3",
      name: "Local SEO Optimization",
      description: "Improve local search visibility for physical locations",
      status: "completed",
      priority: "high",
      assignedMembers: ["mike@example.com", "lisa@example.com"],
      keywords: ["local business", "near me", "location services"],
      targetUrls: ["https://example-local.com"],
      createdAt: new Date("2023-12-01"),
      updatedAt: new Date("2024-01-10"),
      deadline: new Date("2024-01-15"),
      progress: 100,
      metrics: {
        totalKeywords: 60,
        rankedKeywords: 58,
        avgPosition: 3.2,
        trafficIncrease: 85,
      },
    },
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProjects(mockProjects);
    } catch (_error) {
      console.error("Error fetching projects:", _error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!projectForm.name.trim()) {
        toast.error("Project name is required");
        return;
      }

      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: projectForm.name,
        description: projectForm.description,
        status: projectForm.status,
        priority: projectForm.priority,
        assignedMembers: [user?.email || ""],
        keywords: projectForm.keywords.split(",").map((k) => k.trim()),
        targetUrls: projectForm.targetUrls.split(",").map((u) => u.trim()),
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: projectForm.deadline ? new Date(projectForm.deadline) : undefined,
        progress: 0,
        metrics: {
          totalKeywords: 0,
          rankedKeywords: 0,
          avgPosition: 0,
          trafficIncrease: 0,
        },
      };

      setProjects([newProject, ...projects]);
      setShowCreateDialog(false);
      setProjectForm({
        name: "",
        description: "",
        status: "planning",
        priority: "medium",
        keywords: "",
        targetUrls: "",
        deadline: "",
      });
      toast.success("Project created successfully");
    } catch (_error) {
      console.error("Error creating project:", _error);
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setProjects(projects.filter((p) => p.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (_error) {
      console.error("Error deleting project:", _error);
      toast.error("Failed to delete project");
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || project.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading team projects..." />;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/team")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Folder className="h-8 w-8 text-primary" />
              Team Projects
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your team's SEO projects and campaigns
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Set up a new SEO project for your team to collaborate on.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={projectForm.name}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, name: e.target.value })
                      }
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value: Project["status"]) =>
                        setProjectForm({ ...projectForm, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the project goals and scope"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={projectForm.priority}
                      onValueChange={(_value: Project["priority"]) =>
                        setProjectForm({ ...projectForm, priority: _value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={projectForm.deadline}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          deadline: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Target Keywords</Label>
                  <Input
                    id="keywords"
                    value={projectForm.keywords}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, keywords: e.target.value })
                    }
                    placeholder="keyword 1, keyword 2, keyword 3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urls">Target URLs</Label>
                  <Input
                    id="urls"
                    value={projectForm.targetUrls}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, targetUrls: e.target.value })
                    }
                    placeholder="https://example.com, https://example.com/page"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const StatusIcon = statusConfig[project.status].icon;
            return (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {project.description}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingProject(project)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge
                      variant="secondary"
                      className={`${statusConfig[project.status].color} text-white`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[project.status].label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${priorityConfig[project.priority].color} text-white border-transparent`}
                    >
                      {priorityConfig[project.priority].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Keywords</span>
                      </div>
                      <div className="font-medium">
                        {project.metrics.rankedKeywords}/{project.metrics.totalKeywords}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Traffic</span>
                      </div>
                      <div className="font-medium text-green-600">
                        +{project.metrics.trafficIncrease}%
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Team ({project.assignedMembers.length})</span>
                    </div>
                    <div className="flex -space-x-2">
                      {project.assignedMembers.slice(0, 3).map((member, index) => (
                        <div
                          key={index}
                          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium border-2 border-background"
                        >
                          {member.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.assignedMembers.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-background">
                          +{project.assignedMembers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deadline */}
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due {project.deadline.toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterStatus !== "all" || filterPriority !== "all"
                ? "Try adjusting your filters or search term."
                : "Create your first project to get started."}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
          </Button>
        </div>
      )}
    </div>
  );
}
