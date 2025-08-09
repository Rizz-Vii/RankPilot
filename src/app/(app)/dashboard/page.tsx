// src/app/(app)/dashboard/page.tsx - Complete Dynamic Database Integration
"use client";
import { CoreWebVitalsWidget } from "@/components/performance/core-web-vitals-monitor";
import { ToolPageHeader } from "@/components/tool-page-header";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import ToolGrid from "@/components/tool-grid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { useRealTimeDashboardData } from "@/hooks/use-dashboard-data";
import { useIsMobile } from "@/hooks/use-mobile";
import { Variants, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  KeyRound,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./dashboard.module.css";

// ----- CHART CONFIGS -----

const lineChartConfig = {
  score: { label: "Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const barChartConfig = {
  new: { label: "New", color: "hsl(var(--chart-1))" },
  lost: { label: "Lost", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const pieChartConfig = {
  sources: { label: "Traffic Sources" },
  "Organic Search": { label: "Organic", color: "hsl(var(--chart-1))" },
  Direct: { label: "Direct", color: "hsl(var(--chart-2))" },
  Referral: { label: "Referral", color: "hsl(var(--chart-3))" },
  Social: { label: "Social", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

// ----- ANIMATION VARIANTS -----

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

// ----- UTILITY FUNCTIONS -----

const getChartColorClass = (colorValue: string): string => {
  const colorMap: { [key: string]: string; } = {
    "hsl(var(--chart-1))": styles.legendDotChart1,
    "hsl(var(--chart-2))": styles.legendDotChart2,
    "hsl(var(--chart-3))": styles.legendDotChart3,
    "hsl(var(--chart-4))": styles.legendDotChart4,
    "hsl(var(--chart-5))": styles.legendDotChart5,
  };
  return colorMap[colorValue] || styles.legendDotChart1;
};

// ----- REUSABLE COMPONENTS -----

const DashboardMetricCard: React.FC<{
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
}> = ({ title, value, change, icon: Icon }) => (
  <Card className={styles.metricCard}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && (
          <p
            className={`text-xs ${change >= 0 ? "text-success" : "text-destructive"}`}
          >
            {change >= 0 ? `+${change}` : change} from last month
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

const SeoScoreTrendChart = ({ data }: { data: any[]; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">Overall SEO Score</CardTitle>
      <CardDescription>
        Your site&apos;s SEO score trend from NeuroSEO™ analyses.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {data && data.length > 0 ? (
        <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(val) =>
                  new Date(val).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                tickLine={false}
                axisLine={false}
              />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={false}
                content={(props) => (
                  <ChartTooltipContent {...props} indicator="line" />
                )}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-score)"
                strokeWidth={2}
                dot={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No SEO analysis data yet</p>
            <p className="text-sm">Run your first NeuroSEO™ analysis to see trends</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const KeywordVisibilityChart = ({ visibility }: { visibility: any; }) => {
  const data = [
    {
      name: "Visibility",
      value: visibility?.score || 0,
      fill: "var(--color-score)",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Keyword Visibility</CardTitle>
        <CardDescription>
          Your share of clicks for tracked keywords.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {visibility && (visibility.top10 > 0 || visibility.score > 0) ? (
          <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
            <RadialBarChart
              data={data}
              startAngle={-270}
              endAngle={90}
              innerRadius="70%"
              outerRadius="110%"
              barSize={30}
            >
              <PolarGrid gridType="circle" radialLines={false} stroke="none" />
              <RadialBar background dataKey="value" cornerRadius={10} />
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-4xl font-headline fill-foreground"
              >
                {`${visibility.score}%`}
              </text>
            </RadialBarChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No keyword data yet</p>
              <p className="text-sm">Start tracking keywords to see visibility</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DomainAuthorityChart = ({ data }: { data: any; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">Domain Authority</CardTitle>
      <CardDescription>
        Your domain&apos;s authority score from SEO audits.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {data && data.history && data.history.length > 0 ? (
        <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
          <LineChart
            data={data.history}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(val) =>
                new Date(val).toLocaleDateString("en-US", { month: "short" })
              }
              tickLine={false}
              axisLine={false}
            />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <ChartTooltipContent {...props} indicator="line" />
              )}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-score)"
              strokeWidth={2}
              dot={true}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No domain authority data yet</p>
            <p className="text-sm">Run an SEO audit to track domain authority</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const BacklinksChart = ({ data }: { data: any; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">Backlink Growth</CardTitle>
      <CardDescription>
        New vs. Lost backlinks from link analyses.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {data && data.history && data.history.length > 0 ? (
        <ChartContainer config={barChartConfig} className="h-[200px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={data.history}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={false}
                content={(props) => (
                  <ChartTooltipContent {...props} indicator="line" />
                )}
              />
              <Bar dataKey="new" fill="var(--color-new)" radius={4} />
              <Bar dataKey="lost" fill="var(--color-lost)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No backlink data yet</p>
            <p className="text-sm">Run a link analysis to track backlink growth</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const TrafficSourcesChart = ({ data }: { data: any[]; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">Traffic Sources</CardTitle>
      <CardDescription>
        Estimated traffic source breakdown based on SEO performance.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex items-center justify-center">
      {data && data.length > 0 ? (
        <ChartContainer config={pieChartConfig} className="h-[200px] w-full">
          <ResponsiveContainer>
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={(props) => (
                  <ChartTooltipContent {...props} indicator="line" />
                )}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                strokeWidth={5}
              >
                {data.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Pie>
              <Legend
                content={({ payload }) => (
                  <div className={styles.legendContainer}>
                    {payload?.map((entry) => (
                      <div
                        key={`legend-${entry.value}`}
                        className={styles.legendItem}
                      >
                        <div
                          className={`${styles.legendDot} ${getChartColorClass(entry.color || "")}`}
                        />
                        <span>{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No traffic data available</p>
            <p className="text-sm">Complete SEO analyses to see estimated traffic sources</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// ----- MAIN COMPONENT -----

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  // Use dynamic dashboard data
  const {
    data: dashboardData,
    loading: dataLoading,
    error: dataError,
    refresh
  } = useRealTimeDashboardData(user?.uid || null);

  if (authLoading || !user) {
    return <LoadingScreen />;
  }

  if (dataError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {dataError}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8" data-testid="dashboard-content">
      <ToolPageHeader
        title={`Welcome, ${profile?.displayName || user?.email}!`}
        description="Your SEO command center with real-time data."
        badges={composeToolHeaderBadges("dashboard", null)}
        showBreadcrumb
      >
        {dataLoading && (
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </Button>
        )}
      </ToolPageHeader>

      <motion.div
        className={styles.metricsGrid}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Overall SEO Score"
            value={String(dashboardData?.seoScore.current || 0)}
            change={dashboardData?.seoScore.change}
            icon={Activity}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Tracked Keywords"
            value={(dashboardData?.trackedKeywords.current || 0).toLocaleString()}
            change={dashboardData?.trackedKeywords.change}
            icon={KeyRound}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Domain Authority"
            value={String(dashboardData?.domainAuthority.score || 0)}
            change={dashboardData?.domainAuthority.score ? dashboardData.domainAuthority.score - 52 : 0}
            icon={ShieldCheck}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Total Backlinks"
            value={(dashboardData?.backlinks.total || 0).toLocaleString()}
            change={dashboardData?.backlinks.newLast30Days}
            icon={LinkIcon}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.chartsGridLarge}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className={styles.chartLargeSpan} variants={itemVariants}>
          <SeoScoreTrendChart data={dashboardData?.seoScoreTrend || []} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <TrafficSourcesChart data={dashboardData?.trafficSources || []} />
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.chartsGridSmall}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <KeywordVisibilityChart visibility={dashboardData?.keywordVisibility} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <BacklinksChart data={dashboardData?.backlinks} />
        </motion.div>
      </motion.div>

      {!isMobile && (
        <motion.div
          className={styles.chartsGridLarge}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <DomainAuthorityChart data={dashboardData?.domainAuthority} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BacklinksChart data={dashboardData?.backlinks} />
          </motion.div>
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <ToolGrid />
        </motion.div>
      </motion.div>

      {/* Core Web Vitals Performance Monitoring */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mt-8"
      >
        <motion.div variants={itemVariants}>
          <CoreWebVitalsWidget />
        </motion.div>
      </motion.div>
    </div>
  );
}
