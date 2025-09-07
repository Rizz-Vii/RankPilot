"use client";
import styles from "@/app/(app)/dashboard/dashboard.module.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Activity } from "lucide-react";
import { Cell, Legend, Pie, PieChart } from "recharts";

const pieChartConfig = {
  sources: { label: "Traffic Sources" },
  "Organic Search": { label: "Organic", color: "hsl(var(--chart-1))" },
  Direct: { label: "Direct", color: "hsl(var(--chart-2))" },
  Referral: { label: "Referral", color: "hsl(var(--chart-3))" },
  Social: { label: "Social", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const getChartColorClass = (colorValue: string, label?: string): string => {
  const map: Record<string, string> = {
    "hsl(var(--chart-1))": styles.legendDotChart1,
    "hsl(var(--chart-2))": styles.legendDotChart2,
    "hsl(var(--chart-3))": styles.legendDotChart3,
    "hsl(var(--chart-4))": styles.legendDotChart4,
    "hsl(var(--chart-5))": styles.legendDotChart5,
  };
  if (map[colorValue]) return map[colorValue];
  // Fallback by label mapping
  const byLabel: Record<string, string> = {
    "Organic Search": styles.legendDotChart1,
    Direct: styles.legendDotChart2,
    Referral: styles.legendDotChart3,
    Social: styles.legendDotChart4,
  };
  if (label && byLabel[label]) return byLabel[label];
  return styles.legendDotChart1;
};

export interface TrafficSourcesChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
}

export function TrafficSourcesChart({ data }: TrafficSourcesChartProps) {
  return (
    <Card data-testid="chart-traffic-sources">
      <CardHeader>
        <CardTitle className="font-headline">Traffic Sources</CardTitle>
        <CardDescription>
          Estimated traffic source breakdown.{" "}
          <span className="text-muted-foreground/70">
            Diversified = resilient growth.
          </span>
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
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Legend
                content={({ payload }) => (
                  <div className={styles.legendContainer}>
                    {payload?.map((entry) => (
                      <div key={entry.value} className={styles.legendItem}>
                        <div
                          className={`${styles.legendDot} ${getChartColorClass(entry.color || "", String(entry.value))}`}
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
