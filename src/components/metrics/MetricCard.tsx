"use client";
import { statusBarBg } from "@/lib/metrics/status-colors";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

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
  intent?: "neutral" | "success" | "warning" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  badge?: React.ReactNode; // small badge (target progress, etc.)
  targetValue?: number; // numeric target for inline progress bar
  invertTarget?: boolean; // when lower is better
  "data-testid"?: string; // forwarding for tests
}

const intentStyles: Record<string, string> = {
  neutral: "bg-background/60 border-border",
  success: "bg-success/10 border-success/30",
  warning: "bg-warning/10 border-warning/30",
  danger: "bg-destructive/10 border-destructive/30",
  accent: "bg-primary/5 border-primary/30",
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
  intent = "neutral",
  size = "md",
  badge,
  targetValue,
  invertTarget,
  "data-testid": testId,
}: MetricCardProps) {
  const formattedDelta =
    delta != null
      ? typeof delta === "number"
        ? delta.toFixed(precision)
        : delta
      : null;
  const positive =
    delta != null && typeof delta === "number" ? delta >= 0 : undefined;
  const numericVal =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  const progressPct =
    targetValue != null && !isNaN(numericVal)
      ? invertTarget
        ? numericVal <= targetValue
          ? 100
          : Math.min(100, (targetValue / Math.max(1, numericVal)) * 100)
        : Math.min(100, (numericVal / Math.max(1, targetValue)) * 100)
      : null;
  const progressState =
    progressPct != null
      ? progressPct >= 100
        ? "on"
        : progressPct >= 75
          ? "near"
          : "far"
      : null;

  return (
    <motion.div
      layout
      data-testid={testId}
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 flex flex-col gap-2 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md focus-within:shadow-md",
        intentStyles[intent],
        size === "sm" && "p-3",
        size === "lg" && "p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate flex items-center gap-1">
            {label} {badge}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-semibold tabular-nums leading-none">
              {loading ? "—" : value}
            </span>
            {formattedDelta !== null && (
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded-md border backdrop-blur-sm",
                  positive === true &&
                    "text-success-foreground border-success/30 bg-success/10",
                  positive === false &&
                    "text-destructive-foreground border-destructive/30 bg-destructive/10"
                )}
              >
                {positive === true ? "▲" : positive === false ? "▼" : ""}{" "}
                {formattedDelta}%
              </span>
            )}
          </div>
          {deltaLabel && (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              {deltaLabel}
            </p>
          )}
          {progressPct != null && (
            <div
              className="mt-1 flex items-center gap-2 w-full"
              aria-label="Target progress"
            >
              <div className="flex-1 h-1.5 rounded bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    statusBarBg(progressState || "")
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums min-w-[40px] text-right">
                {Math.round(progressPct)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-background/50 border text-muted-foreground shrink-0">
            {icon}
          </div>
        )}
      </div>
      {trend && <div className="h-12 -mx-1">{trend}</div>}
      {footer && (
        <div className="pt-1 mt-auto text-xs text-muted-foreground/80">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
