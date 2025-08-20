/**
 * Recharts components and shadcn/ui chart components
 * Re-export from recharts for consistent usage and provide small,
 * well-typed compatibility stubs for the design system.
 */

import React from 'react';
import { Tooltip as RechartsTooltip, type TooltipProps } from 'recharts';

export { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

export type ChartConfig = unknown;

export const ChartContainer: React.FC<{
  children: React.ReactNode;
  config?: ChartConfig;
  className?: string;
}> = ({ children, config, className = '' }) => {
  // config is intentionally unused in this stub but kept for API compatibility
  void config;
  return <div className={`chart-container ${className}`}>{children}</div>;
};

export interface SimpleTooltipPayload {
  label?: string;
  value?: string | number;
}

export const ChartTooltip: React.FC<{
  content: (props: TooltipProps<any, any>) => React.ReactNode;
  className?: string;
}> = ({ content, className = '' }) => {
  return <RechartsTooltip content={content} wrapperClassName={className} />;
};

export const ChartTooltipContent = (raw: unknown): JSX.Element => {
  const props = raw as { payload?: Array<{ value?: unknown }>; label?: React.ReactNode } | undefined;
  const first = Array.isArray(props?.payload) ? props!.payload[0] : undefined;
  const value = first?.value ?? '';
  return (
    <div className="chart-tooltip text-xs">
      {props?.label ?? ''}: {String(value)}
    </div>
  );
};

// Alert components

export const AlertCircle: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 24,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
    role="img"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Simple Progress stub to maintain backward compatibility after refactor
export const Progress: React.FC<{ value?: number; className?: string }> = ({
  value = 0,
  className = '',
}) => {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className={`w-full h-2 rounded bg-muted overflow-hidden ${className}`}>
      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
};
