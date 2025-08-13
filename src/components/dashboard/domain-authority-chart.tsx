"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { ShieldCheck } from "lucide-react";
import { LineChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";

const lineChartConfig = { score: { label: "Score", color: "hsl(var(--chart-1))" } } satisfies ChartConfig;

export interface DomainAuthorityChartProps { data: { history: Array<{ date: string; score: number }>; score: number } | undefined }

export function DomainAuthorityChart({ data }: DomainAuthorityChartProps) {
  return (
    <Card data-testid="chart-domain-authority">
      <CardHeader>
        <CardTitle className="font-headline">Domain Authority</CardTitle>
        <CardDescription>Authority score trend. <span className="text-muted-foreground/70">Proxy for trust + backlink quality.</span></CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.history && data.history.length > 0 ? (
          <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
            <LineChart data={data.history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short" })} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
              <ChartTooltip cursor={false} content={(props) => <ChartTooltipContent {...props} indicator="line" />} />
              <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No domain authority data yet</p>
              <p className="text-sm">Run an SEO audit to track authority</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DomainAuthorityChart;
