"use client";
import React from "react";
import { useSalesContext } from "../_parts/sales-context";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea,
} from "recharts";

export default function ForecastVariance() {
  const { data } = useSalesContext();
  const series = data?.forecastSeries || [];
  const max = Math.max(...series.map((s) => Math.max(s.forecast, s.actual)), 0);
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Forecast vs Actual
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, max * 1.1]} />
            <Tooltip
              wrapperClassName="!text-xs"
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceArea
              y1={0}
              y2={max}
              strokeOpacity={0}
              fill="hsl(var(--muted)/0.25)"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--emerald-500))"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Compare forecasted vs actual progression.
      </p>
    </div>
  );
}
