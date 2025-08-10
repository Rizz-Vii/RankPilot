"use client";
// Dev safeguard against accidental circular dynamic import loops.
import { registerModuleLoad } from '@/lib/dev/module-load-guard';
registerModuleLoad(undefined, { label: 'seo-score-trend' });
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Activity } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const lineChartConfig = {
  score: { label: "Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export interface SeoScoreTrendProps { data: Array<{ date: string; score: number }>; rangeLabel?: string }

export function SeoScoreTrend({ data, rangeLabel }: SeoScoreTrendProps) {
  return (
    <Card data-testid="chart-seo-score-trend">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">Overall SEO Score {rangeLabel && <span className="text-xs font-normal text-muted-foreground">({rangeLabel})</span>}</CardTitle>
        <CardDescription>Your site's SEO score trend from NeuroSEO™ analyses. <span className="text-muted-foreground/70">Higher = stronger search health.</span></CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={(props) => <ChartTooltipContent {...props} indicator="line" />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot />
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
}

export default SeoScoreTrend;
