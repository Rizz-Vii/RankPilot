// src/app/(app)/dashboard/page.tsx
"use client";
import ToolGrid from "@/components/tool-grid";
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
  KeyRound,
  Link as LinkIcon,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
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
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium font-body">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold font-headline">{value}</div>
      {change !== undefined && (
        <p
          className={`text-xs ${change >= 0 ? "text-success" : "text-destructive"}`}
        >
          {change >= 0 ? `+${change}` : change} from last month
        </p>
      )}
    </CardContent>
  </Card>
);

const SeoScoreTrendChart = ({ data }: { data: any[]; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">Overall SEO Score</CardTitle>
      <CardDescription>
        Your site&apos;s SEO score trend over the last 6 weeks.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {data && data.length > 0 ? (
        <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
          
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
      fill: "hsl(var(--chart-1))",
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
        Your domain&apos;s authority score over the last 6 months.
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
        New vs. Lost backlinks over the last 6 months.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {data && data.history && data.history.length > 0 ? (
        <ChartContainer config={barChartConfig} className="h-[200px] w-full">
          
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
        Breakdown of your website traffic sources.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex items-center justify-center">
      {data && data.length > 0 ? (
        <ChartContainer config={pieChartConfig} className="h-[200px] w-full">
          
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
          
        </ChartContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No traffic data yet</p>
            <p className="text-sm">Connect analytics to see traffic sources</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// DEPRECATED BACKUP PAGE (2025-08-11): retained only for reference; slated for removal.
// ----- DUMMY DATA -----

const dummyDashboardData = {
  seoScore: { current: 85, change: 5 },
  trackedKeywords: { current: 1247, change: 23 },
  domainAuthority: { score: 64 },
  backlinks: { total: 1542, newLast30Days: 18 }
};

const dummySeoData = [
  { date: "2024-01-01", score: 78 },
  { date: "2024-02-01", score: 82 },
  { date: "2024-03-01", score: 85 }
];

const dummyTrafficData = [
  { name: "Organic Search", value: 60, fill: "hsl(var(--chart-1))" },
  { name: "Direct", value: 25, fill: "hsl(var(--chart-2))" },
  { name: "Referral", value: 15, fill: "hsl(var(--chart-3))" }
];

const dummyVisibility = { score: 72, top10: 15 };

const dummyDomainData = {
  history: [
    { date: "2024-01-01", score: 60 },
    { date: "2024-02-01", score: 62 },
    { date: "2024-03-01", score: 64 }
  ]
};

const dummyBacklinksData = {
  history: [
    { month: "Jan", new: 25, lost: 8 },
    { month: "Feb", new: 32, lost: 12 },
    { month: "Mar", new: 18, lost: 5 }
  ]
};

// ----- MAIN COMPONENT -----

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: dashboardData, loading: dataLoading, error, refresh } = useRealTimeDashboardData(user?.uid || null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren",
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
        mass: 0.5,
      },
    },
  };

  if (authLoading || dataLoading || !mounted) {
    return <LoadingScreen fullScreen text="Loading dashboard data..." />;
  }

  return (
    <div className={styles.dashboardContainer}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        layoutId="dashboard-header"
      >
        <h1 className="text-3xl font-headline font-semibold text-foreground">
          Welcome, {profile?.displayName || user?.email}!
        </h1>
        <p className="text-muted-foreground font-body">
          Here&apos;s your SEO command center at a glance.
        </p>
      </motion.div>

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
            change={dashboardData?.seoScore.change || 0}
            icon={Activity}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Tracked Keywords"
            value={(dashboardData?.trackedKeywords.current || 0).toLocaleString()}
            change={dashboardData?.trackedKeywords.change || 0}
            icon={KeyRound}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Domain Authority"
            value={String(dashboardData?.domainAuthority.score || 0)}
            change={(dashboardData?.domainAuthority.score || 0) - 52}
            icon={ShieldCheck}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Total Backlinks"
            value={(dashboardData?.backlinks.total || 0).toLocaleString()}
            change={dashboardData?.backlinks.newLast30Days || 0}
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
        <motion.div className={styles.chartMediumSpan} variants={itemVariants}>
          <TrafficSourcesChart data={dashboardData?.trafficSources || []} />
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.chartsGridMedium}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <KeywordVisibilityChart visibility={dashboardData?.keywordVisibility || { score: 0, top10: 0 }} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <BacklinksChart data={dashboardData?.backlinks || { total: 0, newLast30Days: 0, quality: { high: 0, medium: 0, low: 0 } }} />
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.chartsGridMedium}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <DomainAuthorityChart data={dashboardData?.domainAuthority || { score: 0, trend: [] }} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <BacklinksChart data={dashboardData?.backlinks || { total: 0, newLast30Days: 0, quality: { high: 0, medium: 0, low: 0 } }} />
        </motion.div>
      </motion.div>

      {/* Mobile Tool Grid */}
      {isMobile && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className={styles.mobileToolGrid}
        >
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">SEO Tools</CardTitle>
              <CardDescription>
                Quick access to all your SEO analysis tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToolGrid />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
