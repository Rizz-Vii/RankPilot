"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface QuotaBarProps {
  used: number;
  limit: number; // -1 = unlimited
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export function QuotaBar({ used, limit, label, className, showLabel = true }: QuotaBarProps) {
  const percent = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const unlimited = limit === -1;
  let color = 'bg-emerald-500';
  if (!unlimited) {
    if (percent > 85) color = 'bg-rose-500';
    else if (percent > 65) color = 'bg-amber-500';
    else if (percent > 40) color = 'bg-blue-500';
  }
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>{label || 'Usage'}</span>
          <span>{unlimited ? `${used} used` : `${used}/${limit}`}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-md bg-muted overflow-hidden">
        {!unlimited && (
          <div className={cn('h-full transition-all duration-500 rounded-md', color)} style={{ width: `${percent}%` }} />
        )}
        {unlimited && <div className="h-full w-full bg-gradient-to-r from-blue-500/40 via-violet-500/40 to-emerald-500/40 animate-pulse" />}
      </div>
    </div>
  );
}
