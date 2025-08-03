"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  title: string;
  href?: string;
  icon?: ReactNode;
  current?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: ReactNode;
}

// Route mappings for automatic breadcrumb generation
const routeMappings: Record<string, { title: string; icon?: ReactNode }> = {
  "/dashboard": { title: "Dashboard", icon: "🏠" },
  "/keyword-tool": { title: "Keyword Tool", icon: "🔑" },
  "/seo-audit": { title: "SEO Audit", icon: "🔍" },
  "/content-analyzer": { title: "Content Analyzer", icon: "📝" },
  "/competitors": { title: "Competitors", icon: "👥" },
  "/link-view": { title: "Link Analysis", icon: "🔗" },
  "/serp-view": { title: "SERP View", icon: "📈" },
  "/content-brief": { title: "Content Brief", icon: "📋" },
  "/insights": { title: "Insights", icon: "💡" },
  "/profile": { title: "Profile", icon: "👤" },
  "/login": { title: "Login", icon: "🔑" },
  "/register": { title: "Register", icon: "📝" },
};

export default function Breadcrumb({
  items,
  className,
  showHome = true,
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Generate breadcrumbs automatically if not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname || "");

  // Add home breadcrumb if requested and not already present
  const finalItems =
    showHome && breadcrumbItems[0]?.href !== "/dashboard"
      ? [
          {
            title: "Dashboard",
            href: "/dashboard",
            icon: <Home className="h-4 w-4" />,
            current: false,
          },
          ...breadcrumbItems,
        ]
      : breadcrumbItems;

  if (finalItems.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm", className)}
    >
      <ol className="flex items-center space-x-1">
        {finalItems.map((item, index) => {
          const isLast = index === finalItems.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 flex-shrink-0" aria-hidden="true">
                  {separator}
                </span>
              )}

              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 hover:text-foreground transition-colors",
                    "text-muted-foreground hover:text-primary",
                    "min-h-[44px] px-2 py-1 rounded-md", // Touch target for mobile
                    "md:min-h-auto md:px-0 md:py-0" // Reset for desktop
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.icon && (
                    <span className="flex-shrink-0 text-xs">{item.icon}</span>
                  )}
                  <span className="truncate">{item.title}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isCurrent
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                    "px-2 py-1", // Consistent spacing
                    "md:px-0 md:py-0"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.icon && (
                    <span className="flex-shrink-0 text-xs">{item.icon}</span>
                  )}
                  <span className="truncate">{item.title}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Auto-generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/" || pathname === "/dashboard") {
    return [];
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Build breadcrumbs from path segments
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const mapping = routeMappings[currentPath];

    if (mapping) {
      breadcrumbs.push({
        title: mapping.title,
        href: currentPath,
        icon: mapping.icon,
        current: index === segments.length - 1,
      });
    } else {
      // Fallback for unmapped routes
      const title = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        title,
        href: currentPath,
        current: index === segments.length - 1,
      });
    }
  });

  return breadcrumbs;
}

// Mobile-optimized breadcrumb variant
export function MobileBreadcrumb({
  items,
  className,
  showHome = true,
}: Omit<BreadcrumbProps, "separator">) {
  const pathname = usePathname();
  const breadcrumbItems = items || generateBreadcrumbs(pathname || "");

  // Show only current and parent for mobile
  const mobileItems =
    breadcrumbItems.length > 1 ? breadcrumbItems.slice(-2) : breadcrumbItems;

  const finalItems =
    showHome && mobileItems[0]?.href !== "/dashboard"
      ? [
          {
            title: "Dashboard",
            href: "/dashboard",
            icon: <Home className="h-4 w-4" />,
            current: false,
          },
        ]
      : [];

  const displayItems = [...finalItems, ...mobileItems];

  if (displayItems.length === 0) return null;

  return (
    <div className={cn("md:hidden bg-muted/30 px-4 py-2 border-b", className)}>
      <Breadcrumb
        items={displayItems}
        showHome={false}
        separator={<ChevronRight className="h-3 w-3 text-muted-foreground" />}
        className="text-xs"
      />
    </div>
  );
}

// Compact breadcrumb for tool headers
export function ToolBreadcrumb({
  toolName,
  toolIcon,
}: {
  toolName: string;
  toolIcon?: ReactNode;
}) {
  return (
    <div className="hidden md:block mb-4">
      <Breadcrumb
        items={[
          {
            title: toolName,
            icon: toolIcon,
            current: true,
          },
        ]}
        className="text-sm text-muted-foreground"
      />
    </div>
  );
}
