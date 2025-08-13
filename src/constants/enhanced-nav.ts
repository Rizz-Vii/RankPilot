import type { LucideIcon } from "lucide-react";
import { TIER_HIERARCHY } from "@/lib/access-control";
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
  Megaphone,
  Mail,
  Share2,
  PenTool,
  Briefcase,
  DollarSign,
  Receipt,
  CreditCard,
  FileText,
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
  // Free: single representative tool
  {
    title: "NeuroSEO™",
    href: "/neuroseo",
    icon: Brain,
    description: "AI-powered content analysis dashboard (Free demo)",
    badge: "AI",
  },
  // Starter: unlock core analysis trio (crawler, semantic, trust)
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
  // Agency: advanced visibility + rewrite
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
  // Automation Recipes (agency tier, feature gated)
  {
    title: "Automation Recipes",
    href: "/automation/recipes",
    icon: Layers,
    description: "Schedule recurring AI operations",
    requiredTier: "agency",
    feature: "automation_recipes",
  },
];

// SEO Tools Navigation - Sales Optimized
export const seoToolsItems: NavItem[] = [
  // Free: one entry point
  {
    title: "Keyword Tool",
    href: "/keyword-tool",
    icon: KeyRound,
    description: "AI-driven keyword research and analysis (Free)",
  },
  // Starter: core on-page + audit + brief
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
  {
    title: "Content Briefs",
    href: "/content-briefs",
    icon: FileText,
    description: "Brief performance & historical dashboard",
    requiredTier: "starter",
    badge: "New",
  },
];

// Competitive Intelligence Navigation - Sales Optimized
export const competitiveItems: NavItem[] = [
  // Free: teaser (competitors locked at starter to encourage upgrade?) -> give SERP View free instead for breadth
  {
    title: "SERP View",
    href: "/serp-view",
    icon: TrendingUp,
    description: "Search engine results page visualization (Free preview)",
  },
  // Starter: unlock basic competitors
  {
    title: "Competitors",
    href: "/competitors",
    icon: Users,
    description: "Competitor analysis and benchmarking",
    requiredTier: "starter",
    feature: "competitor_analysis",
  },
  // Agency: deeper link intelligence
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
  // Starter: can be invited (view dashboard read-only) -> represent with Team Dashboard locked until agency? We'll give chat at agency only per request (invitation concept handled elsewhere)
  // Agency: collaboration core
  {
    title: "Team Chat",
    href: "/team/chat",
    icon: MessageCircle,
    description: "Real-time team communication",
    requiredTier: "agency",
    feature: "team_management",
  },
  {
    title: "Team Settings",
    href: "/team/settings",
    icon: Users,
    description: "Team configuration & member management",
    requiredTier: "agency",
    feature: "team_management",
  },
  // Enterprise: advanced project & reporting
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
];

// Sales Navigation (progressive unlock)
export const salesItems: NavItem[] = [
  {
    title: "Pipeline",
    href: "/sales/pipeline",
    icon: Briefcase,
    description: "Track opportunities & stages",
    requiredTier: "starter",
  },
  {
    title: "Deals",
    href: "/sales/deals",
    icon: Target,
    description: "Manage active deals & close rate",
    requiredTier: "agency",
  },
  {
    title: "Outreach",
    href: "/sales/outreach",
    icon: Mail,
    description: "AI-assisted outbound sequences",
    requiredTier: "agency",
  },
];

// Finance Navigation (tiered depth)
export const financeItems: NavItem[] = [
  {
    title: "Billing Overview",
    href: "/finance/billing",
    icon: CreditCard,
    description: "Plan usage & spend summary",
    requiredTier: "starter",
  },
  {
    title: "Invoices",
    href: "/finance/invoices",
    icon: FileText,
    description: "Historical invoices & receipts",
    requiredTier: "starter",
  },
  {
    title: "Revenue Analytics",
    href: "/finance/revenue",
    icon: BarChart3,
    description: "MRR / churn / LTV metrics",
    requiredTier: "agency",
  },
  {
    title: "Accounting",
    href: "/finance/accounting",
    icon: FileText,
    description: "P&L, Balance Sheet & reconciliation",
    requiredTier: "agency",
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
  // Moved from Team Collaboration group per request
  {
    title: "Team Dashboard",
    href: "/team",
    icon: Users,
    description: "Team overview (view/invite at starter via share)",
    requiredTier: "starter",
    feature: "team_management",
  },
  // Cross-domain dashboards (new groups surfaced centrally)
  {
    title: "Sales Dashboard",
    href: "/sales",
    icon: Target,
    description: "Funnel velocity & deal health overview",
    requiredTier: "starter",
  },
  {
    title: "Finance Dashboard",
    href: "/finance",
    icon: DollarSign,
    description: "Billing, revenue & quota spend summary",
    requiredTier: "starter",
  },
  {
    title: "Marketing Dashboard",
    href: "/marketing",
    icon: Megaphone,
    description: "Enterprise marketing automation intelligence",
    requiredTier: "enterprise",
  },
  // Admin link now in Management group
  {
    title: "Admin",
    href: "/adminonly",
    icon: Shield,
    description: "Administrative controls and user management",
    adminOnly: true,

  },
  {
    title: "Integration Hub",
    href: "/integration-hub",
    icon: Layers,
    description: "Enterprise Integration Hub (demo)",
    adminOnly: true,
    requiredTier: "enterprise",
    feature: "integration_hub",
    badge: "Demo",
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
  // Reordered: Management first so Dashboard (first page) is primary
  {
    title: "Management",
    icon: LayoutDashboard,
    id: "management",
    description: "Dashboard and performance tracking",
    items: managementItems,
    defaultExpanded: true,
    collapsible: true,
  },
  {
    title: "Marketing Automation",
    icon: Megaphone,
    id: "marketing",
    description: "Enterprise AI marketing & growth automation",
    badge: "Enterprise",
    items: [
      {
        title: "Email Campaigns",
        href: "/marketing/email-campaigns",
        icon: Mail,
        description: "AI-driven email sequencing & performance",
        requiredTier: "enterprise",
      },
      {
        title: "Lead Generation",
        href: "/marketing/lead-generation",
        icon: Target,
        description: "Automated lead capture & enrichment",
        requiredTier: "enterprise",
      },
      {
        title: "Social Presence",
        href: "/marketing/social-presence",
        icon: Share2,
        description: "AI scheduling & multi-channel publishing",
        requiredTier: "enterprise",
      },
      {
        title: "Marketing Content Gen",
        href: "/marketing/content-generation",
        icon: PenTool,
        description: "Long-form & campaign asset generation",
        requiredTier: "enterprise",
      },
    ],
    defaultExpanded: false,
    collapsible: true,
  },
  {
    title: "Sales",
    icon: Briefcase,
    id: "sales",
    description: "Pipeline & deal acceleration",
    items: salesItems,
    defaultExpanded: false,
    collapsible: true,
  },
  {
    title: "Finance",
    icon: DollarSign,
    id: "finance",
    description: "Billing & revenue intelligence",
    items: financeItems,
    defaultExpanded: false,
    collapsible: true,
  },
  {
    title: "NeuroSEO™ Suite",
    icon: Brain,
    id: "neuroseo",
    description: "AI-powered SEO analysis and optimization",
    badge: "AI",
    items: neuroSEOItems,
    defaultExpanded: false,
    collapsible: true,
  },
  {
    title: "SEO Tools",
    icon: Zap,
    id: "seo-tools",
    description: "Essential SEO analysis and optimization tools",
    items: seoToolsItems,
    defaultExpanded: false,
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
  // NOTE: Removed "Account & Settings" group - Profile now standalone, Settings at bottom
];

// Standalone navigation items (appear at bottom of sidebar)
export const standaloneNavItems: NavItem[] = standaloneItems;

// Flat navigation items for backward compatibility and mobile (FIXED: Remove duplication)
export const flatNavItems: NavItem[] = [
  ...managementItems.slice(0, 4), // Dashboard, Insights, Performance, Team Dashboard
  ...neuroSEOItems.slice(0, 1), // NeuroSEO Dashboard
  ...seoToolsItems, // All SEO tools
  ...competitiveItems, // Competitive tools
  ...teamCollaborationItems, // Team collaboration tools
  ...salesItems,
  ...financeItems,
  // Admin is now in managementItems
  ...userItems, // Profile only
];

// Helper functions
export const getVisibleNavGroups = (
  userTier?: string,
  isAdmin?: boolean,
  options: { includeLocked?: boolean } = {}
): NavGroup[] => {
  const includeLocked = options.includeLocked ?? true; // now we default to showing locked items disabled for upsell
  return navGroups
    .map((group) => {
      const processedItems = group.items
        .map((item) => {
          // Admin restriction
          if (item.adminOnly && !isAdmin) return null;
          if (!item.requiredTier) return { ...item, disabled: false };
          if (!userTier) {
            return includeLocked
              ? { ...item, disabled: true }
              : null;
          }
          const userIndex = TIER_HIERARCHY.indexOf(userTier as any);
          const requiredIndex = TIER_HIERARCHY.indexOf(
            item.requiredTier as any
          );
          if (userIndex === -1 || requiredIndex === -1) {
            return includeLocked ? { ...item, disabled: true } : null;
          }
          const unlocked = userIndex >= requiredIndex;
          if (!unlocked && !includeLocked) return null;
          return { ...item, disabled: !unlocked };
        })
        .filter(Boolean) as NavItem[];

      return { ...group, items: processedItems };
    })
    .filter((group) => group.items.length > 0);
};

export const getVisibleNavItems = (
  userTier?: string,
  isAdmin?: boolean,
  options: { includeLocked?: boolean } = {}
): NavItem[] => {
  const includeLocked = options.includeLocked ?? true;
  return flatNavItems
    .map((item) => {
      if (item.adminOnly && !isAdmin) return null;
      if (!item.requiredTier) return { ...item, disabled: false };
      if (!userTier) return includeLocked ? { ...item, disabled: true } : null;
      const userIndex = TIER_HIERARCHY.indexOf(userTier as any);
      const requiredIndex = TIER_HIERARCHY.indexOf(item.requiredTier as any);
      const unlocked = userIndex >= requiredIndex;
      if (!unlocked && !includeLocked) return null;
      return { ...item, disabled: !unlocked };
    })
    .filter(Boolean) as NavItem[];
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
  // With single-group expansion we open only Management by default
  expandedGroups: new Set(["management"]),
  activeGroup: undefined,
  activeItem: undefined,
};

// Error boundaries for navigation
export const handleNavError = (error: Error, context: string) => {
  console.error(`Navigation error in ${context}:`, error);

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
