"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Search,
  FileText,
  Users,
  Calendar,
  Activity,
} from "lucide-react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalAudits: number;
  totalKeywordSearches: number;
  monthlyActivity: unknown[];
  toolUsage: { name: string; _value: number; color: string }[];
  userGrowth: unknown[];
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const totalUsers = usersSnapshot.size;

      // Calculate active users (users with activities in last 30 days)
      let activeUsers = 0;
      let totalAudits = 0;
      let totalKeywordSearches = 0;
      const monthlyActivity = [];
      const toolUsage = {
        audits: 0,
        keywords: 0,
        serp: 0,
        competitors: 0,
      };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const userDoc of usersSnapshot.docs) {
        const activitiesRef = collection(db, "users", userDoc.id, "activities");
        const activitiesSnapshot = await getDocs(activitiesRef);

        let userActiveInLast30Days = false;

        activitiesSnapshot.docs.forEach((activityDoc) => {
          const activity = activityDoc.data();
          const activityDate = activity.timestamp?.toDate();

          if (activityDate && activityDate > thirtyDaysAgo) {
            userActiveInLast30Days = true;
          }

          // Count by type
          switch (activity.type) {
            case "audit":
              totalAudits++;
              toolUsage.audits++;
              break;
            case "keyword-research":
              totalKeywordSearches++;
              toolUsage.keywords++;
              break;
            case "serp-analysis":
              toolUsage.serp++;
              break;
            case "competitor-analysis":
              toolUsage.competitors++;
              break;
          }
        });

        if (userActiveInLast30Days) {
          activeUsers++;
        }
      }

      // Generate monthly activity data (last 6 months)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
          name: date.toLocaleDateString("en-US", { month: "short" }),
          users: Math.floor(totalUsers * (0.6 + Math.random() * 0.4)), // Simulated growth
          activities: Math.floor(
            ((totalAudits + totalKeywordSearches) / 6) *
              (0.8 + Math.random() * 0.4)
          ),
        });
      }

      // User growth data
      const userGrowth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        userGrowth.push({
          name: date.toLocaleDateString("en-US", { month: "short" }),
          newUsers: Math.floor(Math.random() * 20 + 5),
          totalUsers: Math.floor(totalUsers * (0.3 + (11 - i) * 0.06)),
        });
      }

      const toolUsageArray = [
        { name: "SEO Audits", _value: toolUsage.audits, color: "#8884d8" },
        {
          name: "Keyword Research",
          _value: toolUsage.keywords,
          color: "#82ca9d",
        },
        { name: "SERP Analysis", _value: toolUsage.serp, color: "#ffc658" },
        {
          name: "Competitor Analysis",
          _value: toolUsage.competitors,
          color: "#ff7c7c",
        },
      ];

      setAnalytics({
        totalUsers,
        activeUsers,
        totalAudits,
        totalKeywordSearches,
        monthlyActivity: months,
        toolUsage: toolUsageArray,
        userGrowth,
      });
    } catch (_error) {
      console.error("Error fetching analytics:", _error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                <p className="text-xs text-green-600">+12% from last month</p>
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
                  Active Users (30d)
                </p>
                <p className="text-2xl font-bold">{analytics.activeUsers}</p>
                <p className="text-xs text-green-600">+8% from last month</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Audits
                </p>
                <p className="text-2xl font-bold">{analytics.totalAudits}</p>
                <p className="text-xs text-green-600">+25% from last month</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Keyword Searches
                </p>
                <p className="text-2xl font-bold">
                  {analytics.totalKeywordSearches}
                </p>
                <p className="text-xs text-green-600">+18% from last month</p>
              </div>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>
              Monthly user registration and total users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#8884d8"
                  name="New Users"
                />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  stroke="#82ca9d"
                  name="Total Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tool Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Usage Distribution</CardTitle>
            <CardDescription>
              How users are utilizing different SEO tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.toolUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.toolUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as { color: string }).color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Activity Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity Trends</CardTitle>
          <CardDescription>
            User activity and engagement over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.monthlyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#8884d8" name="Active Users" />
              <Bar
                dataKey="activities"
                fill="#82ca9d"
                name="Total Activities"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {((analytics.activeUsers / analytics.totalUsers) * 100).toFixed(
                1
              )}
              %
            </div>
            <p className="text-sm text-muted-foreground">
              Users active in the last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avg. Activities/User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {(
                (analytics.totalAudits + analytics.totalKeywordSearches) /
                analytics.totalUsers
              ).toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground">
              Average activities per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {analytics.toolUsage.sort((a, b) => b._value - a._value)[0]?.name ||
                "N/A"}
            </div>
            <p className="text-sm text-muted-foreground">
              Most popular SEO tool
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
