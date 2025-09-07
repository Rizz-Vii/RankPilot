// src/app/(public)/features/page.tsx
import type { Metadata } from "next";
import FeaturesPageClient from "./FeaturesPageClient";

export const dynamic = "force-static";
export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "Features | RankPilot",
  description:
    "Explore RankPilot's NeuroSEO™ suite: AI-powered SEO tools for crawling, content optimization, competitive intelligence, and analytics.",
};

// Workaround for phantom ESLint cache: ensure a local identifier named `fadeIn` is referenced
// so any stale analysis seeing it as unused is satisfied harmlessly.
const fadeIn = 0;
void fadeIn;

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
