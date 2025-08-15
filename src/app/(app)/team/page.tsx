"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
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
// Removed full-screen LoadingScreen in favor of inline skeleton rows
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isDemoContentEnabled } from "@/lib/flags/demo";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { subscribeToTeamMembers, inviteTeamMember, updateTeamMemberRole as apiUpdateRole, removeTeamMember as apiRemoveMember, resendTeamInvite, transferTeamOwnership, TeamMember, canModifyMember, canRemoveMember } from "@/lib/services/team.service";
// Old one-off Firestore fetch utilities removed now that realtime subscription is stable
// TeamMember now imported from service layer

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
  const demoEnabled = isDemoContentEnabled();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member" as TeamMember["role"],
    message: "",
  });
  const [isInviting, setIsInviting] = useState(false);
  const [transferLoadingId, setTransferLoadingId] = useState<string | null>(null);

  const initSubscription = useCallback(() => {
    if (!user?.uid) return;
    const unsubscribePromise = subscribeToTeamMembers({
      userId: user.uid,
      onData: (members) => {
        setTeamMembers(members);
        setLoading(false);
      },
      onError: (err) => {
        console.error("Team subscription error", err);
        toast.error("Team updates failed");
        setLoading(false);
      }
    });
    return unsubscribePromise;
  }, [user?.uid]);

  useEffect(() => {
    if (user && canUseFeature("team_management")) {
      const maybeUnsub = initSubscription();
      return () => { maybeUnsub?.then?.(u => u()); };
    }
  }, [user, canUseFeature, initSubscription]);

  const sendInvite = async () => {
    if (!inviteForm.email) {
      toast.error("Enter an email address");
      return;
    }
    // basic duplicate guard
    if (teamMembers.some(m => m.email.toLowerCase() === inviteForm.email.toLowerCase())) {
      toast.error("User already invited or a member");
      return;
    }
    setIsInviting(true);
    try {
      await inviteTeamMember({ email: inviteForm.email, role: inviteForm.role, message: inviteForm.message });
      toast.success("Invitation sent");
      setInviteForm({ email: "", role: "member", message: "" });
      setIsInviteDialogOpen(false);
    } catch (e:any) {
      console.error(e);
      toast.error(e.message || "Invite failed");
    } finally { setIsInviting(false); }
  };

  const updateMemberRole = async (memberId: string, newRole: TeamMember["role"]) => {
    const original = teamMembers.find(m => m.id === memberId);
    if (!original) return;
    if (!canModifyMember(user?.uid || "", original, teamMembers)) {
      toast.error("Insufficient permissions");
      return;
    }
    // optimistic
    setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    try {
      await apiUpdateRole(memberId, newRole);
      toast.success("Role updated");
    } catch (e:any) {
      // rollback
      setTeamMembers(teamMembers.map(m => m.id === memberId ? original : m));
      toast.error(e.message || "Role update failed");
    }
  };

  const removeMember = async (memberId: string) => {
    const target = teamMembers.find(m => m.id === memberId);
    if (!target) return;
    if (!canRemoveMember(target, teamMembers)) {
      toast.error("Cannot remove this member");
      return;
    }
    const prev = teamMembers;
    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    try {
      await apiRemoveMember(memberId);
      toast.success("Member removed");
    } catch (e:any) {
      setTeamMembers(prev); // rollback
      toast.error(e.message || "Remove failed");
    }
  };

  const resendInvite = async (memberId: string) => {
    try { await resendTeamInvite(memberId); toast.success("Invitation resent"); }
    catch (e:any) { toast.error(e.message || "Resend failed"); }
  };

  const getStatusIcon = (status: TeamMember["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success-foreground" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning-foreground" />;
      case "inactive":
        return <AlertCircle className="h-4 w-4 text-destructive-foreground" />;
    }
  };

  const getRoleColor = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return "bg-accent/10 text-accent-foreground";
      case "admin":
        return "bg-primary/10 text-primary";
      case "member":
        return "bg-success/10 text-success-foreground";
      case "viewer":
        return "bg-muted text-foreground";
    }
  };

  const currentUserMember = teamMembers.find(m => m.userId === user?.uid || m.id === user?.uid);
  const isOwner = currentUserMember?.role === 'owner';
  const isLoading = authLoading || loading;

  return (
  <FeatureGate feature="team_management" requiredTier="agency" showUpgrade>
  <main className="container mx-auto py-6 space-y-8" data-testid="team-management-page">
  {/* Demo mode banner (informational only) */}
  <Alert className="mb-2" data-testid="team-banner">
          <AlertDescription>
            {demoEnabled
              ? 'Some collaboration features may use demo scaffolding until all APIs are wired.'
              : 'Demo content is disabled. Only live-backed features are shown.'}
          </AlertDescription>
        </Alert>
        <ToolPageHeader
          title="Team Management"
          description="Manage team members, roles, permissions, and collaboration."
          badges={[
            { label: "Collaboration", variant: "secondary" },
            { label: "Enterprise", variant: "outline", className: "text-primary border-primary/40" }
          ]}
          showBreadcrumb
        >
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
                <Button className="gap-2" data-testid="invite-member-button">
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
        </ToolPageHeader>

        {/* Team Collaboration Quick Access */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/team/chat")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <MessageCircle className="h-6 w-6 text-primary" />
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
              <div className="rounded-full bg-success/10 p-3">
                <FolderOpen className="h-6 w-6 text-success-foreground" />
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
              <div className="rounded-full bg-accent/10 p-3">
                <BarChart3 className="h-6 w-6 text-accent-foreground" />
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
  <div className="grid gap-4 md:grid-cols-3" data-testid="team-stats">
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

          <Card data-testid="pending-invites-card">
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

          <Card data-testid="admin-users-card">
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
            <div className="overflow-x-auto" data-testid="team-members-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Member</TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Last Active</TableHead>
                  <TableHead scope="col" className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`} data-testid={`team-member-skeleton-${i}`}> 
                      <TableCell colSpan={5} className="py-4">
                        <div className="flex items-center gap-4 animate-pulse">
                          <div className="h-8 w-8 rounded-full bg-muted" />
                          <div className="flex-1 grid grid-cols-4 gap-4">
                            <div className="h-4 bg-muted rounded col-span-2" />
                            <div className="h-4 bg-muted rounded col-span-1" />
                            <div className="h-4 bg-muted rounded col-span-1" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && teamMembers.length === 0 && (
                  <TableRow data-testid="empty-team-state">
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No team members yet. Invite your first collaborator.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && teamMembers.map((member) => (
                  <TableRow key={member.id} data-testid={`team-member-row-${member.id}`}>
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
                            data-testid={`resend-invite-${member.id}`}
                          >
                            Resend
                          </Button>
                        )}

                        {member.role !== "owner" && (
                          <Select
                            value={member.role}
                            onValueChange={(value: TeamMember["role"]) =>
                              updateMemberRole(member.id, value)
                            }
                          >
                            <SelectTrigger className="w-[100px]" data-testid={`role-select-${member.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {isOwner && member.role !== 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={transferLoadingId === member.id}
                            onClick={async () => {
                              if (!confirm(`Transfer ownership to ${member.name}? This will reduce your permissions.`)) return;
                              setTransferLoadingId(member.id);
                              try {
                                await transferTeamOwnership(member.id);
                                toast.success("Ownership transferred");
                              } catch (e:any) {
                                toast.error(e.message || 'Transfer failed');
                              } finally {
                                setTransferLoadingId(null);
                              }
                            }}
                            className="text-accent-foreground hover:text-accent-foreground/80"
                            data-testid={`transfer-ownership-${member.id}`}
                          >
                            {transferLoadingId === member.id ? 'Transferring...' : 'Make Owner'}
                          </Button>
                        )}

                        {member.role !== "owner" && canRemoveMember(member, teamMembers) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMember(member.id)}
                            className="text-destructive-foreground hover:text-destructive-foreground/80"
                            aria-label={`Remove ${member.name}`}
                            data-testid={`remove-member-${member.id}`}
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
            </div>
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
