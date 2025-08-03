"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { TutorialAccess } from "@/components/tutorials/TutorialAccess";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  FolderOpen,
  Mail,
  MessageCircle,
  Shield,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "pending" | "inactive";
  avatar?: string;
  joinedAt: Date;
  lastActive: Date;
}

const ROLES = {
  owner: "Full access and billing management",
  admin: "Full access to all features and team management",
  member: "Standard access to most features",
  viewer: "Read-only access to reports and data",
};

const PERMISSIONS = {
  owner: ["all"],
  admin: [
    "manage_team",
    "manage_settings",
    "view_billing",
    "create_reports",
    "edit_content",
  ],
  member: ["create_reports", "edit_content", "view_data"],
  viewer: ["view_data", "view_reports"],
};

export default function TeamManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member" as TeamMember["role"],
    message: "",
  });
  const [isInviting, setIsInviting] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    try {
      // Mock data - replace with actual API call
      const mockMembers: TeamMember[] = [
        {
          id: "1",
          email: "john.doe@company.com",
          name: "John Doe",
          role: "owner",
          status: "active",
          avatar: "/avatars/john.jpg",
          joinedAt: new Date("2024-01-15"),
          lastActive: new Date("2024-07-20"),
        },
        {
          id: "2",
          email: "jane.smith@company.com",
          name: "Jane Smith",
          role: "admin",
          status: "active",
          joinedAt: new Date("2024-02-01"),
          lastActive: new Date("2024-07-19"),
        },
        {
          id: "3",
          email: "mike.wilson@company.com",
          name: "Mike Wilson",
          role: "member",
          status: "pending",
          joinedAt: new Date("2024-07-18"),
          lastActive: new Date("2024-07-18"),
        },
      ];
      setTeamMembers(mockMembers);
    } catch (_error) {
      console.error("Error fetching team members:", _error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since this is mock data

  useEffect(() => {
    if (user && canUseFeature("team_management")) {
      fetchTeamMembers();
    }
  }, [user, canUseFeature, fetchTeamMembers]); // Include fetchTeamMembers in dependencies

  const sendInvite = async () => {
    if (!inviteForm.email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);
    try {
      // Mock implementation - replace with actual API call
      const newMember: TeamMember = {
        id: Date.now().toString(),
        email: inviteForm.email,
        name: inviteForm.email.split("@")[0],
        role: inviteForm.role,
        status: "pending",
        joinedAt: new Date(),
        lastActive: new Date(),
      };

      setTeamMembers([...teamMembers, newMember]);
      setInviteForm({ email: "", role: "member", message: "" });
      setIsInviteDialogOpen(false);
      toast.success("Invitation sent successfully");
    } catch (_error) {
      console.error("Error sending invite:", _error);
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const updateMemberRole = async (
    memberId: string,
    newRole: TeamMember["role"]
  ) => {
    try {
      setTeamMembers(
        teamMembers.map((member) =>
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );
      toast.success("Member role updated successfully");
    } catch (_error) {
      console.error("Error updating member role:", _error);
      toast.error("Failed to update member role");
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      setTeamMembers(teamMembers.filter((member) => member.id !== memberId));
      toast.success("Member removed successfully");
    } catch (_error) {
      console.error("Error removing member:", _error);
      toast.error("Failed to remove member");
    }
  };

  const resendInvite = async (memberId: string) => {
    try {
      // Mock implementation
      toast.success("Invitation resent successfully");
    } catch (_error) {
      console.error("Error resending invite:", _error);
      toast.error("Failed to resend invitation");
    }
  };

  const getStatusIcon = (status: TeamMember["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success-foreground" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "inactive":
        return <AlertCircle className="h-4 w-4 text-destructive-foreground" />;
    }
  };

  const getRoleColor = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "member":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading team management..." />;
  }

  return (
    <FeatureGate requiredTier="enterprise">
      <main className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold font-headline">
                Team Management
              </h1>
              <p className="text-muted-foreground font-body">
                Manage your team members and their access permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TutorialAccess
              feature="team_management"
              title="Team Setup Guide"
              description="Learn how to set up your team, assign roles, and manage permissions effectively."
            />

            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to add a new member to your team.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value: TeamMember["role"]) =>
                        setInviteForm({ ...inviteForm, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ROLES[inviteForm.role]}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Input
                      id="message"
                      placeholder="Welcome to the team!"
                      value={inviteForm.message}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          message: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={sendInvite}
                    disabled={isInviting}
                    className="flex-1"
                  >
                    {isInviting ? "Sending..." : "Send Invitation"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Team Collaboration Quick Access */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/team/chat")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Team Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time communication
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/team/projects")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <FolderOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Team Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Collaborative workspace
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/team/reports")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Team Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Performance analytics
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground">
                {teamMembers.filter((m) => m.status === "active").length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Invites
              </CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamMembers.filter((m) => m.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting acceptance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  teamMembers.filter(
                    (m) => m.role === "admin" || m.role === "owner"
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">Full access users</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your team members and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                        {member.role === "owner" && (
                          <div className="text-sm text-muted-foreground">
                            Full access and team management
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(member.status)}
                        <span className="capitalize">{member.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {member.lastActive.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {member.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvite(member.id)}
                          >
                            Resend
                          </Button>
                        )}

                        {member.role !== "owner" && (
                          <Select
                            value={member.role}
                            onValueChange={(_value: TeamMember["role"]) =>
                              updateMemberRole(member.id, _value)
                            }
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {member.role !== "owner" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMember(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>
              Understanding what each role can do in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(ROLES).map(([role, description]) => (
                <div key={role} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRoleColor(role as TeamMember["role"])}>
                      {role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {description}
                  </p>
                  <div className="space-y-1">
                    {PERMISSIONS[role as keyof typeof PERMISSIONS].map(
                      (permission) => (
                        <div
                          key={permission}
                          className="flex items-center gap-2 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 text-success-foreground" />
                          <span className="capitalize">
                            {permission.replace("_", " ")}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </FeatureGate>
  );
}
