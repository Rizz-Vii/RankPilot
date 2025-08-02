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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
  Search,
  MoreHorizontal,
  Mail,
  Crown,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SubscriptionUser {
  id: string;
  email: string;
  displayName?: string;
  subscription: {
    tier: string;
    status: string;
    current_period_end?: number;
    customer_id?: string;
    subscription_id?: string;
  };
  createdAt: number;
  lastLoginAt?: number;
}

interface SubscriptionStats {
  total: number;
  active: number;
  canceled: number;
  pastDue: number;
  revenue: number;
  starterCount: number;
  agencyCount: number;
  enterpriseCount: number;
}

export function SubscriptionManagement() {
  const [users, setUsers] = useState<SubscriptionUser[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    canceled: 0,
    pastDue: 0,
    revenue: 0,
    starterCount: 0,
    agencyCount: 0,
    enterpriseCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      // Fetch all users with subscriptions
      const usersQuery = query(
        collection(db, "users"),
        where("subscription.tier", "!=", "free")
      );

      const usersSnapshot = await getDocs(usersQuery);
      const usersData: SubscriptionUser[] = [];
      const tempStats = {
        total: 0,
        active: 0,
        canceled: 0,
        pastDue: 0,
        revenue: 0,
        starterCount: 0,
        agencyCount: 0,
        enterpriseCount: 0,
      };

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as any;
        const user: SubscriptionUser = {
          id: doc.id,
          email: userData.email,
          displayName: userData.displayName,
          subscription: userData.subscription || {
            tier: "free",
            status: "inactive",
          },
          createdAt: userData.createdAt?.seconds * 1000 || Date.now(),
          lastLoginAt: userData.lastLoginAt?.seconds * 1000,
        };

        usersData.push(user);

        // Calculate stats
        tempStats.total++;

        if (user.subscription.status === "active") {
          tempStats.active++;

          // Calculate revenue (rough estimate)
          if (user.subscription.tier === "starter") {
            tempStats.revenue += 29;
            tempStats.starterCount++;
          } else if (user.subscription.tier === "agency") {
            tempStats.revenue += 79;
            tempStats.agencyCount++;
          } else if (user.subscription.tier === "enterprise") {
            tempStats.revenue += 199;
            tempStats.enterpriseCount++;
          }
        } else if (user.subscription.status === "canceled") {
          tempStats.canceled++;
        } else if (user.subscription.status === "past_due") {
          tempStats.pastDue++;
        }
      });

      setUsers(usersData);
      setStats(tempStats);
    } catch (_error) {
      console.error("Error fetching subscription _data:", _error);
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const updateUserSubscription = async (
    userId: string,
    updates: { [_key: string]: any }
  ) => {
    try {
      const userRef = doc(db, "users", userId);
      const updateData: { [_key: string]: any } = {};
      Object.keys(updates).forEach((_key) => {
        updateData[`subscription.${key}`] = updates[key];
      });

      await updateDoc(userRef, updateData);

      toast.success("Subscription updated successfully");
      fetchSubscriptionData(); // Refresh data
    } catch (_error) {
      console.error("Error updating subscription:", _error);
      toast.error("Failed to update subscription");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.subscription.tier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: {
      [_key: string]: "default" | "secondary" | "destructive" | "outline";
    } = {
      active: "default",
      canceled: "destructive",
      past_due: "destructive",
      inactive: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "starter":
        return <Zap className="w-4 h-4" />;
      case "agency":
        return <Crown className="w-4 h-4" />;
      case "enterprise":
        return <CreditCard className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active, {stats.canceled} canceled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue}</div>
            <p className="text-xs text-muted-foreground">
              Estimated from active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">agency Plans</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agencyCount}</div>
            <p className="text-xs text-muted-foreground">Most popular tier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pastDue}</div>
            <p className="text-xs text-muted-foreground">Past due payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage user subscriptions and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target._value)}
                  className="max-w-sm"
                />
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.displayName || "Anonymous"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTierIcon(user.subscription.tier)}
                            <span className="capitalize">
                              {user.subscription.tier}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.subscription.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUserSubscription(user.id, {
                                    status: "active",
                                  })
                                }
                              >
                                Activate Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUserSubscription(user.id, {
                                    status: "canceled",
                                  })
                                }
                              >
                                Cancel Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Plan Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Starter</span>
                        <span className="text-sm font-medium">
                          {stats.starterCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">agency</span>
                        <span className="text-sm font-medium">
                          {stats.agencyCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Enterprise</span>
                        <span className="text-sm font-medium">
                          {stats.enterpriseCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Starter ($29)</span>
                        <span className="text-sm font-medium">
                          ${stats.starterCount * 29}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">agency ($79)</span>
                        <span className="text-sm font-medium">
                          ${stats.agencyCount * 79}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Enterprise ($199)</span>
                        <span className="text-sm font-medium">
                          ${stats.enterpriseCount * 199}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Health Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Rate</span>
                        <span className="text-sm font-medium">
                          {stats.total > 0
                            ? Math.round((stats.active / stats.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Churn Rate</span>
                        <span className="text-sm font-medium">
                          {stats.total > 0
                            ? Math.round((stats.canceled / stats.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Issues</span>
                        <span className="text-sm font-medium text-red-600">
                          {stats.pastDue}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
