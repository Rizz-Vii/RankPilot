"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  desc: string;
  action: string;
  onClick?: () => void;
  disabled?: boolean;
  intent?: "default" | "destructive" | "accent";
  small?: boolean;
  ariaLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  desc,
  action,
  onClick,
  disabled,
  intent = "default",
  small,
  ariaLabel,
  loading,
  loadingLabel,
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 bg-background/50 space-y-2 focus-within:ring-2 focus-within:ring-primary/40 transition",
        (disabled || loading) && "opacity-60 pointer-events-none"
      )}
      tabIndex={-1}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "text-xs font-medium px-2 py-1 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex items-center gap-1",
          intent === "destructive"
            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
            : intent === "accent"
              ? "bg-accent/20 text-accent-foreground hover:bg-accent/30"
              : "bg-primary/10 text-primary hover:bg-primary/20",
          small && "text-[10px] px-2 py-1"
        )}
        aria-label={ariaLabel || action + " action"}
      >
        {loading && (
          <span
            className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
        )}
        {loading ? loadingLabel || "Working..." : action}
      </button>
    </div>
  );
};
