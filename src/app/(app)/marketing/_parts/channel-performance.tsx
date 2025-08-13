"use client";
import React from 'react';
import { useMarketingContext } from './marketing-context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

export default function ChannelPerformance(){
  const { data } = useMarketingContext();
  const rows = data?.channelPerformance || [];
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Channel Performance (Leads)</h3>
      <div className="flex-1">
        <ChartContainer config={{}} className="h-full w-full">
          <BarChart data={rows} margin={{ top:4,right:8,left:0,bottom:4 }}>
            <XAxis dataKey="channel" tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize:12 }} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))">
              <LabelList position="top" className="text-xs" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Leads by channel; labels show ROI %.</p>
    </div>
  );
}
