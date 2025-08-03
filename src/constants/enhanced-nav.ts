import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  KeyRound,
  ScanText,
  Users,
  Search,
  ListChecks,
  Link,
  Rocket,
  BookText,
  Shield,
  Lightbulb,
  User,
  Settings,
  Brain,
  Eye,
  Fingerprint,
  Layers,
  RefreshCw,
  Target,
  TrendingUp,
  Zap,
  BarChart3,
  Map,
  MessageCircle,
  FolderOpen,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
  adminOnly?: boolean;
  requiredTier?: "starter" | "agency" | "enterprise";
  feature?: string;
  badge?: string;
  description?: string;
}

export interface NavGroup {
  title: string;
  icon: LucideIcon;
  id: string;
  description?: string;
  badge?: string;
  items: NavItem[];
  requiredTier?: "starter" | "agency" | "enterprise";
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// Enhanced NeuroSEO™ Suite Navigation - Sales Optimized
export const neuroSEOItems: NavItem[] = [
  {
    title: "NeuroSEO™",
    href: "/neuroseo",
    icon: Brain,
    description: "AI-powered content analysis dashboard (Free demo)",
    badge: "AI",
    // Free tier - demo access
  },
  {
    title: "NeuralCrawler™",
    href: "/neuroseo/neural-crawler",
    icon: Search,
    description: "Intelligent web content extraction",
    requiredTier: "starter",
  },
  {
    title: "SemanticMap™",
    href: "/neuroseo/semantic-map",
    icon: Map,
    description: "Advanced NLP analysis and topic visualization",
    requiredTier: "starter",
  },
  {
    title: "TrustBlock™",
    href: "/neuroseo/trust-block",
    icon: Fingerprint,
    description: "E-A-T optimization and content authenticity",
    requiredTier: "starter",
  },
  {
    title: "AI Visibility Engine",
    href: "/neuroseo/ai-visibility",
    icon: Eye,
    description: "LLM citation tracking and optimization",
    requiredTier: "agency",
  },
  {
    title: "RewriteGen™",
    href: "/neuroseo/rewrite-gen",
    icon: RefreshCw,
    description: "AI-powered content rewriting and optimization",
    requiredTier: "agency",
  },
];

// SEO Tools Navigation - Sales Optimized
export const seoToolsItems: NavItem[] = [
  {
    title: "Keyword Tool",
    href: "/keyword-tool",
    icon: KeyRound,
    description: "AI-driven keyword research and analysis (Free)",
    // Free tier - basic keyword research
  },
  {
    title: "Content Analyzer",
    href: "/content-analyzer",
    icon: ScanText,
    description: "Content optimization and readability analysis",
    requiredTier: "starter",
  },
  {
    title: "SEO Audit",
    href: "/seo-audit",
    icon: ListChecks,
    description: "Comprehensive technical SEO analysis",
    requiredTier: "starter",
  },
  {
    title: "Content Brief",
    href: "/content-brief",
    icon: BookText,
    description: "AI-powered content briefs and strategy",
    requiredTier: "starter",
  },
];

// Competitive Intelligence Navigation - Sales Optimized
export const competitiveItems: NavItem[] = [
  {
    title: "Competitors",
    href: "/competitors",
    icon: Users,
    description: "Competitor analysis and benchmarking",
    requiredTier: "agency",
    feature: "competitor-analysis",
  },
  {
    title: "SERP View",
    href: "/serp-view",
    icon: TrendingUp,
    description: "Search engine results page visualization",
    requiredTier: "agency",
  },
  {
    title: "Link View",
    href: "/link-view",
    icon: Link,
    description: "Backlink analysis and link building opportunities",
    requiredTier: "agency",
  },
];

// Team Collaboration Navigation - Sales Optimized
export const teamCollaborationItems: NavItem[] = [
  {
    title: "Team Chat",
    href: "/team/chat",
    icon: MessageCircle,
    description: "Real-time team communication",
    requiredTier: "agency",
    feature: "team_management",
  },
  {
    title: "Team Dashboard",
    href: "/team",
    icon: Users,
    description: "Team overview and member management",
    requiredTier: "enterprise",
    feature: "team_management",
  },
  {
    title: "Team Projects",
    href: "/team/projects",
    icon: FolderOpen,
    description: "Collaborative project management",
    requiredTier: "enterprise",
    feature: "team_management",
  },
  {
    title: "Team Reports",
    href: "/team/reports",
    icon: BarChart3,
    description: "Team performance analytics",
    requiredTier: "enterprise",
    feature: "team_management",
  },
  {
    title: "Team Settings",
    href: "/team/settings",
    icon: Users,
    description: "Team configuration and member management",
    requiredTier: "agency",
    feature: "team_management",
  },
];

// Management Navigation - Sales Optimized
export const managementItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of your SEO performance (Free)",
    // Free tier - basic dashboard
  },
  {
    title: "Insights",
    href: "/insights",
    icon: Lightbulb,
    description: "AI-powered actionable insights",
    requiredTier: "starter",
  },
  {
    title: "Performance",
    href: "/performance",
    icon: BarChart3,
    description: "Performance metrics and analytics",
    requiredTier: "starter",
  },
];

// User Navigation - Profile only (no Settings duplication)
export const userItems: NavItem[] = [
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "User profile and account settings",
    // Free tier - basic profile
  },
  {
    title: "Admin",
    href: "/adminonly",
    icon: Shield,
    description: "Administrative controls and user management",
    adminOnly: true,
  },
];

// Standalone Settings (bottom of sidebar)
export const standaloneItems: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Application settings and preferences",
    // Free tier - basic settings
  },
];

// Enhanced Navigation Groups
export const navGroups: NavGroup[] = [
  {
    title: "NeuroSEO™ Suite",
    icon: Brain,
    id: "neuroseo",
    description: "AI-powered SEO analysis and optimization",
    badge: "AI",
    items: neuroSEOItems,
    defaultExpanded: true,
    collapsible: true,
  },
  {
    title: "SEO Tools",
    icon: Zap,
    id: "seo-tools",
    description: "Essential SEO analysis and optimization tools",
    items: seoToolsItems,
    defaultExpanded: true,
    collapsible: true,
  },
  {
    title: "Competitive Intelligence",
    icon: Target,
    id: "competitive",
    description: "Competitor analysis and market intelligence",
    items: competitiveItems,
    requiredTier: "starter",
    defaultExpanded: false,
    collapsible: true,
  },
  {
    title: "Team Collaboration",
    icon: Users,
    id: "team-collaboration",
    description: "Team management and collaboration tools",
    badge: "Agency+",
    items: teamCollaborationItems,
    requiredTier: "agency",
    defaultExpanded: false,
    collapsible: true,
  },
  {
    title: "Management",
    icon: LayoutDashboard,
    id: "management",
    description: "Dashboard and performance tracking",
    items: managementItems,
    defaultExpanded: false,
    collapsible: true,
  },
  // NOTE: Removed "Account & Settings" group - Profile now standalone, Settings at bottom
];

// Standalone navigation items (appear at bottom of sidebar)
export const standaloneNavItems: NavItem[] = standaloneItems;

// Flat navigation items for backward compatibility and mobile (FIXED: Remove duplication)
export const flatNavItems: NavItem[] = [
  ...managementItems.slice(0, 2), // Dashboard, Insights
  ...neuroSEOItems.slice(0, 1), // NeuroSEO Dashboard
  ...seoToolsItems, // All SEO tools
  ...competitiveItems, // Competitive tools
  ...teamCollaborationItems, // Team collaboration tools
  ...managementItems.slice(2), // Performance
  // NOTE: userItems are now only in Account & Settings group to prevent duplication
];

// Helper functions
export const getVisibleNavGroups = (
  userTier?: string,
  isAdmin?: boolean
): NavGroup[] => {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Check admin access
        if (item.adminOnly && !isAdmin) return false;

        // Check tier access
        if (item.requiredTier) {
          if (!userTier) return false;
          const tierHierarchy = [
            "free",
            "starter",
            "agency",
            "enterprise",
            "admin",
          ];
          const userTierIndex = tierHierarchy.indexOf(userTier);
          const requiredTierIndex = tierHierarchy.indexOf(item.requiredTier);
          if (userTierIndex < requiredTierIndex) return false;
        }

        return true;
      }),
    }))
    .filter((group) => {
      // Filter out groups with no visible items
      if (group.items.length === 0) return false;

      // Check group-level tier requirements
      if (group.requiredTier) {
        if (!userTier) return false;
        const tierHierarchy = [
          "free",
          "starter",
          "agency",
          "enterprise",
          "admin",
        ];
        const userTierIndex = tierHierarchy.indexOf(userTier);
        const requiredTierIndex = tierHierarchy.indexOf(group.requiredTier);
        if (userTierIndex < requiredTierIndex) return false;
      }

      return true;
    });
};

export const getVisibleNavItems = (
  userTier?: string,
  isAdmin?: boolean
): NavItem[] => {
  return flatNavItems.filter((item) => {
    // Check admin access
    if (item.adminOnly && !isAdmin) return false;

    // Check tier access
    if (item.requiredTier) {
      if (!userTier) return false;
      const tierHierarchy = [
        "free",
        "starter",
        "agency",
        "enterprise",
        "admin",
      ];
      const userTierIndex = tierHierarchy.indexOf(userTier);
      const requiredTierIndex = tierHierarchy.indexOf(item.requiredTier);
      if (userTierIndex < requiredTierIndex) return false;
    }

    return true;
  });
};

export const findNavItemByHref = (href: string): NavItem | undefined => {
  return flatNavItems.find((item) => item.href === href);
};

export const getNavGroupByItemHref = (href: string): NavGroup | undefined => {
  return navGroups.find((group) =>
    group.items.some((item) => item.href === href)
  );
};

// Tier display helpers
export const getTierBadgeProps = (tier: string) => {
  const tierConfig = {
    starter: { color: "blue", icon: Zap, label: "Starter" },
    agency: { color: "purple", icon: Target, label: "Agency" },
    enterprise: { color: "gold", icon: Rocket, label: "Enterprise" },
  };

  return tierConfig[tier as keyof typeof tierConfig] || null;
};

// App constants
export const AppLogo = Rocket;
export const AppName = "RankPilot";

// Navigation state management
export interface NavState {
  expandedGroups: Set<string>;
  activeGroup?: string;
  activeItem?: string;
}

export const defaultNavState: NavState = {
  expandedGroups: new Set(["neuroseo", "seo-tools", "user-settings"]),
  activeGroup: undefined,
  activeItem: undefined,
};

// Error boundaries for navigation
export const handleNavError = (_error: Error, context: string) => {
  console.error(`Navigation error in ${context}:`, _error);

  // Report to error tracking service in production
  if (process.env.NODE_ENV === "production") {
    // Analytics or error tracking service call
  }

  return {
    fallback: "dashboard",
    message: "Navigation temporarily unavailable",
  };
};

// Navigation analytics
export const trackNavigation = (itemHref: string, groupId?: string) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "navigation_click", {
      event_category: "navigation",
      event_label: itemHref,
      custom_parameter_1: groupId,
    });
  }
};
