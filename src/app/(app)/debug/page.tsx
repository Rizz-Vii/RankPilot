"use client";

import React from "react";
import { UserSubscriptionDebugger } from "@/components/debug/UserSubscriptionDebugger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fixAbbaUser } from "@/lib/admin-user-management";

export default function DebugPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFixUser = async () => {
    try {
      await fixAbbaUser();
      toast({
        title: "Success",
        description: "User subscription fixed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fix user",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Debug & Development</h1>
        <p className="text-muted-foreground">
          Debug tools and utilities for development and testing
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Development tools for testing subscription functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={handleFixUser}>Fix Abba User Subscription</Button>
          </div>
        </CardContent>
      </Card>

      {/* User Subscription Debugger */}
      <UserSubscriptionDebugger />

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>
              Node Environment: <code>{process.env.NODE_ENV}</code>
            </div>
            <div>
              Current User Email: <code>{user?.email || "Not logged in"}</code>
            </div>
            <div>
              Current User UID: <code>{user?.uid || "Not logged in"}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
