"use client";
import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  precision?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  trend?: React.ReactNode; // sparkline element
  footer?: React.ReactNode;
  className?: string;
  intent?: 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  badge?: React.ReactNode; // small badge (target progress, etc.)
}

const intentStyles: Record<string, string> = {
  neutral: 'bg-gradient-to-br from-background to-muted/30 border-border',
  success: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30',
  warning: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30',
  danger: 'bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/30'
};

export function MetricCard({
  label,
  value,
  delta = null,
  deltaLabel,
  precision = 2,
  icon,
  loading = false,
  trend,
  footer,
  className,
  intent = 'neutral',
  size = 'md',
  badge
}: MetricCardProps) {
  const formattedDelta = delta != null ? (typeof delta === 'number' ? delta.toFixed(precision) : delta) : null;
  const positive = delta != null && typeof delta === 'number' ? delta >= 0 : undefined;

  return (
    <motion.div
      layout
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 flex flex-col gap-2 shadow-sm backdrop-blur-sm',
        intentStyles[intent],
        size === 'sm' && 'p-3',
        size === 'lg' && 'p-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate flex items-center gap-1">{label} {badge}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-semibold tabular-nums leading-none">
                {loading ? '—' : value}
              </span>
              {formattedDelta !== null && (
                <span
                  className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded-md border backdrop-blur-sm',
                    positive === true && 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
                    positive === false && 'text-rose-600 border-rose-500/30 bg-rose-500/10'
                  )}
                >
                  {positive === true ? '▲' : positive === false ? '▼' : ''} {formattedDelta}%
                </span>
              )}
            </div>
            {deltaLabel && (
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{deltaLabel}</p>
            )}
        </div>
        {icon && (
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-background/50 border text-muted-foreground shrink-0">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="h-12 -mx-1">{trend}</div>
      )}
      {footer && (
        <div className="pt-1 mt-auto text-xs text-muted-foreground/80">{footer}</div>
      )}
    </motion.div>
  );
}
