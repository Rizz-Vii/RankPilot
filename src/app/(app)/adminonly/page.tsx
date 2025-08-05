// src/app/(app)/adminonly/page.tsx
"use client";

import React, { useState } from "react";
import useAdminRoute from "@/hooks/useAdminRoute";
import LoadingScreen from "@/components/ui/loading-screen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Users,
  BarChart3,
  Settings,
  Database,
} from "lucide-react";
import AdminUserManagement from "@/components/admin/admin-user-management";
import AdminSystemMetrics from "@/components/admin/admin-system-metrics";
import AdminAnalytics from "@/components/admin/admin-analytics";
import AdminSettings from "@/components/admin/admin-settings";
import { AdminUserSubscriptionManager } from "@/components/admin/AdminUserSubscriptionManager";

export default function AdminOnlyPage() {
  const { user, loading, role } = useAdminRoute();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return <LoadingScreen fullScreen text="Verifying admin permissions..." />;
  }

  if (!user || role !== "admin") {
    return <LoadingScreen fullScreen text="Redirecting..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-success" />
        <div>
          <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
          <p className="text-muted-foreground font-body">
            Manage users, monitor system health, and analyze platform metrics.
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger
            value="subscriptions"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <AdminUserSubscriptionManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <AdminSystemMetrics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
