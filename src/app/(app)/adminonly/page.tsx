// src/app/(app)/adminonly/page.tsx
"use client";

import { useEffect, useState } from "react";
import useAdminRoute from "@/hooks/useAdminRoute";
import LoadingScreen from "@/components/ui/loading-screen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, BarChart3, Settings, Database } from "lucide-react";
import { ToolPageHeader } from "@/components/tool-page-header";
import AdminUserManagement from "@/components/admin/admin-user-management";
import AdminSystemMetrics from "@/components/admin/admin-system-metrics";
import { AdminAnalyticsDashboard } from "@/components/admin/admin-analytics-dashboard";
import AdminSettings from "@/components/admin/admin-settings";
import AdminSupport from "@/components/admin/admin-support";
import { AdminUserSubscriptionManager } from "@/components/admin/AdminUserSubscriptionManager";

export default function AdminOnlyPage() {
  const { user, loading, role } = useAdminRoute();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return <LoadingScreen fullScreen text="Verifying admin permissions..." />;
  }

  if (!user || role !== "admin") {
    return <LoadingScreen fullScreen text="Redirecting..." />;
  }

  return (
    <main className="container mx-auto py-6 space-y-8">
      <ToolPageHeader
        title="Admin Dashboard"
        description="Manage users, monitor system health, and analyze platform metrics."
        badges={[{ label: "Admin", variant: "outline", className: "border-destructive/40 text-destructive" }]}
        showBreadcrumb
      />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="support" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Support
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
          {/* New comprehensive analytics dashboard for admins */}
          <AdminAnalyticsDashboard />
          {/* Optionally keep legacy analytics below for comparison */}
          {/* <AdminAnalytics /> */}
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <AdminSupport />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <AdminSystemMetrics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AdminSettings />
        </TabsContent>
      </Tabs>
  </main>
  );
}
