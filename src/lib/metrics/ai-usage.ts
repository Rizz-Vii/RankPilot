// AI Usage & Subtool Telemetry (Phase 2)
// Lightweight in-process rolling 24h counters (reset opportunistically after inactivity)

interface AIUsageBucket {
  ts: number; // epoch ms
  in: number;
  out: number;
  cost: number;
}

const BUCKET_MS = 1000 * 60 * 5; // 5‑minute buckets
const WINDOW_MS = 1000 * 60 * 60 * 24; // 24h

let buckets: AIUsageBucket[] = [];
const subtoolRuns: Record<string, number[]> = {}; // featureKey -> timestamps

function prune(now: number) {
  const cutoff = now - WINDOW_MS;
  buckets = buckets.filter((b) => b.ts >= cutoff);
  for (const k of Object.keys(subtoolRuns)) {
    subtoolRuns[k] = subtoolRuns[k].filter((ts) => ts >= cutoff);
  }
}

function getCostPerToken(model: string, dir: "in" | "out"): number {
  // Simple heuristic; allow env overrides (USD per 1K tokens)
  const baseIn = Number(process.env.AI_COST_INPUT_PER_1K || "0.0015");
  const baseOut = Number(process.env.AI_COST_OUTPUT_PER_1K || "0.002");
  // Basic model weighting example (can extend later)
  if (/claude/i.test(model))
    return (dir === "in" ? baseIn * 1.2 : baseOut * 1.2) / 1000;
  if (/gemini/i.test(model))
    return (dir === "in" ? baseIn * 0.9 : baseOut * 0.9) / 1000;
  return (dir === "in" ? baseIn : baseOut) / 1000; // convert to per token
}

export function recordAIUsage(
  approxInputTokens: number,
  approxOutputTokens: number,
  model: string
) {
  const now = Date.now();
  prune(now);
  const bucketKey = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  let bucket = buckets.find((b) => b.ts === bucketKey);
  if (!bucket) {
    bucket = { ts: bucketKey, in: 0, out: 0, cost: 0 };
    buckets.push(bucket);
  }
  bucket.in += approxInputTokens;
  bucket.out += approxOutputTokens;
  bucket.cost +=
    approxInputTokens * getCostPerToken(model, "in") +
    approxOutputTokens * getCostPerToken(model, "out");
}

export function recordSubtoolRun(featureKey: string) {
  const now = Date.now();
  prune(now);
  if (!subtoolRuns[featureKey]) subtoolRuns[featureKey] = [];
  subtoolRuns[featureKey].push(now);
}

export function getAIUsage24h() {
  prune(Date.now());
  const totals = buckets.reduce(
    (acc, b) => {
      acc.in += b.in;
      acc.out += b.out;
      acc.cost += b.cost;
      return acc;
    },
    { in: 0, out: 0, cost: 0 }
  );
  return {
    tokensIn: totals.in,
    tokensOut: totals.out,
    costEstimate: +totals.cost.toFixed(4),
  };
}

export function getSubtoolUsage24h(): Record<string, number> {
  prune(Date.now());
  const snap: Record<string, number> = {};
  for (const k of Object.keys(subtoolRuns)) snap[k] = subtoolRuns[k].length;
  return snap;
}

// Utility for rough token estimation (char length / 4)
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
