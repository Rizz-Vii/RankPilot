/**
 * Demo/fallback data for AI tools when real data isn't available
 */

import type { SuggestKeywordsOutput } from "@/ai/flows/keyword-suggestions";
import type { AuditUrlOutput } from "@/ai/flows/seo-audit";
import type { CompetitorAnalysisOutput } from "@/ai/flows/competitor-analysis";

export const demoKeywordData: SuggestKeywordsOutput & { suggestions?: unknown[] } = {
  keywords: [
    { keyword: "digital marketing", searchVolume: 12500, difficulty: 75 },
    { keyword: "SEO optimization", searchVolume: 8900, difficulty: 68 },
    { keyword: "content marketing strategy", searchVolume: 5400, difficulty: 62 },
    { keyword: "social media marketing", searchVolume: 15600, difficulty: 71 },
    { keyword: "email marketing campaigns", searchVolume: 4200, difficulty: 55 },
    { keyword: "search engine optimization", searchVolume: 9800, difficulty: 73 },
    { keyword: "marketing automation", searchVolume: 6700, difficulty: 59 },
    { keyword: "brand awareness strategy", searchVolume: 3100, difficulty: 48 },
    { keyword: "conversion rate optimization", searchVolume: 4800, difficulty: 64 },
    { keyword: "digital advertising", searchVolume: 7200, difficulty: 67 }
  ],
  suggestions: [
    { keyword: "digital marketing", searchVolume: 12500, difficulty: 75 },
    { keyword: "SEO optimization", searchVolume: 8900, difficulty: 68 }
  ]
};

export const demoSeoAuditData = {
  url: "https://example.com",
  overallScore: 78,
  summary: "Good overall SEO foundation with opportunities in page speed and internal linking.",
  items: [
    { id: "title-tags", name: "Title Tags", score: 85, details: "Title tags are properly optimized with target keywords and under 60 characters.", status: 'good' },
    { id: "meta-descriptions", name: "Meta Descriptions", score: 72, details: "Meta descriptions present but could be more compelling for CTR.", status: 'warning' },
    { id: "heading-structure", name: "Heading Structure", score: 90, details: "Proper H1-H6 hierarchy with keyword optimization.", status: 'good' },
    { id: "mobile-friendly", name: "Mobile Friendliness", score: 95, details: "Site is fully responsive and mobile-optimized.", status: 'good' },
    { id: "page-speed", name: "Page Speed", score: 65, details: "Page load time could be improved. Consider image optimization.", status: 'warning' },
    { id: "internal-links", name: "Internal Linking", score: 45, details: "Limited internal linking structure. Improve navigation and link equity distribution.", status: 'error' }
  ]
};

export function getDemoData(tool: string): unknown {
  switch (tool) {
    case "keyword-tool": return demoKeywordData;
    case "seo-audit": return demoSeoAuditData;
    default:
      return null;
  }
}
