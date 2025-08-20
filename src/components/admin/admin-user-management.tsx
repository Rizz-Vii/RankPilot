"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  Crown,
  Calendar,
  Activity,
  Mail,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface TimestampLike { toDate: () => Date }

type UserDoc = {
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  createdAt?: unknown;
  lastSignIn?: unknown;
  subscription?: { status?: unknown; tier?: unknown } | unknown;
  activityCount?: unknown;
  [k: string]: unknown;
};

const isTimestampLike = (v: unknown): v is TimestampLike =>
  !!v &&
  typeof v === "object" &&
  "toDate" in v &&
  typeof (v as TimestampLike).toDate === "function";

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  createdAt?: TimestampLike; // Firestore Timestamp
  lastSignIn?: TimestampLike;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  activityCount?: number;
}

export default function AdminUserManagement(): JSX.Element {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "promote" | "demote" | "suspend"
  >("promote");

  useEffect(() => {
    let mounted = true;

    (async function fetchUsers() {
      try {
        setLoading(true);
        const qy = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200));
        const snap = await getDocs(qy);
        const list: User[] = snap.docs.map((d) => {
          const data = d.data() as UserDoc;
          return {
            id: d.id,
            email: typeof data.email === "string" ? data.email : "",
            displayName:
              typeof data.displayName === "string" ? data.displayName : undefined,
            role: typeof data.role === "string" ? data.role : "user",
            createdAt: isTimestampLike(data.createdAt) ? data.createdAt : undefined,
            lastSignIn: isTimestampLike(data.lastSignIn) ? data.lastSignIn : undefined,
            subscriptionStatus: data.subscription?.status,
            subscriptionTier: data.subscription?.tier,
            activityCount:
              typeof data.activityCount === "number" ? data.activityCount : undefined,
          };
        });
        if (mounted) setUsers(list);
      } catch (e) {
        if (mounted)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load users",
          });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleUserAction = async (): Promise<void> => {
    if (!selectedUser) return;

    try {
      const userRef = doc(db, "users", selectedUser.id);
      let newRole = selectedUser.role;

      switch (actionType) {
        case "promote":
          newRole = selectedUser.role === "user" ? "admin" : selectedUser.role;
          break;
        case "demote":
          newRole = selectedUser.role === "admin" ? "user" : selectedUser.role;
          break;
        case "suspend":
          newRole = "suspended";
          break;
      }

      await updateDoc(userRef, { role: newRole });

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, role: newRole } : user
        )
      );

      toast({
        title: "Success",
        description: `User ${actionType}d successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${actionType} user.`,
      });
    } finally {
      setActionDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const email = typeof user.email === 'string' ? user.email : '';
    const name = typeof user.displayName === 'string' ? user.displayName : '';
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      email.toLowerCase().includes(term) ||
      name.toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getUserBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-destructive/15 text-destructive">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
  case "agency":
        return (
          <Badge className="bg-accent/10 text-accent">
            <Crown className="h-3 w-3 mr-1" />
            Agency
          </Badge>
        );
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const getSubscriptionBadge = (status?: string, tier?: string) => {
    if (status === "active") {
      return (
  <Badge className="bg-success/15 text-success">
          {tier || "Enterprise"}
        </Badge>
      );
    }
    return <Badge variant="outline">Free</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading users...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Admin Users
                </p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Agency Users
                </p>
                <p className="text-2xl font-bold">
                  {
                    users.filter((u) => u.subscriptionStatus === "active")
                      .length
                  }
                </p>
              </div>
              <Crown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active This Month
                </p>
                <p className="text-2xl font-bold">
                  {
                    users.filter((u) => u.activityCount && u.activityCount > 0)
                      .length
                  }
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            View and manage all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="agency">Agency Users</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.displayName || "No name"}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getUserBadge(user.role)}</TableCell>
                    <TableCell>
                      {getSubscriptionBadge(
                        user.subscriptionStatus,
                        user.subscriptionTier
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.activityCount || 0} activities
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {isTimestampLike(user.createdAt)
                          ? formatDistanceToNow(user.createdAt.toDate(), { addSuffix: true })
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {isTimestampLike(user.lastSignIn)
                          ? formatDistanceToNow(user.lastSignIn.toDate(), { addSuffix: true })
                          : "Never"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.role === "user" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType("promote");
                                setActionDialogOpen(true);
                              }}
                            >
                              Promote to Admin
                            </DropdownMenuItem>
                          )}
                          {user.role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType("demote");
                                setActionDialogOpen(true);
                              }}
                            >
                              Demote to User
                            </DropdownMenuItem>
                          )}
                          {user.role !== "suspended" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType("suspend");
                                setActionDialogOpen(true);
                              }}
                            >
                              Suspend User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm{" "}
              {actionType === "promote"
                ? "Promotion"
                : actionType === "demote"
                  ? "Demotion"
                  : "Suspension"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} {selectedUser?.email}?
              {actionType === "suspend" &&
                " This will prevent them from accessing the platform."}
              {actionType === "promote" &&
                " This will give them admin privileges."}
              {actionType === "demote" &&
                " This will remove their admin privileges."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUserAction}>
              {actionType === "promote"
                ? "Promote"
                : actionType === "demote"
                  ? "Demote"
                  : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
