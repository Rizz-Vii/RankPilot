"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Link as LinkIcon } from "lucide-react";
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts";

const barChartConfig = {
  new: { label: "New", color: "hsl(var(--chart-1))" },
  lost: { label: "Lost", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export interface BacklinksChartProps { data: { history: Array<{ month: string; new: number; lost: number }>; } | undefined }

export function BacklinksChart({ data }: BacklinksChartProps) {
  return (
    <Card data-testid="chart-backlinks">
      <CardHeader>
        <CardTitle className="font-headline">Backlink Growth</CardTitle>
        <CardDescription>New vs. lost backlinks. <span className="text-muted-foreground/70">Links = reputation fuel.</span></CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.history && data.history.length > 0 ? (
          <ChartContainer config={barChartConfig} className="h-[200px] w-full">
            <BarChart data={data.history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip cursor={false} content={(props) => <ChartTooltipContent {...props} indicator="line" />} />
              <Bar dataKey="new" fill="var(--color-new)" radius={4} />
              <Bar dataKey="lost" fill="var(--color-lost)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No backlink data yet</p>
              <p className="text-sm">Run a link analysis to track growth</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BacklinksChart;
