/**
 * RankPilot Design System - Color System
 * Consistent color usage for status, feedback, and UI elements
 */

export const colors = {
  // Status colors (semantic)
  status: {
    success: {
      bg: "bg-success/10",
      text: "text-success-foreground",
      border: "border-success/40",
      badge: "bg-success/15 text-success-foreground",
    },
    warning: {
      bg: "bg-warning/10",
      text: "text-warning-foreground",
      border: "border-warning/40",
      badge: "bg-warning/15 text-warning-foreground",
    },
    error: {
      bg: "bg-destructive/10",
      text: "text-destructive-foreground",
      border: "border-destructive/40",
      badge: "bg-destructive/15 text-destructive-foreground",
    },
    info: {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/40",
      badge: "bg-primary/15 text-primary",
    },
  },

  // Project status colors (from screenshots)
  projectStatus: {
    active: {
      bg: "bg-success/10",
      text: "text-success-foreground",
      dot: "bg-success",
    },
    planning: {
      bg: "bg-primary/10",
      text: "text-primary",
      dot: "bg-primary",
    },
    completed: {
      bg: "bg-muted",
      text: "text-foreground",
      dot: "bg-muted-foreground",
    },
    high: {
      bg: "bg-warning/10",
      text: "text-warning-foreground",
      dot: "bg-warning",
    },
    medium: {
      bg: "bg-accent/10",
      text: "text-accent-foreground",
      dot: "bg-accent",
    },
  },

  // System health colors
  health: {
    healthy: {
      bg: "bg-success/10",
      text: "text-success-foreground",
      badge: "bg-success/15 text-success-foreground font-medium",
    },
    warning: {
      bg: "bg-warning/10",
      text: "text-warning-foreground",
      badge: "bg-warning/15 text-warning-foreground font-medium",
    },
    critical: {
      bg: "bg-destructive/10",
      text: "text-destructive-foreground",
      badge: "bg-destructive/15 text-destructive-foreground font-medium",
    },
  },

  // Tier badges (from sidebar)
  tierBadges: {
    ai: "bg-accent text-accent-foreground px-2 py-1 rounded-md text-xs font-semibold",
    enterprise:
      "bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold",
    agency:
      "bg-success text-success-foreground px-2 py-1 rounded-md text-xs font-semibold",
    starter:
      "bg-warning text-warning-foreground px-2 py-1 rounded-md text-xs font-semibold",
    free: "bg-muted text-foreground px-2 py-1 rounded-md text-xs font-semibold",
  },

  // Text colors with proper contrast
  text: {
    primary: "text-foreground",
    secondary: "text-muted-foreground",
    muted: "text-muted-foreground",
    inverse: "text-primary-foreground",
    link: "text-primary hover:text-primary/80",
  },

  // Background colors
  background: {
    primary: "bg-background",
    secondary: "bg-muted",
    muted: "bg-muted/60",
    dark: "bg-foreground/5",
    card: "bg-card border border-border",
  },
} as const;

// Color utility functions
export const getStatusColor = (
  status: "success" | "warning" | "error" | "info",
  type: "bg" | "text" | "border" | "badge"
) => {
  return colors.status[status][type];
};

export const getProjectStatusColor = (status: string) => {
  const statusKey = status.toLowerCase() as keyof typeof colors.projectStatus;
  return colors.projectStatus[statusKey] || colors.projectStatus.active;
};

export const getTierBadgeColor = (tier: string) => {
  const tierKey = tier.toLowerCase() as keyof typeof colors.tierBadges;
  return colors.tierBadges[tierKey] || colors.tierBadges.free;
};
