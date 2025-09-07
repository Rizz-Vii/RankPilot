"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer } from "@/components/ui/chart";
import { KeyRound } from "lucide-react";
import { PolarGrid, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

const lineChartConfig = {
  score: { label: "Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export interface KeywordVisibilityChartProps {
  visibility:
    | { score: number; top10: number; top3: number; top100: number }
    | undefined;
}

export function KeywordVisibilityChart({
  visibility,
}: KeywordVisibilityChartProps) {
  const data = [
    {
      name: "Visibility",
      value: visibility?.score || 0,
      fill: "var(--color-score)",
    },
  ];
  return (
    <Card data-testid="chart-keyword-visibility">
      <CardHeader>
        <CardTitle className="font-headline">Keyword Visibility</CardTitle>
        <CardDescription>
          Your share of tracked SERP clicks.{" "}
          <span className="text-muted-foreground/70">
            Own more results, siphon more traffic.
          </span>
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
              <RadialBar background dataKey="value" cornerRadius={10} />
              <PolarGrid gridType="circle" radialLines={false} stroke="none" />
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
              <p className="text-sm">Track keywords to see this fill up</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default KeywordVisibilityChart;
