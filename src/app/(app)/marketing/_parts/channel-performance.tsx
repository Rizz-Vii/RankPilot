"use client";
import React from 'react';
import { useMarketingContext } from './marketing-context';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';

export default function ChannelPerformance(){
  const { data } = useMarketingContext();
  const rows = data?.channelPerformance || [];
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Channel Performance (Leads)</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top:4,right:8,left:0,bottom:4 }}>
            <XAxis dataKey="channel" tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize:12 }} />
            <Bar dataKey="leads" fill="hsl(var(--primary)/0.4)">
              <LabelList dataKey="roi" position="top" className="text-[10px]" formatter={(v: any)=> `${v.toFixed?.(0)}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Leads by channel; labels show ROI %.</p>
    </div>
  );
}
