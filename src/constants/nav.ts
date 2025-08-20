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
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Insights",
    href: "/insights",
    icon: Lightbulb,
  },
  {
    title: "Content Brief",
    href: "/content-brief",
    icon: BookText,
    requiredTier: "starter", // Starter and above
  },
  {
    title: "Keyword Tool",
    href: "/keyword-tool",
    icon: KeyRound,
  },
  {
    title: "Content Analyzer",
    href: "/content-analyzer",
    icon: ScanText,
  },
  {
    title: "Competitors",
    href: "/competitors",
    icon: Users,
    requiredTier: "starter", // Starter and above
    feature: "competitor_analysis", // aligned to access-control key
  },
  {
    title: "SERP View",
    href: "/serp-view",
    icon: Search,
    requiredTier: "starter", // Starter and above
  },
  {
    title: "SEO Audit",
    href: "/seo-audit",
    icon: ListChecks,
  },
  {
    title: "Link View",
    href: "/link-view",
    icon: Link,
    requiredTier: "starter", // Starter and above
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Admin",
    href: "/adminonly",
    icon: Shield,
    adminOnly: true,
  },
];

export const AppLogo = Rocket;
export const AppName = "RankPilot";
