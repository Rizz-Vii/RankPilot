"use client";
import React from 'react';
import { useFinanceContext } from './finance-context';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

export default function MrrTrend(){
  const { data } = useFinanceContext();
  const series = data?.mrrSeries || [];
  const max = Math.max(...series.map(s=> s.mrr), 0);
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">MRR Trend</h3>
      <div className="flex-1">
        <ChartContainer config={{}} className="h-full w-full">
          <LineChart data={series} margin={{ top:4, right:8, left:0, bottom:4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tick={{ fontSize:10 }} />
            <YAxis domain={[0, max*1.1]} tick={{ fontSize:10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize:12 }} />
            <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Monthly recurring revenue trajectory.</p>
    </div>
  );
}
