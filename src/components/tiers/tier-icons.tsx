"use client";
import React from "react";
import { Zap, Target, Rocket, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTier = "free" | "starter" | "agency" | "enterprise";

export const TIER_ICON_CONFIG: Record<
  AppTier,
  {
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    color: string;
    ring: string;
    label: string;
  }
> = {
  free: {
    icon: Circle,
    bg: "bg-muted/40",
    color: "text-muted-foreground",
    ring: "ring-muted/30",
    label: "Free",
  },
  starter: {
    icon: Zap,
    bg: "bg-sky-500/15",
    color: "text-sky-400",
    ring: "ring-sky-500/30",
    label: "Starter",
  },
  agency: {
    icon: Target,
    bg: "bg-violet-500/15",
    color: "text-violet-400",
    ring: "ring-violet-500/30",
    label: "Agency",
  },
  enterprise: {
    icon: Rocket,
    bg: "bg-amber-500/15",
    color: "text-amber-500",
    ring: "ring-amber-500/30",
    label: "Enterprise",
  },
};

interface TierIconProps extends React.HTMLAttributes<HTMLDivElement> {
  tier: AppTier;
  size?: number;
  subtle?: boolean; // if true, remove ring & background
  iconClassName?: string;
}

export const TierIcon: React.FC<TierIconProps> = ({
  tier,
  size = 48,
  subtle = false,
  iconClassName,
  className,
  ...rest
}) => {
  const cfg = TIER_ICON_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md",
        !subtle && cfg.bg,
        !subtle && "ring-1",
        !subtle && cfg.ring,
        className
      )}
      style={{ width: size, height: size }}
      aria-label={`${cfg.label} tier`}
      {...rest}
    >
      <Icon className={cn("h-1/2 w-1/2", cfg.color, iconClassName)} />
    </div>
  );
};

export const TierChip = ({ tier }: { tier: AppTier }) => {
  const cfg = TIER_ICON_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
        cfg.bg,
        cfg.ring,
        cfg.color
      )}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
};
