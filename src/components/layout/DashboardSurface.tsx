"use client";
import React from 'react';
import { cn } from '@/lib/utils';

type SurfaceVariant = 'default' | 'subtle' | 'elevated';
type SuiteAccent = 'seo' | 'sales' | 'marketing' | 'finance' | 'none';

export interface DashboardSurfaceProps {
  as?: keyof JSX.IntrinsicElements;
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

export function DashboardSurface({ as: Tag = 'div', className, children, fullHeight, bleed, ariaLabel, variant = 'default', suite: _suite, ...rest }: DashboardSurfaceProps) {

  const variantClasses = variant === 'subtle'
    ? 'bg-background/50'
    : variant === 'elevated'
      ? 'bg-background/70 shadow [&_*]:scrollbar-thin'
      : 'bg-background/60';
  // Removed full-surface suite gradient; keep neutral subtle background.
  const suiteClasses = 'relative overflow-hidden';
  const Element = Tag as any;
  return (
    <Element
      className={cn(
        'rounded-xl backdrop-blur-sm supports-[backdrop-filter]:bg-background/50 shadow-sm',
        variantClasses,
        suiteClasses,
        'transition-colors',
        fullHeight && 'min-h-[calc(100vh-8rem)]',
        bleed && '-mx-4 md:mx-0',
        className
      )}
      aria-label={ariaLabel}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Element>
  );
}
