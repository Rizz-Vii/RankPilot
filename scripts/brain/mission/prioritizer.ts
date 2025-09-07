import fs from "fs";
import path from "path";
import type { MemoryEvent } from "../state/memory";

let recordMemory: undefined | ((ev: MemoryEvent) => void);
try {
  recordMemory = require("../state/memory").recordMemory as (
    ev: MemoryEvent
  ) => void;
} catch {}

export interface EnhancementPreference {
  rank: number;
  id: number;
  title: string;
  reason: string;
}
export interface EnhancementAnalysis {
  ts: number;
  ordering: EnhancementPreference[];
  context: {
    tsErrors: number;
    lintErrors: number;
    lintWarnings: number;
    immediateSteps: number;
  };
  rawMission?: unknown;
}

// IDs:
// 1 tasks from immediateSteps
// 2 lineage IDs
// 3 incremental thinking diff
// 4 feed mission diagnostics into planner
// 5 adaptive retry tasks

/**
 * Prioritize enhancement vectors for the brain.
 *
 * Synthetic (runtime injected) enhancement IDs:
 * 0  Urgent: Resolve TypeScript errors (only when tsErrors > 0)
 * 6  Resolve ESLint errors (only when lintErrors > 0)
 *
 * These do not exist in the base scores object; they are injected so their
 * presence is entirely conditional on live diagnostics. They must therefore
 * be added before computing the final ordering. Score formulas intentionally
 * dominate (TS) or strongly compete (Lint) with the static initiatives to
 * ensure remediation is surfaced first when the codebase is in a degraded state.
 */
export function prioritizeEnhancements(mission?: unknown): EnhancementAnalysis {
  const m = mission as
    | {
        diagnostics?: {
          typecheck?: { errors?: number };
          lint?: { errors?: number; warnings?: number };
        };
        immediateSteps?: unknown[];
      }
    | undefined;
  const tsErrors = m?.diagnostics?.typecheck?.errors ?? 0;
  const lintErrors = m?.diagnostics?.lint?.errors ?? 0;
  const lintWarnings = m?.diagnostics?.lint?.warnings ?? 0;
  const immediateSteps = (m?.immediateSteps || []).length;

  const scores: Record<
    number,
    { score: number; title: string; reason: string }
  > = {
    1: {
      score: 10,
      title: "Auto-generate tasks from immediateSteps",
      reason: "Turns mission output into executable queue tasks.",
    },
    2: {
      score: 4,
      title: "Add lineage IDs",
      reason: "Improves traceability and refinement loops.",
    },
    3: {
      score: 2,
      title: "Incremental brainThinking diff",
      reason: "Reduces noise; quality-of-life improvement.",
    },
    4: {
      score: 8,
      title: "Feed mission diagnostics into planner context",
      reason: "Directly increases planning relevance.",
    },
    5: {
      score: 6,
      title: "Adaptive retry tasks",
      reason: "Automates recovery from persistent failures.",
    },
  };
  if (tsErrors > 0) {
    scores[4].score += 4;
    scores[5].score += 3;
  }
  if (lintErrors > 0) {
    scores[1].score += 3;
    scores[4].score += 2;
  }
  if (immediateSteps > 0) {
    scores[1].score += 2;
    scores[2].score += 2;
  }
  if (lintWarnings > 150) {
    scores[3].score += 1;
  }

  // Inject synthetic urgent remediation entries (IDs 0 & 6) conditionally.
  if (tsErrors > 0) {
    scores[0] = {
      score: 100 + tsErrors, // Always dominates static initiatives; slight scaling by error count.
      title: "Urgent: Resolve TypeScript errors",
      reason: `Compilation blockers impede progress (tsErrors=${tsErrors}).`,
    };
  }
  if (lintErrors > 0) {
    scores[6] = {
      score: 80 + lintErrors, // Below TS urgency but still very high so it competes for top spots.
      title: "Resolve ESLint errors",
      reason: `Lint errors reduce code health (lintErrors=${lintErrors}).`,
    };
  }

  const ordering = Object.entries(scores)
    .map(([id, v]) => ({
      id: Number(id),
      title: v.title,
      score: v.score,
      reason: v.reason,
    }))
    .sort((a, b) => b.score - a.score)
    .map((o, i) => ({
      rank: i + 1,
      id: o.id,
      title: o.title,
      reason: `${o.reason} (score=${o.score})`,
    }));

  const analysis: EnhancementAnalysis = {
    ts: Date.now(),
    ordering,
    context: { tsErrors, lintErrors, lintWarnings, immediateSteps },
    rawMission: mission,
  };
  const dir = path.join(process.cwd(), "artifacts", "brain");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(
    path.join(dir, "brainAnswers.jsonl"),
    JSON.stringify(analysis) + "\n"
  );
  try {
    recordMemory &&
      recordMemory({
        ts: analysis.ts,
        source: "brain",
        kind: "answer",
        status: "ok",
        meta: {
          top: ordering[0]?.id,
          ordering: ordering.slice(0, 3).map((o) => o.id),
        },
      });
  } catch {}
  return analysis;
}

export default { prioritizeEnhancements };
