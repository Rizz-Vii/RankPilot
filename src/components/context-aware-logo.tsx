// src/components/context-aware-logo.tsx
"use client";

import { AppLogo, AppName } from "@/constants/enhanced-nav";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ContextAwareLogoProps {
  className?: string;
  showText?: boolean;
}

export function ContextAwareLogo({
  className,
  showText = true,
}: ContextAwareLogoProps) {
  const { user, loading } = useAuth();

  // Determine href based on auth state
  const href = !loading && user ? "/dashboard" : "/";
  const ariaLabel = !loading && user ? "Go to Dashboard" : "Go to Homepage";

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2", className)}
      // If text label is rendered, prefer visible text as the accessible name.
      // aria-label would override it, so only set aria-label when showText is false.
      {...(showText ? {} : { "aria-label": `${AppName} — ${ariaLabel}` })}
      title={`${AppName}`}
    >
      <AppLogo className="h-8 w-8 text-primary shrink-0" />
      {showText && (
        <span className="text-xl font-headline font-bold text-primary">
          {AppName}
        </span>
      )}
    </Link>
  );
}
