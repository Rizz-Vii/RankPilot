#!/usr/bin/env ts-node
/**
 * Unified autorun for two-agent planning + queue processing.
 * Steps:
 * 1. Run planning cycle (generates artifacts + enqueues tasks if hash changed).
 * 2. Process delegation queue (autorun mode) for a configurable number of tasks or minutes.
 * 3. Repeat until max iterations or time budget.
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";

const queueUtils = require("./queue-utils.ts");
const readQueue = queueUtils.readQueue as () => { status: string }[];
// Lazy-load TS module to avoid .js path resolution issues in ts-node NodeNext mode.
async function loadTwoAgent() {
  // Use require to load TS directly; ts-node registers for this script context.

  const mod = require("../../src/lib/brain/supervisor/twoAgentOrchestration.ts");
  return mod.runTwoAgentLintCycle as (opts: {
    maxTasks?: number;
  }) => Promise<{ planned: number }>;
}

const MAX_ITERS = Number(process.env.TWO_AGENT_AUTORUN_ITERS || 3);
const MAX_MINUTES = Number(process.env.TWO_AGENT_AUTORUN_MINUTES || 10);
const START = Date.now();

function minutesElapsed() {
  return (Date.now() - START) / 60000;
}

const FORCE_REPLAN_AFTER = Number(
  process.env.TWO_AGENT_FORCE_REPLAN_AFTER || 2
); // consecutive zero cycles
const FORCE_REPLAN_QUEUE_MIN = Number(
  process.env.TWO_AGENT_FORCE_REPLAN_QUEUE_MIN || 5
); // pending threshold
const FORCE_REPLAN_ENABLED = process.env.TWO_AGENT_FORCE_REPLAN !== "0";
const LAST_HASH_FILE = ".codex/tmp/two-agent-last-hash.txt";

async function main() {
  let consecutiveZero = 0;
  for (let iter = 1; iter <= MAX_ITERS; iter++) {
    if (minutesElapsed() > MAX_MINUTES) break;
    const runTwoAgentLintCycle = await loadTwoAgent();
    const cycle = await runTwoAgentLintCycle({
      maxTasks: Number(process.env.TWO_AGENT_MAX_TASKS || 5),
    });
    // Always process queue in autorun mode if OPENAI key exists.
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_GPT5_KEY) {
      const res = spawnSync(
        "ts-node",
        [
          "-P",
          "scripts/tsconfig.json",
          "scripts/delegation/process-delegation-queue.ts",
        ],
        { stdio: "inherit" }
      );
      if (res.status !== 0) {
        console.warn("[autorun] queue processor exit", res.status);
      }
    } else {
      console.log("[autorun] OPENAI_API_KEY missing; skipping aider run.");
    }
    const remaining = readQueue().filter((t) => t.status === "pending").length;
    console.log(
      `[autorun] iter=${iter} planned=${cycle.planned} remainingPending=${remaining}`
    );
    if (cycle.planned === 0) {
      consecutiveZero++;
    } else {
      consecutiveZero = 0;
    }
    // Force replan logic: if queue still large but planner hash unchanged for N consecutive iterations
    if (
      FORCE_REPLAN_ENABLED &&
      consecutiveZero >= FORCE_REPLAN_AFTER &&
      remaining >= FORCE_REPLAN_QUEUE_MIN
    ) {
      try {
        if (existsSync(LAST_HASH_FILE)) {
          const prev = readFileSync(LAST_HASH_FILE, "utf8").trim();
          unlinkSync(LAST_HASH_FILE);
          console.log(
            `[autorun][force-replan] cleared-hash prevHash=${prev} zeroCycles=${consecutiveZero} pending=${remaining} after>=${FORCE_REPLAN_AFTER}`
          );
          try {
            require("fs").appendFileSync(
              "metrics-snapshots.log",
              `twoAgentForceReplan ${Date.now()} zeroCycles=${consecutiveZero} pending=${remaining} prevHash=${prev}\n`
            );
          } catch {
            /* ignore */
          }
          consecutiveZero = 0; // reset so next iter replans
        }
      } catch (e) {
        const msg =
          e &&
          typeof e === "object" &&
          "message" in (e as Record<string, unknown>)
            ? (e as { message?: unknown }).message
            : e;
        console.warn("[autorun] force-replan hash clear failed", String(msg));
      }
    }
    if (!cycle.planned && remaining === 0) break; // nothing new & empty queue
  }
}

main().catch((e) => {
  const msg =
    e && typeof e === "object" && "message" in (e as Record<string, unknown>)
      ? (e as { message?: unknown }).message
      : e;
  console.error("[autorun] fatal", String(msg));
  process.exit(1);
});
