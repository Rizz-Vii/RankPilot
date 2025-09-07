#!/usr/bin/env ts-node
/**
 * Seed Legacy Semantic Map Result Documents (T14 support)
 * Purpose: Populate Firestore `semanticMapResults` with representative LARGE docs (>2.5KB)
 * so size-reduction scan + backfill pipeline can produce semantic reduction metrics.
 *
 * Usage:
 *   npm run seed:semantic-map-legacy                 # seeds default count (3)
 *   SEED_COUNT=10 npm run seed:semantic-map-legacy   # custom doc count
 *   USER_ID=testUser TEAM_ID=testTeam ... (optional env overrides)
 *
 * Safe: Idempotent-ish – generates random URLs; repeated runs just add more samples.
 * NOTE: Run only in local/dev or staging. Do NOT run in production without review.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

interface LargeSemanticDoc {
  userId: string;
  url: string;
  overallScore: number;
  topicClusters: Array<{
    topic: string;
    semanticScore: number;
    opportunity: string;
  }>;
  keywordAnalysis: Array<{ keyword: string; semanticRelevance: number }>;
  contentAnalysis: {
    readabilityScore: number;
    contentDepth: number;
    topicCoverage: number;
    semanticRichness: number;
    expertiseSignals: number;
  };
  semanticGraph: { nodes: unknown[]; edges: unknown[] };
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
  }>;
  createdAt: unknown;
}

function makeLargeDoc(i: number, userId: string): LargeSemanticDoc {
  const rand = (seed: number) => (Math.sin(seed) + 1) * 50;
  const topicClusters = Array.from({ length: 12 }).map((_, t) => ({
    topic: `topic_${i}_${t}`,
    semanticScore: +(70 + (rand(i * 100 + t) % 30)).toFixed(2),
    opportunity: ["high", "medium", "low"][t % 3],
  }));
  const keywordAnalysis = Array.from({ length: 30 }).map((_, k) => ({
    keyword: `kw_${i}_${k}`,
    semanticRelevance: +(50 + (rand(i * 200 + k) % 50)).toFixed(2),
  }));
  const contentAnalysis = {
    readabilityScore: 80 + (i % 5),
    contentDepth: 70 + (i % 10),
    topicCoverage: 75 + (i % 8),
    semanticRichness: 65 + (i % 7),
    expertiseSignals: 72 + (i % 6),
  };
  const nodes = Array.from({ length: 40 }).map((_, n) => ({
    id: `n${i}_${n}`,
    label: `L${n}`,
    type: "concept",
    score: +rand(i * 300 + n).toFixed(2),
  }));
  const edges = Array.from({ length: 60 }).map((_, e) => ({
    source: `n${i}_${e % 40}`,
    target: `n${i}_${(e * 3) % 40}`,
    weight: +(Math.random() * 1.5).toFixed(2),
  }));
  const recommendations = Array.from({ length: 15 }).map((_, r) => ({
    type: ["content", "keyword", "structure", "semantic"][r % 4],
    priority: ["high", "medium", "low"][r % 3],
    title: `Recommendation ${r}`,
    description: `Improve aspect ${r} for doc ${i}`,
    impact: ["traffic", "conversion", "authority"][r % 3],
  }));
  return {
    userId,
    url: `https://example.dev/seed/semantic/${i}-${Date.now()}`,
    overallScore: 70 + (i % 25),
    topicClusters,
    keywordAnalysis,
    contentAnalysis,
    semanticGraph: { nodes, edges },
    recommendations,
    createdAt: FieldValue.serverTimestamp(),
  };
}

async function main() {
  if (!getApps().length) initializeApp();
  const db = getFirestore();
  const count = parseInt(process.env.SEED_COUNT || "3", 10);
  const userId = process.env.USER_ID || "seedUser_semantic";
  console.log(
    `[seed-semantic-map-legacy] Seeding ${count} legacy semanticMapResults docs (userId=${userId})`
  );
  let written = 0;
  for (let i = 0; i < count; i++) {
    const doc = makeLargeDoc(i, userId);
    const sizeBytes = Buffer.byteLength(JSON.stringify(doc));
    await db
      .collection("semanticMapResults")
      .add(doc as unknown as Record<string, unknown>);
    written++;
    console.log(`[seed] #${i + 1} size=${sizeBytes} bytes url=${doc.url}`);
  }
  console.log(`[seed-semantic-map-legacy] COMPLETE written=${written}`);
  console.log(
    "Next: run `npm run scan:neuroseo-large:ci` then backfill and size report:"
  );
  console.log("  npm run scan:neuroseo-large:ci");
  console.log("  npm run backfill:semantic-map-agg");
  console.log("  npm run report:neuroseo-size:ci");
}

main().catch((e) => {
  console.error("[seed-semantic-map-legacy] FAILED", e);
  process.exit(1);
});
