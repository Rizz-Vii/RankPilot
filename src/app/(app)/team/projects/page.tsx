"use client";

import { useState, useEffect } from "react";
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from "@/components/tool-page-header";
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
import { DashboardSurface } from '@/components/layout/DashboardSurface';
import { SuiteAccentProvider } from '@/context/SuiteAccentContext';
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
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from "firebase/firestore";

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
  active: { color: "bg-success", label: "Active", icon: CheckCircle },
  completed: { color: "bg-primary", label: "Completed", icon: CheckCircle },
  paused: { color: "bg-warning", label: "Paused", icon: Clock },
  planning: { color: "bg-muted", label: "Planning", icon: AlertCircle },
};

const priorityConfig = {
  low: { color: "bg-muted", label: "Low" },
  medium: { color: "bg-warning", label: "Medium" },
  high: { color: "bg-accent", label: "High" },
  critical: { color: "bg-destructive", label: "Critical" },
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

  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const tQ = query(collection(db, 'teams'), where('memberIds', 'array-contains', user.uid));
      const tSnap = await getDocs(tQ);
      if (!tSnap.empty) setTeamId(tSnap.docs[0].id);
      else {
        const uSnap = await getDoc(doc(db, 'users', user.uid));
        const uData = uSnap.exists() ? (uSnap.data() as any) : undefined;
        const tId = typeof uData?.teamId === 'string' ? uData.teamId : (user as any)?.teamId;
        if (typeof tId === 'string') setTeamId(tId);
      }
    })();
  }, [user?.uid]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      if (!teamId) { setProjects([]); return; }
      // Read projects with teamId
      const q = query(collection(db, 'projects'), where('teamId', '==', teamId), orderBy('name'));
      const snap = await getDocs(q);
      const items: Project[] = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name,
          description: data.description,
          status: data.status || 'active',
          priority: data.priority || 'medium',
          assignedMembers: data.assignedMembers || [],
          keywords: data.keywords || [],
          targetUrls: data.targetUrls || [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          deadline: data.deadline?.toDate?.(),
          progress: data.progress ?? 0,
          metrics: data.metrics || { totalKeywords: 0, rankedKeywords: 0, avgPosition: 0, trafficIncrease: 0 },
        } as Project;
      });
      setProjects(items);
    } catch (error) {
      console.error("Error fetching projects:", error);
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

      if (!teamId) { toast.error('Team not resolved'); return; }
      await addDoc(collection(db, 'projects'), {
        name: projectForm.name,
        description: projectForm.description,
        status: projectForm.status,
        priority: projectForm.priority,
        assignedMembers: [user?.email || user?.uid],
        keywords: projectForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
        targetUrls: projectForm.targetUrls.split(',').map(u => u.trim()).filter(Boolean),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deadline: projectForm.deadline ? new Date(projectForm.deadline) : null,
        progress: 0,
        metrics: { totalKeywords: 0, rankedKeywords: 0, avgPosition: 0, trafficIncrease: 0 },
        teamId,
        userId: user?.uid
      });
      await fetchProjects();
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
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
  await deleteDoc(doc(db, 'projects', projectId));
  setProjects(projects.filter((p) => p.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
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

  useEffect(() => { if (teamId) fetchProjects(); }, [teamId]);

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading team projects..." />;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
  <FeatureGate feature="team_management" requiredTier="enterprise" showUpgrade>
  <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="Team Projects"
        description="Manage and track your team's SEO projects and campaigns"
        badges={[
          { label: "Collaboration", variant: "secondary" },
          { label: "Enterprise", variant: "outline", className: "text-primary border-primary/40" },
        ]}
        showBreadcrumb
      >
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
                    onValueChange={(value: Project["priority"]) =>
                      setProjectForm({ ...projectForm, priority: value })
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
  </ToolPageHeader>
  <SuiteAccentProvider value="marketing">
  <DashboardSurface as="section" className="space-y-8 p-6">

  {/* Filters */}
  <div className="flex flex-col md:flex-row gap-4">
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
                          className="text-destructive-foreground"
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
                    <div className="w-full bg-muted rounded-full h-2">
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
                      <div className="font-medium text-success-foreground">
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
      </DashboardSurface>
      </SuiteAccentProvider>
    </main>
  </FeatureGate>
  );
}
