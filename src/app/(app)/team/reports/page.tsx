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
  FileText,
  Plus,
  Search,
  Download,
  Share2,
  Calendar,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  BarChart3,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  title: string;
  description: string;
  type: "weekly" | "monthly" | "quarterly" | "custom";
  status: "draft" | "published" | "scheduled";
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  scheduledDate?: Date;
  metrics: {
    totalViews: number;
    downloads: number;
    shares: number;
  };
  content: {
    keywordTracking: boolean;
    competitorAnalysis: boolean;
    contentPerformance: boolean;
    technicalSEO: boolean;
  };
  recipients: string[];
  tags: string[];
}

const reportTypeConfig = {
  weekly: { color: "bg-blue-500", label: "Weekly" },
  monthly: { color: "bg-green-500", label: "Monthly" },
  quarterly: { color: "bg-purple-500", label: "Quarterly" },
  custom: { color: "bg-orange-500", label: "Custom" },
};

const statusConfig = {
  draft: { color: "bg-gray-500", label: "Draft" },
  published: { color: "bg-green-500", label: "Published" },
  scheduled: { color: "bg-blue-500", label: "Scheduled" },
};

export default function TeamReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  const [reportForm, setReportForm] = useState({
    title: "",
    description: "",
    type: "monthly" as Report["type"],
    status: "draft" as Report["status"],
    scheduledDate: "",
    recipients: "",
    tags: "",
    content: {
      keywordTracking: true,
      competitorAnalysis: true,
      contentPerformance: true,
      technicalSEO: false,
    },
  });

  // Mock data for demonstration
  const mockReports: Report[] = [
    {
      id: "1",
      title: "Monthly SEO Performance Report",
      description: "Comprehensive monthly overview of SEO metrics and progress",
      type: "monthly",
      status: "published",
      createdBy: "john@example.com",
      createdAt: new Date("2024-01-01"),
      lastModified: new Date("2024-01-15"),
      metrics: {
        totalViews: 156,
        downloads: 42,
        shares: 8,
      },
      content: {
        keywordTracking: true,
        competitorAnalysis: true,
        contentPerformance: true,
        technicalSEO: true,
      },
      recipients: ["team@company.com", "manager@company.com"],
      tags: ["monthly", "overview", "performance"],
    },
    {
      id: "2",
      title: "Q1 Competitive Analysis",
      description: "Quarterly deep dive into competitor strategies and positioning",
      type: "quarterly",
      status: "scheduled",
      createdBy: "sarah@example.com",
      createdAt: new Date("2024-01-10"),
      lastModified: new Date("2024-01-20"),
      scheduledDate: new Date("2024-04-01"),
      metrics: {
        totalViews: 89,
        downloads: 23,
        shares: 5,
      },
      content: {
        keywordTracking: false,
        competitorAnalysis: true,
        contentPerformance: false,
        technicalSEO: false,
      },
      recipients: ["executives@company.com"],
      tags: ["quarterly", "competitors", "analysis"],
    },
    {
      id: "3",
      title: "Weekly Content Performance",
      description: "Weekly tracking of content engagement and search performance",
      type: "weekly",
      status: "draft",
      createdBy: "mike@example.com",
      createdAt: new Date("2024-01-22"),
      lastModified: new Date("2024-01-22"),
      metrics: {
        totalViews: 0,
        downloads: 0,
        shares: 0,
      },
      content: {
        keywordTracking: true,
        competitorAnalysis: false,
        contentPerformance: true,
        technicalSEO: true,
      },
      recipients: ["content-team@company.com"],
      tags: ["weekly", "content", "engagement"],
    },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setReports(mockReports);
    } catch (_error) {
      console.error("Error fetching reports:", _error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      if (!reportForm.title.trim()) {
        toast.error("Report title is required");
        return;
      }

      const newReport: Report = {
        id: Math.random().toString(36).substr(2, 9),
        title: reportForm.title,
        description: reportForm.description,
        type: reportForm.type,
        status: reportForm.status,
        createdBy: user?.email || "",
        createdAt: new Date(),
        lastModified: new Date(),
        scheduledDate: reportForm.scheduledDate ? new Date(reportForm.scheduledDate) : undefined,
        metrics: {
          totalViews: 0,
          downloads: 0,
          shares: 0,
        },
        content: reportForm.content,
        recipients: reportForm.recipients.split(",").map((r) => r.trim()),
        tags: reportForm.tags.split(",").map((t) => t.trim()),
      };

      setReports([newReport, ...reports]);
      setShowCreateDialog(false);
      setReportForm({
        title: "",
        description: "",
        type: "monthly",
        status: "draft",
        scheduledDate: "",
        recipients: "",
        tags: "",
        content: {
          keywordTracking: true,
          competitorAnalysis: true,
          contentPerformance: true,
          technicalSEO: false,
        },
      });
      toast.success("Report created successfully");
    } catch (_error) {
      console.error("Error creating report:", _error);
      toast.error("Failed to create report");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setReports(reports.filter((r) => r.id !== reportId));
      toast.success("Report deleted successfully");
    } catch (_error) {
      console.error("Error deleting report:", _error);
      toast.error("Failed to delete report");
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      toast.success("Report download started");
      // Simulate download
    } catch (_error) {
      console.error("Error downloading report:", _error);
      toast.error("Failed to download report");
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || report.type === filterType;
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading team reports..." />;
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
            <FileText className="h-8 w-8 text-primary" />
            Team Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and share SEO performance reports with your team
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>
                Set up a new report template for your team to use.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Report Title</Label>
                  <Input
                    id="title"
                    value={reportForm.title}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, title: e.target.value })
                    }
                    placeholder="Enter report title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Report Type</Label>
                  <Select
                    value={reportForm.type}
                    onValueChange={(value: Report["type"]) =>
                      setReportForm({ ...reportForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={reportForm.description}
                  onChange={(e) =>
                    setReportForm({
                      ...reportForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the report content and purpose"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={reportForm.status}
                    onValueChange={(value: Report["status"]) =>
                      setReportForm({ ...reportForm, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reportForm.status === "scheduled" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Scheduled Date</Label>
                    <Input
                      id="scheduledDate"
                      type="datetime-local"
                      value={reportForm.scheduledDate}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          scheduledDate: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients</Label>
                <Input
                  id="recipients"
                  value={reportForm.recipients}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, recipients: e.target.value })
                  }
                  placeholder="email1@company.com, email2@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={reportForm.tags}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, tags: e.target.value })
                  }
                  placeholder="tag1, tag2, tag3"
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
              <Button onClick={handleCreateReport}>Create Report</Button>
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
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {report.description}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownloadReport(report.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditingReport(report)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteReport(report.id)}
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
                  className={`${reportTypeConfig[report.type].color} text-white`}
                >
                  {reportTypeConfig[report.type].label}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${statusConfig[report.status].color} text-white border-transparent`}
                >
                  {statusConfig[report.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Sections */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Content Sections</div>
                <div className="flex flex-wrap gap-1">
                  {report.content.keywordTracking && (
                    <Badge variant="outline" className="text-xs">
                      Keywords
                    </Badge>
                  )}
                  {report.content.competitorAnalysis && (
                    <Badge variant="outline" className="text-xs">
                      Competitors
                    </Badge>
                  )}
                  {report.content.contentPerformance && (
                    <Badge variant="outline" className="text-xs">
                      Content
                    </Badge>
                  )}
                  {report.content.technicalSEO && (
                    <Badge variant="outline" className="text-xs">
                      Technical
                    </Badge>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="font-medium">{report.metrics.totalViews}</div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="font-medium">{report.metrics.downloads}</div>
                  <div className="text-xs text-muted-foreground">Downloads</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Share2 className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="font-medium">{report.metrics.shares}</div>
                  <div className="text-xs text-muted-foreground">Shares</div>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>Recipients ({report.recipients.length})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.recipients.slice(0, 2).join(", ")}
                  {report.recipients.length > 2 && ` +${report.recipients.length - 2} more`}
                </div>
              </div>

              {/* Schedule Info */}
              {report.scheduledDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Scheduled for {report.scheduledDate.toLocaleDateString()}</span>
                </div>
              )}

              {/* Created Info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                <span>Created {report.createdAt.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No reports found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== "all" || filterStatus !== "all"
              ? "Try adjusting your filters or search term."
              : "Create your first report to get started."}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Button>
        </div>
      )}
    </div>
  );
}
