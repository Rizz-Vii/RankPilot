"use client";
import type { SuiteAccent } from "@/context/SuiteAccentContext";
import { cn } from "@/lib/utils";
import React from "react";

type SurfaceVariant = "default" | "subtle" | "elevated";

export interface DashboardSurfaceProps {
  as?: React.ElementType;
  fullHeight?: boolean;
  bleed?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
  role?: string;
  ariaLabel?: string;
  variant?: SurfaceVariant;
  suite?: SuiteAccent;
  [key: string]: unknown; // allow passing arbitrary DOM props
}

export function DashboardSurface({
  as: Tag = "div",
  className,
  children,
  fullHeight,
  bleed,
  ariaLabel,
  variant = "default",
  suite: _suite,
  ...rest
}: DashboardSurfaceProps) {
  const variantClasses =
    variant === "subtle"
      ? "bg-background/50"
      : variant === "elevated"
        ? "bg-background/70 shadow [&_*]:scrollbar-thin"
        : "bg-background/60";
  // Removed full-surface suite gradient; keep neutral subtle background.
  const suiteClasses = "relative overflow-hidden";
  const Element = Tag as React.ElementType;
  return (
    <Element
      className={cn(
        "rounded-xl backdrop-blur-sm supports-[backdrop-filter]:bg-background/50 shadow-sm",
        variantClasses,
        suiteClasses,
        "transition-colors",
        fullHeight && "min-h-[calc(100dvh-8rem)] sm:min-h-[calc(100vh-8rem)]",
        bleed && "-mx-4 md:mx-0",
        className
      )}
      aria-label={ariaLabel}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Element>
  );
}
