import { canAccessTier, type SubscriptionTier } from "@/lib/access-control";

// Minimal route → minimum tier mapping. Extend safely later as needed.
type MinAccess = SubscriptionTier | "admin";
const ROUTE_MIN: Record<string, MinAccess> = {
  "/dashboard": "starter",
  "/performance": "starter",
  "/keyword-tool": "starter",
  "/seo-audit": "starter",
  "/content-analyzer": "starter",
  "/competitors": "starter",
  "/link-view": "starter",
  "/neuroseo": "agency",
  "/neuroseo/semantic-map": "agency",
  "/neuroseo/rewrite-gen": "agency",
  "/neuroseo/ai-visibility": "agency",
  "/finance/revenue": "agency",
  "/admin/observability": "admin",
  "/admin/events": "admin",
  "/insights": "starter",
};

export function canNavigateTo(
  userTier: SubscriptionTier,
  route: string,
  opts?: { isAdmin?: boolean }
): boolean {
  const min = ROUTE_MIN[route];
  if (!min) return false; // only navigate to known routes
  if (min === "admin") return !!opts?.isAdmin;
  return canAccessTier(userTier, min);
}

export function resolveIntentRoute(intent: string): string | null {
  const t = intent.toLowerCase();
  if (t === "performance") return "/performance";
  if (t === "keyword_strategy") return "/keyword-tool";
  if (t === "structured_data") return "/content-analyzer";
  if (t === "technical_seo") return "/seo-audit";
  if (t === "competitor") return "/competitors";
  if (t === "content_optimization") return "/content-analyzer";
  if (t === "general") return "/dashboard";
  return null;
}

export function resolveSuggestionRoute(s: string): string | null {
  const text = s.toLowerCase();
  if (
    text.includes("core web vitals") ||
    text.includes("lcp") ||
    text.includes("cls") ||
    text.includes("tti") ||
    text.includes("performance")
  )
    return "/performance";
  if (
    text.includes("keyword") ||
    text.includes("cluster") ||
    text.includes("long-tail")
  )
    return "/keyword-tool";
  if (
    text.includes("index") ||
    text.includes("crawl") ||
    text.includes("coverage") ||
    text.includes("sitemap") ||
    text.includes("robots")
  )
    return "/seo-audit";
  if (
    text.includes("json-ld") ||
    text.includes("schema") ||
    text.includes("structured data")
  )
    return "/content-analyzer";
  if (text.includes("rewrite") || text.includes("snippet"))
    return "/neuroseo/rewrite-gen";
  if (text.includes("internal link")) return "/link-view";
  if (
    text.includes("competitor") ||
    text.includes("serp") ||
    text.includes("gap")
  )
    return "/competitors";
  if (text.includes("neuroseo")) return "/neuroseo";
  return null;
}

export function resolveAdminCommandRoute(cmd: string): string | null {
  const c = cmd.trim().toLowerCase();
  if (c.startsWith("/system")) return "/admin/observability";
  if (c.startsWith("/errors")) return "/admin/events";
  if (c.startsWith("/billing")) return "/finance/revenue";
  if (c.startsWith("/users")) return "/insights";
  if (c.startsWith("/performance")) return "/performance";
  return null;
}
