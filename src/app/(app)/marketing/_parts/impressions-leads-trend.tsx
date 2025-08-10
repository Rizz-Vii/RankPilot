"use client";
import React from 'react';
import { useMarketingContext } from './marketing-context';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function ImpressionsLeadsTrend(){
  const { data } = useMarketingContext();
  const series = data?.trendSeries || [];
  const maxImp = Math.max(...series.map(s=> s.impressions), 0);
  const maxLeads = Math.max(...series.map(s=> s.leads), 0);
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Impressions & Leads Trend</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top:4,right:8,left:0,bottom:4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tick={{ fontSize:10 }} />
            <YAxis yAxisId="imp" domain={[0, maxImp*1.1]} tick={{ fontSize:10 }} />
            <YAxis yAxisId="leads" orientation="right" domain={[0, maxLeads*1.1]} tick={{ fontSize:10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize:12 }} />
            <Legend wrapperStyle={{ fontSize:10 }} />
            <Line type="monotone" yAxisId="imp" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" yAxisId="leads" dataKey="leads" stroke="hsl(var(--primary)/0.6)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Acquisition volume and conversions over selected range.</p>
    </div>
  );
}
