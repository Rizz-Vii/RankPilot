"use client";
import React from 'react';
import { useSalesContext } from './sales-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props { open: boolean; onOpenChange: (open: boolean)=>void; }
export function ForecastVarianceModal({ open, onOpenChange }: Props) {
  const { data } = useSalesContext();
  const rows = data?.forecastSeries || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Forecast Variance Detail</DialogTitle>
          <DialogDescription>Weekly forecast vs actual values with variance %.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[420px] pr-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="py-1 text-left">Period</th>
                <th className="py-1 text-right">Forecast</th>
                <th className="py-1 text-right">Actual</th>
                <th className="py-1 text-right">Variance%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>{
                const variance = r.forecast ? ((r.actual - r.forecast)/r.forecast)*100 : 0;
                const good = Math.abs(variance) <= 10; // within 10%
                return (
                  <tr key={i} className="border-b last:border-none">
                    <td className="py-1 pr-2 font-medium">{r.label}</td>
                    <td className="py-1 text-right tabular-nums">{r.forecast.toLocaleString()}</td>
                    <td className="py-1 text-right tabular-nums">{r.actual.toLocaleString()}</td>
                    <td className={`py-1 text-right tabular-nums ${good? 'text-success-foreground':'text-warning-foreground'}`}>{variance.toFixed(1)}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">No forecast data.</td></tr>}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
