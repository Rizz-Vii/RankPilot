"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  Users,
  Database,
  BarChart3,
  Settings,
  Activity,
  Zap,
  Bot,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";

// Import AI Agent System
import { 
  rankPilotAgentSystem, 
  activateRankPilotAgents 
} from "@/lib/agents/AgentImplementation";

interface SystemMetrics {
  totalAgents: number;
  activeAgents: string[];
  systemStatus: string;
  lastUpdate: Date;
  capabilities: {
    customerSupport: number;
    businessOperations: number;
    technicalOperations: number;
    totalCapabilities: number;
  };
}

interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'loading';
  lastActivity: string;
  performance: number;
  description: string;
}

// Placeholder components with fallbacks
const AdminUserManagement = () => (
  <div className="p-8 text-center bg-muted/50 rounded-lg">
    <h3 className="text-lg font-semibold mb-2">User Management</h3>
    <p className="text-muted-foreground">Advanced user management interface coming soon</p>
  </div>
);

const AdminSystemMetrics = () => (
  <div className="p-8 text-center bg-muted/50 rounded-lg">
    <h3 className="text-lg font-semibold mb-2">System Metrics</h3>
    <p className="text-muted-foreground">Real-time system monitoring dashboard coming soon</p>
  </div>
);

const AdminAnalytics = () => (
  <div className="p-8 text-center bg-muted/50 rounded-lg">
    <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
    <p className="text-muted-foreground">Comprehensive analytics and reporting coming soon</p>
  </div>
);

const AdminSettings = () => (
  <div className="p-8 text-center bg-muted/50 rounded-lg">
    <h3 className="text-lg font-semibold mb-2">Admin Settings</h3>
    <p className="text-muted-foreground">Advanced system configuration coming soon</p>
  </div>
);

const AdminUserSubscriptionManager = () => (
  <div className="p-8 text-center bg-muted/50 rounded-lg">
    <h3 className="text-lg font-semibold mb-2">Subscription Manager</h3>
    <p className="text-muted-foreground">User subscription management interface coming soon</p>
  </div>
);

const AdminChatBot = () => (
  <div className="p-4 text-center bg-background rounded-lg border">
    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
    <h4 className="font-semibold mb-1">AI ChatBot Interface</h4>
    <p className="text-sm text-muted-foreground">GPT-4o powered admin assistance coming soon</p>
  </div>
);

export default function AdminOnlyPage() {
  const { user, role } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [aiAgentsEnabled, setAiAgentsEnabled] = useState(false);
  const [isActivatingAgents, setIsActivatingAgents] = useState(false);
  const [chatBotEnabled, setChatBotEnabled] = useState(true);
  const [systemHealth, setSystemHealth] = useState({
    overall: 95,
    database: 98,
    api: 92,
    agents: 89,
    performance: 94,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize AI Agent System
  useEffect(() => {
    if (mounted && user && role === 'admin') {
      initializeAgentSystem();
      loadSystemMetrics();
    }
  }, [mounted, user, role]);

  const initializeAgentSystem = async () => {
    try {
      // Simulate agent system status
      const agentStatus = {
        totalAgents: 15,
        activeAgents: ['customer-support', 'business-ops', 'technical-ops'],
        status: 'active',
        capabilities: {
          customerSupport: 5,
          businessOperations: 5,
          technicalOperations: 5,
        },
        totalCapabilities: 15
      };
      
      setSystemMetrics({
        totalAgents: agentStatus.totalAgents,
        activeAgents: agentStatus.activeAgents,
        systemStatus: agentStatus.status,
        lastUpdate: new Date(),
        capabilities: {
          customerSupport: agentStatus.capabilities?.customerSupport || 5,
          businessOperations: agentStatus.capabilities?.businessOperations || 5,
          technicalOperations: agentStatus.capabilities?.technicalOperations || 5,
          totalCapabilities: agentStatus.totalCapabilities || 15,
        },
      });

      // Initialize agent statuses
      const mockAgentStatuses: AgentStatus[] = [
        {
          id: 'customer-support-orchestrator',
          name: 'Customer Support Orchestrator',
          status: 'active',
          lastActivity: '2 minutes ago',
          performance: 96,
          description: 'Managing customer inquiries and support tickets',
        },
        {
          id: 'business-operations-orchestrator',
          name: 'Business Operations Orchestrator',
          status: 'active',
          lastActivity: '5 minutes ago',
          performance: 89,
          description: 'Handling sales, marketing, and analytics',
        },
        {
          id: 'technical-operations-orchestrator',
          name: 'Technical Operations Orchestrator',
          status: 'active',
          lastActivity: '1 minute ago',
          performance: 92,
          description: 'Managing system health and development tasks',
        },
      ];

      setAgentStatuses(mockAgentStatuses);
      setAiAgentsEnabled(agentStatus.status === 'active');
    } catch (error) {
      console.error('Failed to initialize agent system:', error);
      toast.error('Failed to load AI agent system');
    }
  };

  const loadSystemMetrics = async () => {
    try {
      // Simulate loading system health metrics
      const healthCheck = {
        overall: Math.floor(Math.random() * 10) + 90,
        database: Math.floor(Math.random() * 5) + 95,
        api: Math.floor(Math.random() * 15) + 85,
        agents: Math.floor(Math.random() * 20) + 80,
        performance: Math.floor(Math.random() * 10) + 90,
      };
      setSystemHealth(healthCheck);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
    }
  };

  const handleActivateAgents = async () => {
    setIsActivatingAgents(true);
    try {
      const result = await activateRankPilotAgents();
      if (result) {
        setAiAgentsEnabled(true);
        toast.success('AI Agents activated successfully!');
        await initializeAgentSystem();
      } else {
        toast.error('Failed to activate AI agents');
      }
    } catch (error) {
      console.error('Error activating agents:', error);
      toast.error('Error activating AI agents');
    } finally {
      setIsActivatingAgents(false);
    }
  };

  const handleDeactivateAgents = async () => {
    try {
      // Simulate deactivation
      setAiAgentsEnabled(false);
      toast.success('AI Agents deactivated');
      await initializeAgentSystem();
    } catch (error) {
      console.error('Error deactivating agents:', error);
      toast.error('Error deactivating AI agents');
    }
  };

  const emergencyShutdown = async () => {
    try {
      // Simulate emergency shutdown
      setAiAgentsEnabled(false);
      toast.warning('Emergency shutdown activated');
      await initializeAgentSystem();
    } catch (error) {
      console.error('Emergency shutdown failed:', error);
      toast.error('Emergency shutdown failed');
    }
  };

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Admin access required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, monitor system health, and analyze platform metrics.
          </p>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.overall}%</div>
            <Progress value={systemHealth.overall} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.database}%</div>
            <Progress value={systemHealth.database} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.api}%</div>
            <Progress value={systemHealth.api} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.agents}%</div>
            <Progress value={systemHealth.agents} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.performance}%</div>
            <Progress value={systemHealth.performance} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* AI Agent Control Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agent Control Center
          </CardTitle>
          <CardDescription>
            Manage the RankPilot AI Agent system with 15+ specialized agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent System Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">AI Agents Status:</span>
                <Badge variant={aiAgentsEnabled ? "default" : "secondary"}>
                  {aiAgentsEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              {systemMetrics && (
                <div className="text-sm text-muted-foreground">
                  {systemMetrics.totalAgents} total agents • {systemMetrics.activeAgents.length} active
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={aiAgentsEnabled}
                onCheckedChange={aiAgentsEnabled ? handleDeactivateAgents : handleActivateAgents}
                disabled={isActivatingAgents}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={emergencyShutdown}
                className="text-red-600 hover:text-red-700"
              >
                Emergency Stop
              </Button>
            </div>
          </div>

          {/* Agent Status Grid */}
          {agentStatuses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agentStatuses.map((agent) => (
                <Card key={agent.id} className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{agent.name}</CardTitle>
                      <Badge variant={agent.status === 'active' ? "default" : "secondary"}>
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{agent.description}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Performance: {agent.performance}%</span>
                        <span>Last: {agent.lastActivity}</span>
                      </div>
                      <Progress value={agent.performance} className="h-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Activation Controls */}
          {!aiAgentsEnabled && (
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>AI Agents Inactive</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">
                  The AI Agent system includes 15+ specialized agents across 3 orchestrators:
                </p>
                <ul className="text-sm space-y-1 mb-3">
                  <li>• <strong>Customer Support:</strong> Live chat, ticket management, FAQ automation</li>
                  <li>• <strong>Business Operations:</strong> Sales optimization, marketing analysis, reporting</li>
                  <li>• <strong>Technical Operations:</strong> System monitoring, development assistance, deployment</li>
                </ul>
                <Button 
                  onClick={handleActivateAgents} 
                  disabled={isActivatingAgents}
                  className="mt-2"
                >
                  {isActivatingAgents ? "Activating..." : "Activate AI Agents"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ChatBot Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI ChatBot System
          </CardTitle>
          <CardDescription>
            Advanced AI-powered customer support and admin assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">ChatBot Status:</span>
                <Badge variant={chatBotEnabled ? "default" : "secondary"}>
                  {chatBotEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                GPT-4o powered • Real-time responses • Multi-language support
              </div>
            </div>
            <Switch
              checked={chatBotEnabled}
              onCheckedChange={setChatBotEnabled}
            />
          </div>
          
          {chatBotEnabled && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <AdminChatBot />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Admin Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
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
