"use client";
import React from 'react';
import { useFinanceContext } from './finance-context';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';

export default function InvoiceAging(){
  const { data } = useFinanceContext();
  const aging = data?.aging || [];
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Invoice Aging</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={aging} margin={{ top:4,right:8,left:0,bottom:4 }}>
            <XAxis dataKey="bucket" tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize:12 }} />
            <Bar dataKey="amount" fill="hsl(var(--primary)/0.3)">
              <LabelList dataKey="count" position="top" className="text-[10px]" />
              {aging.map((a,i)=>(<Cell key={a.bucket} fill={`hsl(var(--primary)/${0.25 + (0.5*(i/Math.max(1,aging.length-1)))})`} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Amount by days past due; labels show invoice count.</p>
    </div>
  );
}
