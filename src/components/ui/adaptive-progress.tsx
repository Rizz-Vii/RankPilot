"use client";
import React from 'react';
import { cn } from '@/lib/utils';
import { statusBarBg } from '@/lib/metrics/status-colors';

export interface AdaptiveProgressProps {
  value: number; // percent 0-100
  thresholds?: { good: number; warn: number }; // boundaries (good>=, warn>=)
  invert?: boolean; // when lower is better (e.g., days)
  className?: string;
  'aria-label'?: string;
}

export const AdaptiveProgress: React.FC<AdaptiveProgressProps> = ({ value, thresholds = { good: 90, warn: 70 }, invert = false, className, ...rest }) => {
  const pct = Math.max(0, Math.min(100, value));
  const state = (() => {
    if (invert) {
      if (pct <= thresholds.good) return 'good';
      if (pct <= thresholds.warn) return 'warn';
      return 'bad';
    }
    if (pct >= thresholds.good) return 'good';
    if (pct >= thresholds.warn) return 'warn';
    return 'bad';
  })();
  const color = statusBarBg(state);
  return (
    <div className={cn('relative h-2 rounded-full bg-muted overflow-hidden', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} {...rest}>
      <div className={cn('h-full transition-all duration-500 ease-out', color)} style={{ width: `${pct}%` }} />
    </div>
  );
};
