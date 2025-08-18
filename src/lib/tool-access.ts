/**
 * Tool Access Control System
 * Restricts available tools and features based on subscription tier
 */

import { useSubscription } from "@/hooks/useSubscription";
import type { NavItem } from "@/constants/nav";

// Define comprehensive tier types
export type TierName = "free" | "starter" | "agency" | "enterprise" | "admin";

// Tier mapping for backward compatibility
export const TIER_ALIASES: Record<string, TierName> = {
  free: "free",
  starter: "starter",
  agency: "agency",
  professional: "agency", // Legacy alias: map to agency
  enterprise: "enterprise",
  admin: "admin",
};

// Define tools/features available per tier
export const TIER_TOOL_ACCESS = {
  free: {
    maxTools: 3,
    allowedTools: [
      "basic-audit",
      "keyword-research",
      "simple-reports",
    ] as const,
    restrictions: {
      auditsPerMonth: 5,
      reportsPerMonth: 5,
      keywordTracking: 50,
      competitorTracking: 1,
      exportFormats: ["PDF"] as const,
      supportType: "email" as const,
    },
  },
  starter: {
    maxTools: 8,
    allowedTools: [
      "basic-audit",
      "keyword-research",
      "simple-reports",
      "competitor-analysis",
      "advanced-reports",
      "rank-tracking",
      "backlink-analysis",
      "site-performance",
    ] as const,
    restrictions: {
      auditsPerMonth: 50,
      reportsPerMonth: 50,
      keywordTracking: 500,
      competitorTracking: 5,
      exportFormats: ["PDF", "CSV", "Excel"] as const,
      supportType: "priority" as const,
    },
  },
  agency: {
    maxTools: -1, // unlimited
    allowedTools: [
      "basic-audit",
      "keyword-research",
      "simple-reports",
      "competitor-analysis",
      "advanced-reports",
      "rank-tracking",
      "backlink-analysis",
      "site-performance",
      "white-label-reports",
      "api-access",
      "team-collaboration",
      "custom-integrations",
      "bulk-operations",
      "automated-reporting",
    ] as const,
    restrictions: {
      auditsPerMonth: -1, // unlimited
      reportsPerMonth: -1,
      keywordTracking: -1,
      competitorTracking: -1,
      exportFormats: ["PDF", "CSV", "Excel", "PowerPoint", "Custom"] as const,
      supportType: "dedicated" as const,
    },
  },
  enterprise: {
    maxTools: -1, // unlimited
    allowedTools: [
      "basic-audit",
      "keyword-research",
      "simple-reports",
      "competitor-analysis",
      "technical-audit",
      "content-analysis",
      "advanced-reports",
      "rank-tracking",
      "backlink-analysis",
      "site-performance",
      "white-label-reports",
      "api-access",
      "team-collaboration",
      "custom-integrations",
      "bulk-operations",
      "automated-reporting",
      "enterprise-features",
      "custom-development",
      "advanced-analytics",
    ] as const,
    restrictions: {
      auditsPerMonth: -1, // unlimited
      reportsPerMonth: -1,
      keywordTracking: -1,
      competitorTracking: -1,
      exportFormats: ["PDF", "CSV", "Excel", "PowerPoint", "Custom"] as const,
      supportType: "dedicated" as const,
    },
  },
  // Admin tier: mirrors enterprise capabilities (super-set / operational role)
  admin: {
    maxTools: -1, // unlimited (full platform access)
    allowedTools: [
      "basic-audit",
      "keyword-research",
      "simple-reports",
      "competitor-analysis",
      "technical-audit",
      "content-analysis",
      "advanced-reports",
      "rank-tracking",
      "backlink-analysis",
      "site-performance",
      "white-label-reports",
      "api-access",
      "team-collaboration",
      "custom-integrations",
      "bulk-operations",
      "automated-reporting",
      "enterprise-features",
      "custom-development",
      "advanced-analytics",
      // Reserved for future admin-only operational tools
      // "system-admin",
    ] as const,
    restrictions: {
      auditsPerMonth: -1,
      reportsPerMonth: -1,
      keywordTracking: -1,
      competitorTracking: -1,
      exportFormats: ["PDF", "CSV", "Excel", "PowerPoint", "Custom"] as const,
      supportType: "dedicated" as const,
    },
  },
} as const;

type TierType = keyof typeof TIER_TOOL_ACCESS;

// Tool categories for better organization
export const TOOL_CATEGORIES = {
  audit: {
    name: "SEO Audit Tools",
    tools: ["basic-audit", "site-performance", "technical-seo"] as const,
    icon: "Search",
  },
  keywords: {
    name: "Keyword Research",
    tools: ["keyword-research", "rank-tracking", "keyword-difficulty"] as const,
    icon: "Target",
  },
  competitors: {
    name: "Competitor Analysis",
    tools: [
      "competitor-analysis",
      "backlink-analysis",
      "gap-analysis",
    ] as const,
    icon: "Users",
  },
  reports: {
    name: "Reporting & Analytics",
    tools: [
      "simple-reports",
      "advanced-reports",
      "white-label-reports",
    ] as const,
    icon: "BarChart3",
  },
  automation: {
    name: "Automation & API",
    tools: ["automated-reporting", "api-access", "bulk-operations"] as const,
    icon: "Bot",
  },
  collaboration: {
    name: "Team & Collaboration",
    tools: [
      "team-collaboration",
      "custom-integrations",
      "client-portal",
    ] as const,
    icon: "Users2",
  },
} as const;

/**
 * Hook to check if user can access a specific tool
 */
export function useToolAccess() {
  const { subscription } = useSubscription();

  const canAccessTool = (toolId: string): boolean => {
    if (!subscription) return false;

    const tierAccess = TIER_TOOL_ACCESS[subscription.tier as TierType];
    if (!tierAccess) return false;

    return (tierAccess.allowedTools as readonly string[]).includes(toolId);
  };

  const getRestrictedMessage = (toolId: string): string => {
    if (!subscription) return "Please log in to access this tool.";

    const currentTier = subscription.tier as TierType;

    // Find which tier this tool becomes available
    const availableInTier = Object.entries(TIER_TOOL_ACCESS).find(
      ([tier, access]) =>
        (access.allowedTools as readonly string[]).includes(toolId) &&
        tier !== currentTier
    );

    if (availableInTier) {
      const [tierName] = availableInTier;
      const tierDisplayName =
        tierName.charAt(0).toUpperCase() + tierName.slice(1);
      return `This tool is available in the ${tierDisplayName} plan. Upgrade to unlock it.`;
    }

    return "This tool is not available in your current plan.";
  };

  const getAvailableTools = (): string[] => {
    if (!subscription) return [];
    const tierAccess = TIER_TOOL_ACCESS[subscription.tier as TierType];
    return tierAccess ? [...tierAccess.allowedTools] : [];
  };

  const getToolsByCategory = () => {
    const availableTools = getAvailableTools();

    return Object.entries(TOOL_CATEGORIES).map(([categoryId, category]) => ({
      id: categoryId,
      name: category.name,
      icon: category.icon,
      tools: category.tools.map((toolId) => ({
        id: toolId,
        name: formatToolName(toolId),
        available: availableTools.includes(toolId),
        restrictedMessage: availableTools.includes(toolId)
          ? null
          : getRestrictedMessage(toolId),
      })),
    }));
  };

  return {
    canAccessTool,
    getRestrictedMessage,
    getAvailableTools,
    getToolsByCategory,
    tierAccess: subscription
      ? TIER_TOOL_ACCESS[subscription.tier as TierType]
      : null,
  };
}

/**
 * Filter navigation items based on subscription tier
 */
export function filterNavBySubscription(
  navItems: NavItem[],
  subscription: { tier?: string } | null | undefined
): NavItem[] {
  if (!subscription) return navItems.filter((item) => !item.requiredTier);

  const tierAccess = TIER_TOOL_ACCESS[subscription.tier as TierType];
  if (!tierAccess) return navItems;

  return navItems
    .filter((item) => {
      // If no tier requirement, show to all users
      if (!item.requiredTier) return true;

      // Check if user's tier meets the requirement
      const tierHierarchy = {
        free: 0,
        starter: 1,
        agency: 2,
        professional: 2,
        enterprise: 3,
        admin: 4,
      };
      const userTierLevel =
        tierHierarchy[subscription.tier as keyof typeof tierHierarchy] ?? -1;
      const requiredTierLevel =
        tierHierarchy[item.requiredTier as keyof typeof tierHierarchy] ?? 999;

      return userTierLevel >= requiredTierLevel;
    })
    .map((item) => {
      // Filter subitems based on tool access if they exist
      const filteredItem: NavItem & { children?: NavItem[] } = { ...(item as NavItem & { children?: NavItem[] }) };

      if ("children" in item && Array.isArray(item.children)) {
        const filteredChildren = item.children.filter((child) => {
          if (
            "feature" in child &&
            child.feature &&
            !(tierAccess.allowedTools as readonly string[]).includes(
              child.feature
            )
          ) {
            return false;
          }
          return true;
        });

        filteredItem.children = filteredChildren as NavItem[];
      }

      return filteredItem;
    });
}

/**
 * Utility to format tool names for display
 */
function formatToolName(toolId: string): string {
  return toolId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get usage limits for current subscription tier
 */
export function getUsageLimits(tier: TierType) {
  return TIER_TOOL_ACCESS[tier].restrictions;
}

/**
 * Check if user has reached usage limit for a specific feature
 */
export function checkUsageLimit(
  tier: TierType,
  feature: keyof typeof TIER_TOOL_ACCESS.free.restrictions,
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } {
  const limits = TIER_TOOL_ACCESS[tier].restrictions;
  const limit = limits[feature] as number;

  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }

  return {
    allowed: currentUsage < limit,
    limit,
    remaining: Math.max(0, limit - currentUsage),
  };
}
