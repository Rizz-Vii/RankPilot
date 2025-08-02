/**
 * Enhanced NeuroSEO™ Analysis Components
 * Advanced UI components for multi-engine analysis visualization
 */

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActionableTask,
  CompetitivePositioning,
  KeyInsight,
  NeuroSEOReport
} from "@/lib/neuroseo";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Brain,
  CheckCircle,
  Edit,
  Eye,
  Lightbulb,
  RefreshCw,
  Search,
  Shield,
  Star,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import React, { useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";

// Engine status icons and colors
const ENGINE_CONFIGS = {
  neuralCrawler: {
    icon: Search,
    name: "NeuralCrawler™",
    color: "hsl(var(--chart-1))",
    description: "Intelligent web content extraction",
  },
  semanticMap: {
    icon: Brain,
    name: "SemanticMap™",
    color: "hsl(var(--chart-2))",
    description: "Advanced NLP analysis",
  },
  aiVisibility: {
    icon: Eye,
    name: "AI Visibility Engine",
    color: "hsl(var(--chart-3))",
    description: "LLM citation tracking",
  },
  trustBlock: {
    icon: Shield,
    name: "TrustBlock™",
    color: "hsl(var(--chart-4))",
    description: "E-A-T optimization",
  },
  rewriteGen: {
    icon: Edit,
    name: "RewriteGen™",
    color: "hsl(var(--chart-5))",
    description: "AI-powered content rewriting",
  },
  orchestrator: {
    icon: TrendingUp,
    name: "Orchestrator",
    color: "hsl(var(--primary))",
    description: "Unified analysis pipeline",
  },
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

// Real-time analysis progress component
export function NeuroSEOProgressIndicator({
  isAnalyzing,
  currentEngine,
  progress,
  completedEngines
}: {
  isAnalyzing: boolean;
  currentEngine?: string;
  progress: number;
  completedEngines: string[];
}) {
  if (!isAnalyzing && completedEngines.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isAnalyzing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          NeuroSEO™ Analysis Progress
        </CardTitle>
        <CardDescription>
          {isAnalyzing
            ? `Processing with ${currentEngine || "Multi-Engine Analysis"}...`
            : "Analysis Complete"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(ENGINE_CONFIGS).map(([_key, config]) => {
              const Icon = config.icon;
              const isCompleted = completedEngines.includes(_key);
              const isCurrent = currentEngine === key;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0.5 }}
                  animate={{
                    opacity: isCompleted || isCurrent ? 1 : 0.5,
                    scale: isCurrent ? 1.05 : 1
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${isCompleted
                      ? "bg-green-50 border-green-200"
                      : isCurrent
                        ? "bg-blue-50 border-blue-200 animate-pulse"
                        : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <Icon className={`h-3 w-3 ${isCompleted
                      ? "text-green-600"
                      : isCurrent
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`} />
                  <span className={`text-xs font-medium ${isCompleted
                      ? "text-green-700"
                      : isCurrent
                        ? "text-blue-700"
                        : "text-gray-500"
                    }`}>
                    {config.name}
                  </span>
                  {isCompleted && <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />}
                  {isCurrent && <RefreshCw className="h-3 w-3 text-blue-500 animate-spin ml-auto" />}
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced multi-engine overview component
export function NeuroSEOEngineOverview({ report }: { report: NeuroSEOReport; }) {
  const engineData = Object.entries(ENGINE_CONFIGS).map(([_key, config]) => ({
    name: config.name,
    score: Math.round(Math.random() * 40 + 60), // Mock data for now
    icon: config.icon,
    color: config.color,
    description: config.description,
  }));

  const radarData = engineData.map(engine => ({
    subject: engine.name.replace('™', ''),
    score: engine.score,
    fullMark: 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          NeuroSEO™ Engine Performance
        </CardTitle>
        <CardDescription>
          Multi-engine analysis results from {engineData.length} AI engines
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={0} domain={[0, 100]} />
                <Radar
                  name="Engine Performance"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Engine Details */}
          <div className="space-y-3">
            {engineData.map((engine, _index) => {
              const Icon = engine.icon;
              return (
                <motion.div
                  key={engine.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" style={{ color: engine.color }} />
                    <div>
                      <div className="font-medium">{engine.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {engine.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{engine.score}</div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced insights visualization
export function NeuroSEOInsightsPanel({ insights }: { insights: KeyInsight[]; }) {
  const impactColors = {
    critical: "destructive",
    high: "orange",
    medium: "yellow",
    low: "secondary",
  };

  const categoryIcons = {
    seo: Search,
    content: Edit,
    technical: Zap,
    competitive: TrendingUp,
    trust: Shield,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>
          {insights.length} key insights from comprehensive analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, _index) => {
            const Icon = categoryIcons[insight.category];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Icon className="h-5 w-5 mt-1 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge variant={impactColors[insight.impact] as any}>
                            {insight.impact}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {insight.description}
                        </p>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">
                            💡 Recommendation: {insight.recommendation}
                          </p>
                        </div>
                        {insight.evidence.length > 0 && (
                          <Accordion type="single" collapsible className="mt-3">
                            <AccordionItem value="evidence">
                              <AccordionTrigger className="text-sm">
                                View Evidence ({insight.evidence.length} items)
                              </AccordionTrigger>
                              <AccordionContent>
                                <ul className="list-disc pl-4 space-y-1">
                                  {insight.evidence.map((evidence, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground">
                                      {evidence}
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced actionable tasks component
export function NeuroSEOActionableTasks({ tasks }: { tasks: ActionableTask[]; }) {
  const [filter, setFilter] = useState<string>("all");

  const priorityColors = {
    urgent: "destructive",
    high: "orange",
    medium: "yellow",
    low: "secondary",
  };

  const filteredTasks = filter === "all"
    ? tasks
    : tasks.filter(task => task.priority === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Actionable Tasks
        </CardTitle>
        <CardDescription>
          Prioritized recommendations with impact estimates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="urgent">Urgent</TabsTrigger>
              <TabsTrigger value="high">High</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="low">Low</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-4">
          {filteredTasks.map((task, _index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityColors[task.priority] as any}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline">{task.category}</Badge>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">Impact: {task.estimatedImpact}/10</div>
                      <div className="text-muted-foreground">{task.timeframe}</div>
                    </div>
                  </div>

                  <h4 className="font-semibold mb-2">{task.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {task.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>Effort: {task.estimatedEffort}</span>
                    <span>•</span>
                    <span>Dependencies: {task.dependencies.length}</span>
                    <span>•</span>
                    <span>Resources: {task.resources.length}</span>
                  </div>

                  {task.resources.length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="resources">
                        <AccordionTrigger className="text-sm">
                          View Resources ({task.resources.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-2">
                            {task.resources.map((resource, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                <Badge variant="outline" className="text-xs">
                                  {resource.type}
                                </Badge>
                                <span className="text-sm">{resource.title}</span>
                                {resource.url && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                      View
                                    </a>
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Competitive intelligence dashboard
export function NeuroSEOCompetitiveDashboard({
  positioning
}: {
  positioning?: CompetitivePositioning;
}) {
  if (!positioning) return null;

  const swotData = [
    { name: "Strengths", _value: positioning.strengths.length, color: COLORS[0] },
    { name: "Weaknesses", _value: positioning.weaknesses.length, color: COLORS[1] },
    { name: "Opportunities", _value: positioning.opportunities.length, color: COLORS[2] },
    { name: "Threats", _value: positioning.threats.length, color: COLORS[3] },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Competitive Intelligence
        </CardTitle>
        <CardDescription>
          SWOT analysis and market positioning insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Ranking Overview */}
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-primary mb-2">
              #{positioning.overallRanking}
            </div>
            <div className="text-muted-foreground">
              out of {positioning.totalCompetitors} competitors
            </div>
          </div>

          {/* SWOT Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={swotData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {swotData.map((entry, _index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SWOT Details */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
              <ul className="space-y-1">
                {positioning.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <ArrowUp className="h-3 w-3 text-green-500" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Opportunities</h4>
              <ul className="space-y-1">
                {positioning.opportunities.map((opportunity, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <Star className="h-3 w-3 text-blue-500" />
                    {opportunity}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-orange-700 mb-2">Weaknesses</h4>
              <ul className="space-y-1">
                {positioning.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <ArrowDown className="h-3 w-3 text-orange-500" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-red-700 mb-2">Threats</h4>
              <ul className="space-y-1">
                {positioning.threats.map((threat, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    {threat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">Strategic Recommendations</h4>
          <ul className="space-y-2">
            {positioning.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Tier-based feature gate component
export function NeuroSEOFeatureGate({
  children,
  requiredTier,
  currentTier,
  featureName
}: {
  children: React.ReactNode;
  requiredTier: string;
  currentTier: string;
  featureName: string;
}) {
  const tierLevels = {
    free: 0,
    starter: 1,
    agency: 2,
    enterprise: 3,
    admin: 4
  };

  const hasAccess = tierLevels[currentTier as keyof typeof tierLevels] >=
    tierLevels[requiredTier as keyof typeof tierLevels];

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <Card className="opacity-60">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">{featureName} - Premium Feature</h3>
          <p className="text-muted-foreground mb-4">
            Upgrade to {requiredTier} tier to access this feature
          </p>
          <Button variant="outline">
            Upgrade Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
