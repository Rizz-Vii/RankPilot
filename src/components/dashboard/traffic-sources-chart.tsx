"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Activity } from "lucide-react";
import { Pie, PieChart, ResponsiveContainer, Cell, Legend } from "recharts";
import styles from "@/app/(app)/dashboard/dashboard.module.css";

const pieChartConfig = {
  sources: { label: "Traffic Sources" },
  "Organic Search": { label: "Organic", color: "hsl(var(--chart-1))" },
  Direct: { label: "Direct", color: "hsl(var(--chart-2))" },
  Referral: { label: "Referral", color: "hsl(var(--chart-3))" },
  Social: { label: "Social", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const getChartColorClass = (colorValue: string): string => {
  const map: Record<string, string> = {
    "hsl(var(--chart-1))": styles.legendDotChart1,
    "hsl(var(--chart-2))": styles.legendDotChart2,
    "hsl(var(--chart-3))": styles.legendDotChart3,
    "hsl(var(--chart-4))": styles.legendDotChart4,
    "hsl(var(--chart-5))": styles.legendDotChart5,
  };
  return map[colorValue] || styles.legendDotChart1;
};

export interface TrafficSourcesChartProps { data: Array<{ name: string; value: number; fill: string }>; }

export function TrafficSourcesChart({ data }: TrafficSourcesChartProps) {
  return (
    <Card data-testid="chart-traffic-sources">
      <CardHeader>
        <CardTitle className="font-headline">Traffic Sources</CardTitle>
        <CardDescription>Estimated traffic source breakdown. <span className="text-muted-foreground/70">Diversified = resilient growth.</span></CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {data && data.length > 0 ? (
          <ChartContainer config={pieChartConfig} className="h-[200px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <ChartTooltip cursor={false} content={(props) => <ChartTooltipContent {...props} indicator="line" />} />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={5}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend content={({ payload }) => (
                  <div className={styles.legendContainer}>
                    {payload?.map((entry) => (
                      <div key={entry.value} className={styles.legendItem}>
                        <div className={`${styles.legendDot} ${getChartColorClass(entry.color || "")}`} />
                        <span>{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No traffic data available</p>
              <p className="text-sm">Complete analyses to see sources</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TrafficSourcesChart;
