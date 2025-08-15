"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import LoadingScreen from "@/components/ui/loading-screen";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  Copy,
  Trash2,
  Plus,
  BarChart3,
  Shield,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { TutorialAccess } from "@/components/tutorials/TutorialAccess";

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  created: Date;
  lastUsed: Date | null;
  usageCount: number;
  status: "active" | "inactive";
  permissions: string[];
}

interface ApiUsage {
  totalCalls: number;
  monthlyLimit: number;
  dailyCalls: number;
  dailyLimit: number;
  errorRate: number;
  avgResponseTime: number;
}

export default function ApiManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<ApiUsage>({
    totalCalls: 0,
    monthlyLimit: 50000,
    dailyCalls: 0,
    dailyLimit: 2000,
    errorRate: 0.5,
    avgResponseTime: 245,
  });
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user && canUseFeature("api_access")) {
      fetchApiKeys();
      fetchUsageStats();
    }
  }, [user, canUseFeature]);

  const fetchApiKeys = async () => {
    try {
      // Mock data - replace with actual API call
      const mockKeys: ApiKey[] = [
        {
          id: "key_1",
          name: "Production API",
          keyPreview: "rp_live_sk_1a2b...3c4d",
          created: new Date("2024-01-15"),
          lastUsed: new Date("2024-01-20"),
          usageCount: 15420,
          status: "active",
          permissions: ["read", "write", "analytics"],
        },
        {
          id: "key_2",
          name: "Development",
          keyPreview: "rp_test_sk_5e6f...7g8h",
          created: new Date("2024-01-10"),
          lastUsed: null,
          usageCount: 0,
          status: "inactive",
          permissions: ["read"],
        },
      ];
      setApiKeys(mockKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      // Mock data - replace with actual API call
      const mockUsage: ApiUsage = {
        totalCalls: 15420,
        monthlyLimit: 50000,
        dailyCalls: 342,
        dailyLimit: 2000,
        errorRate: 0.5,
        avgResponseTime: 245,
      };
      setUsage(mockUsage);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setIsCreating(true);
    try {
      // Mock implementation - replace with actual API call
      const newKey: ApiKey = {
        id: `key_${Date.now()}`,
        name: newKeyName,
        keyPreview: `rp_live_sk_${Math.random().toString(36).substr(2, 8)}...${Math.random().toString(36).substr(2, 4)}`,
        created: new Date(),
        lastUsed: null,
        usageCount: 0,
        status: "active",
        permissions: ["read", "write"],
      };

      setApiKeys([...apiKeys, newKey]);
      setNewKeyName("");
      toast.success("API key created successfully");
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      setApiKeys(apiKeys.filter((key) => key.id !== keyId));
      toast.success("API key deleted successfully");
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading API management..." />;
  }

  return (
    <FeatureGate requiredTier="enterprise" feature="api_access">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold font-headline">
                API Management
              </h1>
              <p className="text-muted-foreground font-body">
                Manage your API keys and monitor usage for RankPilot API access.
              </p>
            </div>
          </div>
          <TutorialAccess
            feature="api_access"
            title="API Tutorials"
            description="Learn how to integrate with RankPilot API and build custom solutions."
          />
        </div>

        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-6">
            {/* Create New API Key */}
            <Card>
              <CardHeader>
                <CardTitle>Create New API Key</CardTitle>
                <CardDescription>
                  Generate a new API key for accessing RankPilot services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="keyName">API Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production API, Development, Mobile App"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={createApiKey}
                      disabled={isCreating}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {isCreating ? "Creating..." : "Create Key"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing API Keys */}
            <Card>
              <CardHeader>
                <CardTitle>Your API Keys</CardTitle>
                <CardDescription>
                  Manage and monitor your existing API keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          <Badge
                            variant={
                              key.status === "active" ? "default" : "secondary"
                            }
                          >
                            {key.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {key.keyPreview}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created: {key.created.toLocaleDateString()}
                          </span>
                          <span>
                            Usage: {key.usageCount.toLocaleString()} calls
                          </span>
                          {key.lastUsed && (
                            <span>
                              Last used: {key.lastUsed.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(key.keyPreview)}
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKey(key.id)}
                          className="gap-1 text-destructive-foreground hover:text-destructive-foreground/80"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}

                  {apiKeys.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No API keys created yet.</p>
                      <p className="text-sm">
                        Create your first API key to get started.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            {/* Usage Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Monthly Calls
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usage.totalCalls.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {usage.monthlyLimit.toLocaleString()} limit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Daily Calls
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usage.dailyCalls}</div>
                  <p className="text-xs text-muted-foreground">
                    of {usage.dailyLimit} daily limit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Error Rate
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usage.errorRate}%</div>
                  <p className="text-xs text-success-foreground">
                    Excellent performance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Response
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usage.avgResponseTime}ms
                  </div>
                  <p className="text-xs text-success-foreground">Fast response times</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Documentation</CardTitle>
                <CardDescription>
                  Learn how to integrate with RankPilot API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Getting Started</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Learn the basics of authentication and making your first
                      API call.
                    </p>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      View Guide
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">API Reference</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Complete documentation of all available endpoints and
                      parameters.
                    </p>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      View Docs
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Code Examples</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sample code in various programming languages.
                    </p>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      View Examples
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Rate Limits</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Understand rate limiting and best practices for API usage.
                    </p>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Learn More
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
