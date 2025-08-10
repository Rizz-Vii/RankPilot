"use client";
import React from 'react';
import { useSalesContext } from '../_parts/sales-context';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function StageVelocity() {
  const { data } = useSalesContext();
  const velocity = data?.velocity || [];
  const max = Math.max(...velocity.map(v=> v.days), 1);
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stage Velocity (Days)</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={velocity} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis type="number" domain={[0, max*1.1]} hide />
            <YAxis type="category" dataKey="stage" width={28} tick={{ fontSize: 10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="days" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Lower is faster; monitor long tails.</p>
    </div>
  );
}
