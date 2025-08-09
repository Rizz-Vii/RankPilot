"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface KPIGridProps extends React.HTMLAttributes<HTMLDivElement> {
  skeletonCount?: number;
  loading?: boolean;
  skeleton?: React.ReactNode;
}

// Shared responsive KPI grid wrapper to enforce consistent layout across dashboards
export function KPIGrid({
  className,
  children,
  skeletonCount = 4,
  loading,
  skeleton,
  ...rest
}: KPIGridProps) {
  if (loading && skeleton) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4",
          className
        )}
        {...rest}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <React.Fragment key={i}>{skeleton}</React.Fragment>
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default KPIGrid;
