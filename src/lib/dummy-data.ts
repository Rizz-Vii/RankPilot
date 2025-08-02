// src/lib/dummy-data.ts

export interface ContentBrief {
  id: string;
  title: string;
  primaryKeyword: string;
  searchIntent: string;
  seoScore: string;
}

export const dummyContentBriefs: ContentBrief[] = [
  {
    id: "brief-1",
    title: "How to Rank #1 for “Best CRM Software”",
    primaryKeyword: "best crm software",
    searchIntent: "Commercial",
    seoScore: "82/100",
  },
  {
    id: "brief-2",
    title: "On-Page SEO Checklist for 2025",
    primaryKeyword: "on-page seo checklist",
    searchIntent: "Informational",
    seoScore: "76/100",
  },
  {
    id: "brief-3",
    title: "AI Tools for Keyword Clustering",
    primaryKeyword: "keyword clustering",
    searchIntent: "Commercial",
    seoScore: "88/100",
  },
];

export const dummyDashboardData = {
  seoScore: {
    current: 78,
    change: 3,
  },
  trackedKeywords: {
    current: 1204,
    change: 52,
  },
  activeProjects: {
    current: 5,
    change: 0,
  },
  seoScoreTrend: [
    { date: "2024-05-01", score: 65 },
    { date: "2024-05-08", score: 68 },
    { date: "2024-05-15", score: 72 },
    { date: "2024-05-22", score: 71 },
    { date: "2024-05-29", score: 75 },
    { date: "2024-06-05", score: 78 },
  ],
  keywordVisibility: {
    score: 68,
    top3: 50,
    top10: 250,
    top100: 800,
  },
  domainAuthority: {
    score: 55,
    history: [
      { date: "2024-01-01", score: 48 },
      { date: "2024-02-01", score: 50 },
      { date: "2024-03-01", score: 51 },
      { date: "2024-04-01", score: 52 },
      { date: "2024-05-01", score: 54 },
      { date: "2024-06-01", score: 55 },
    ],
  },
  backlinks: {
    total: 4208,
    newLast30Days: 156,
    history: [
      { month: "Jan", new: 80, lost: 20 },
      { month: "Feb", new: 95, lost: 30 },
      { month: "Mar", new: 120, lost: 25 },
      { month: "Apr", new: 150, lost: 40 },
      { month: "May", new: 180, lost: 35 },
      { month: "Jun", new: 156, lost: 50 },
    ],
  },
  trafficSources: [
    { name: "Organic Search", _value: 65, fill: "var(--color-chart-1)" },
    { name: "Direct", _value: 20, fill: "var(--color-chart-2)" },
    { name: "Referral", _value: 10, fill: "var(--color-chart-3)" },
    { name: "Social", _value: 5, fill: "var(--color-chart-4)" },
  ],
};
