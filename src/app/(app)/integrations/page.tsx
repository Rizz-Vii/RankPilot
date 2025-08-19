"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  BarChart3,
  Check,
  Copy,
  Database,
  Edit,
  ExternalLink,
  Link,
  Mail,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { allowDemoContent } from "@/lib/flags/demo";
import { toast } from "sonner";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  lastDelivery?: Date;
  deliveryCount: number;
  failureCount: number;
}

interface Integration {
  id: string;
  name: string;
  type: "webhook" | "api" | "database" | "email" | "chat" | "analytics";
  description: string;
  active: boolean;
  config: Record<string, unknown>;
  lastSync?: Date;
}

const WEBHOOK_EVENTS = [
  { value: "report.generated", label: "Report Generated" },
  { value: "analysis.completed", label: "Analysis Completed" },
  { value: "keyword.ranking.changed", label: "Keyword Ranking Changed" },
  { value: "competitor.detected", label: "New Competitor Detected" },
  { value: "alert.triggered", label: "Alert Triggered" },
  { value: "user.subscribed", label: "User Subscribed" },
  { value: "user.unsubscribed", label: "User Unsubscribed" },
];

const INTEGRATION_TYPES = [
  {
    value: "webhook",
    label: "Webhook",
    icon: Webhook,
    description: "HTTP callbacks for real-time events",
  },
  {
    value: "api",
    label: "REST API",
    icon: Link,
    description: "Custom API endpoints and integrations",
  },
  {
    value: "database",
    label: "Database",
    icon: Database,
    description: "Direct database connections",
  },
  {
    value: "email",
    label: "Email",
    icon: Mail,
    description: "Email automation and notifications",
  },
  {
    value: "chat",
    label: "Chat/Slack",
    icon: MessageSquare,
    description: "Team chat integrations",
  },
  {
    value: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Third-party analytics platforms",
  },
];

export default function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    active: true,
  });

  const [integrationForm, setIntegrationForm] = useState({
    name: "",
    type: "" as Integration["type"],
    description: "",
    config: {},
  });

  useEffect(() => {
    if (user && canUseFeature("custom_integrations")) {
      fetchIntegrations();
    }
  }, [user, canUseFeature]);

  // Minimal demo-friendly loader to satisfy typecheck and initialize state
  async function fetchIntegrations() {
    try {
      // In a real implementation, fetch from backend. For now ensure UI loads.
      if (allowDemoContent()) {
        setIntegrations([]);
        setWebhooks([]);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleWebhookSubmit = async () => {
    try {
      if (editingWebhook) {
        // Update existing webhook
        setWebhooks((prev) =>
          prev.map((webhook) =>
            webhook.id === editingWebhook.id
              ? { ...webhook, ...webhookForm, secret: webhook.secret }
              : webhook
          )
        );
        toast.success("Webhook updated successfully");
      } else {
        // Create new webhook
        const newWebhook: Webhook = {
          id: `wh_${Date.now()}`,
          ...webhookForm,
          secret: `whsec_${Math.random().toString(36).substring(2)}`,
          deliveryCount: 0,
          failureCount: 0,
        };
        setWebhooks((prev) => [...prev, newWebhook]);
        toast.success("Webhook created successfully");
      }

      setShowWebhookDialog(false);
      setEditingWebhook(null);
      setWebhookForm({ name: "", url: "", events: [], active: true });
    } catch (error) {
      console.error("Error saving webhook:", error);
      toast.error("Failed to save webhook");
    }
  };

  const handleIntegrationSubmit = async () => {
    try {
      if (editingIntegration) {
        // Update existing integration
        setIntegrations((prev) =>
          prev.map((integration) =>
            integration.id === editingIntegration.id
              ? {
                ...integration,
                ...integrationForm,
                active: integration.active,
              }
              : integration
          )
        );
        toast.success("Integration updated successfully");
      } else {
        // Create new integration
        const newIntegration: Integration = {
          id: `int_${Date.now()}`,
          ...integrationForm,
          active: false,
          config: {},
        };
        setIntegrations((prev) => [...prev, newIntegration]);
        toast.success("Integration created successfully");
      }

      setShowIntegrationDialog(false);
      setEditingIntegration(null);
      setIntegrationForm({
        name: "",
        type: "webhook",
        description: "",
        config: {},
      });
    } catch (error) {
      console.error("Error saving integration:", error);
      toast.error("Failed to save integration");
    }
  };

  const toggleWebhook = async (webhookId: string) => {
    try {
      setWebhooks((prev) =>
        prev.map((webhook) =>
          webhook.id === webhookId
            ? { ...webhook, active: !webhook.active }
            : webhook
        )
      );
      toast.success("Webhook status updated");
    } catch (error) {
      console.error("Error toggling webhook:", error);
      toast.error("Failed to update webhook");
    }
  };

  const toggleIntegration = async (integrationId: string) => {
    try {
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === integrationId
            ? { ...integration, active: !integration.active }
            : integration
        )
      );
      toast.success("Integration status updated");
    } catch (error) {
      console.error("Error toggling integration:", error);
      toast.error("Failed to update integration");
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      setWebhooks((prev) => prev.filter((webhook) => webhook.id !== webhookId));
      toast.success("Webhook deleted successfully");
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Failed to delete webhook");
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    try {
      setIntegrations((prev) =>
        prev.filter((integration) => integration.id !== integrationId)
      );
      toast.success("Integration deleted successfully");
    } catch (error) {
      console.error("Error deleting integration:", error);
      toast.error("Failed to delete integration");
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(secret);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const testWebhook = async (webhookId?: string) => {
    try {
      // Mock test - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Test payload sent successfully");
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error("Failed to send test payload");
    }
  };

  const editWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
    });
    setShowWebhookDialog(true);
  };

  const editIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setIntegrationForm({
      name: integration.name,
      type: integration.type,
      description: integration.description,
      config: integration.config,
    });
    setShowIntegrationDialog(true);
  };

  if (authLoading || loading) {
    return <LoadingScreen fullScreen text="Loading integrations..." />;
  }

  return (
    <FeatureGate requiredTier="enterprise" feature="custom_integrations">
      <main className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold font-headline">
                Custom Integrations
              </h1>
              <p className="text-muted-foreground font-body">
                Connect RankPilot with your existing tools and workflows.
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="webhooks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Webhooks</h2>
                <p className="text-muted-foreground">
                  Receive real-time notifications when events occur in
                  RankPilot.
                </p>
              </div>
              <Button
                onClick={() => setShowWebhookDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </div>

            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {webhook.name}
                        </CardTitle>
                        <Badge
                          variant={webhook.active ? "default" : "secondary"}
                        >
                          {webhook.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void testWebhook(webhook.id)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editWebhook(webhook)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Switch
                          checked={webhook.active}
                          onCheckedChange={() => void toggleWebhook(webhook.id)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-sm font-medium">
                          Endpoint URL
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">
                            {webhook.url}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(webhook.url, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          Webhook Secret
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">
                            {webhook.secret.substring(0, 20)}...
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copySecret(webhook.secret)}
                          >
                            {copiedSecret === webhook.secret ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Events</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {webhook.events.map((event) => (
                          <Badge
                            key={event}
                            variant="outline"
                            className="text-xs"
                          >
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-success-foreground">
                          {webhook.deliveryCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Successful Deliveries
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-destructive-foreground">
                          {webhook.failureCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Failed Deliveries
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {webhook.lastDelivery
                            ? webhook.lastDelivery.toLocaleString()
                            : "Never"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last Delivery
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {webhooks.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No webhooks configured
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first webhook to start receiving real-time
                      notifications.
                    </p>
                    <Button
                      onClick={() => setShowWebhookDialog(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Webhook
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  Third-Party Integrations
                </h2>
                <p className="text-muted-foreground">
                  Connect with popular tools and services to streamline your
                  workflow.
                </p>
              </div>
              <Button
                onClick={() => setShowIntegrationDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Integration
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => {
                const IconComponent =
                  INTEGRATION_TYPES.find((t) => t.value === integration.type)
                    ?.icon || Settings;
                return (
                  <Card key={integration.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-lg">
                              {integration.name}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {integration.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              integration.active ? "default" : "secondary"
                            }
                          >
                            {integration.active ? "Active" : "Inactive"}
                          </Badge>
                          <Switch
                            checked={integration.active}
                            onCheckedChange={() => void toggleIntegration(integration.id)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Last sync:{" "}
                            {integration.lastSync?.toLocaleString() || "Never"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editIntegration(integration)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteIntegration(integration.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {integrations.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No integrations configured
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Connect with your favorite tools to enhance your SEO
                      workflow.
                    </p>
                    <Button
                      onClick={() => setShowIntegrationDialog(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Integration
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Webhook Dialog */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "Edit Webhook" : "Create New Webhook"}
              </DialogTitle>
              <DialogDescription>
                Webhooks send HTTP POST requests to your endpoint when specific
                events occur.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="webhookName">Webhook Name</Label>
                <Input
                  id="webhookName"
                  value={webhookForm.name}
                  onChange={(e) =>
                    setWebhookForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g., Report Notifications"
                />
              </div>

              <div>
                <Label htmlFor="webhookUrl">Endpoint URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) =>
                    setWebhookForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://api.yourapp.com/webhooks/rankpilot"
                />
              </div>

              <div>
                <Label>Events to Subscribe</Label>
                <div className="grid gap-2 mt-2 max-h-40 overflow-y-auto">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div
                      key={event.value}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={event.value}
                        checked={webhookForm.events.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebhookForm((prev) => ({
                              ...prev,
                              events: [...prev.events, event.value],
                            }));
                          } else {
                            setWebhookForm((prev) => ({
                              ...prev,
                              events: prev.events.filter(
                                (ev) => ev !== event.value
                              ),
                            }));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <Label htmlFor={event.value} className="text-sm">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowWebhookDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleWebhookSubmit()}>
                {editingWebhook ? "Update Webhook" : "Create Webhook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Integration Dialog */}
        <Dialog
          open={showIntegrationDialog}
          onOpenChange={setShowIntegrationDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIntegration
                  ? "Edit Integration"
                  : "Create New Integration"}
              </DialogTitle>
              <DialogDescription>
                Connect with third-party services to enhance your SEO workflow.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="integrationName">Integration Name</Label>
                <Input
                  id="integrationName"
                  value={integrationForm.name}
                  onChange={(e) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g., Slack Notifications"
                />
              </div>

              <div>
                <Label htmlFor="integrationType">Integration Type</Label>
                <Select
                  value={integrationForm.type}
                  onValueChange={(value: Integration["type"]) =>
                    setIntegrationForm((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select integration type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          <div>
                            <div>{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="integrationDescription">Description</Label>
                <Textarea
                  id="integrationDescription"
                  value={integrationForm.description}
                  onChange={(e) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this integration does..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowIntegrationDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleIntegrationSubmit()}>
                {editingIntegration
                  ? "Update Integration"
                  : "Create Integration"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </FeatureGate>
  );
}
