#!/usr/bin/env ts-node
/**
 * Planner-only loop for the two-agent remediation system.
 * Runs the planning (reviewer + supervisor enqueue) cycle on an interval
 * WITHOUT invoking the delegation processor. This lets you:
 *   - Run planning in one VS Code task / terminal
 *   - Run the delegation queue processor (e.g. `delegate:loop`) in another
 * Avoid running this simultaneously with the unified `brain:two-agent:auto`
 * script to prevent duplicate planning or hash churn.
 */
import {
  existsSync,
  writeFileSync as fsWrite,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { setTimeout as sleep } from "timers/promises";

// Lazy require (CommonJS interop) – attribution: internal supervisor module.
// Intentionally not using dynamic import to avoid ts-node ESM resolution overhead.

const twoAgentMod = require("../../src/lib/brain/supervisor/twoAgentOrchestration.ts");
interface LintCycleResult {
  planned: number;
  drift?: number;
  adaptiveMax?: number;
  considered: number;
  skippedDueToHash?: boolean;
}

const runTwoAgentLintCycle = twoAgentMod.runTwoAgentLintCycle as (opts: {
  maxTasks?: number;
}) => Promise<LintCycleResult>;

const MAX_ITERS = Number(process.env.TWO_AGENT_PLAN_LOOP_ITERS || 50);
const MAX_MINUTES = Number(process.env.TWO_AGENT_PLAN_LOOP_MINUTES || 30);
const INTERVAL_MS = Number(
  process.env.TWO_AGENT_PLAN_LOOP_INTERVAL_MS || 45000
); // 45s default
const START = Date.now();
const TRIGGER_FILE =
  process.env.TWO_AGENT_DELEGATION_TRIGGER_FILE ||
  ".codex/tmp/delegation-trigger.signal";
const TRIGGER_ENABLED = process.env.TWO_AGENT_DELEGATION_TRIGGER !== "0";

function mins() {
  return (Date.now() - START) / 60000;
}

const PID_FILE = ".codex/tmp/pid-two-agent-plan-loop";
const HEARTBEAT_FILE = ".codex/tmp/two-agent-plan-heartbeat.json";
const FORCE = process.env.TWO_AGENT_PLAN_LOOP_FORCE === "1";

function ensureSingleInstance() {
  try {
    mkdirSync(".codex/tmp", { recursive: true });
    if (existsSync(PID_FILE)) {
      const raw = readFileSync(PID_FILE, "utf8").trim();
      const priorPid = parseInt(raw, 10);
      if (!isNaN(priorPid) && priorPid !== process.pid) {
        const procExists = existsSync(`/proc/${priorPid}`);
        if (procExists && !FORCE) {
          console.log(
            `[two-agent:plan-loop] existing instance detected (pid=${priorPid}); exiting secondary invocation (set TWO_AGENT_PLAN_LOOP_FORCE=1 to override).`
          );
          process.exit(0);
        } else if (procExists && FORCE) {
          console.log(
            `[two-agent:plan-loop] FORCE override active; proceeding despite existing pid=${priorPid}.`
          );
        } else {
          // Stale lock
          rmSync(PID_FILE, { force: true });
        }
      }
    }
    fsWrite(PID_FILE, String(process.pid));
    process.on("exit", () => {
      try {
        rmSync(PID_FILE);
      } catch {
        /* ignore */
      }
    });
    process.on("SIGINT", () => {
      try {
        rmSync(PID_FILE);
      } catch {
        /* ignore */
      }
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      try {
        rmSync(PID_FILE);
      } catch {
        /* ignore */
      }
      process.exit(0);
    });
  } catch {
    /* ignore lock errors */
  }
}

async function main() {
  ensureSingleInstance();
  console.log(
    `[two-agent:plan-loop] start maxIters=${MAX_ITERS} maxMinutes=${MAX_MINUTES} intervalMs=${INTERVAL_MS}`
  );
  for (let iter = 1; iter <= MAX_ITERS; iter++) {
    if (mins() > MAX_MINUTES) {
      console.log("[two-agent:plan-loop] time budget reached, exiting");
      break;
    }
    try {
      const cycle = await runTwoAgentLintCycle({
        maxTasks: Number(process.env.TWO_AGENT_MAX_TASKS || 5),
      });
      // Heartbeat (cheap overwrite)
      try {
        const hb = {
          ts: new Date().toISOString(),
          iter,
          planned: cycle.planned,
          considered: cycle.considered,
          drift: cycle.drift ?? null,
          adaptiveMax: cycle.adaptiveMax ?? null,
          skippedDueToHash: !!cycle.skippedDueToHash,
        };
        mkdirSync(path.dirname(HEARTBEAT_FILE), { recursive: true });
        writeFileSync(HEARTBEAT_FILE, JSON.stringify(hb));
      } catch {
        /* ignore heartbeat errors */
      }
      console.log(
        `[two-agent:plan-loop] iter=${iter} planned=${cycle.planned} considered=${cycle.considered} drift=${cycle.drift ?? "n/a"} adaptiveMax=${cycle.adaptiveMax ?? "n/a"}${cycle.skippedDueToHash ? " (skippedDueToHash)" : ""}`
      );
      if (TRIGGER_ENABLED && cycle.planned > 0) {
        try {
          const abs = path.resolve(TRIGGER_FILE);
          mkdirSync(path.dirname(abs), { recursive: true });
          writeFileSync(abs, String(Date.now()));
          console.log(
            `[two-agent:plan-loop] delegation trigger emitted → ${abs}`
          );
        } catch (e) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? (e as { message?: string }).message
              : String(e);
          console.warn("[two-agent:plan-loop] trigger emit failed", msg);
        }
      }
      // Early exit heuristic: if planner produced nothing AND hash matched, wait a longer backoff once.
      if (cycle.planned === 0 && cycle.skippedDueToHash) {
        const backoff = Math.min(INTERVAL_MS * 2, 180000);
        console.log(
          `[two-agent:plan-loop] unchanged hash; extended sleep ${backoff}ms`
        );
        await sleep(backoff);
      } else {
        await sleep(INTERVAL_MS);
      }
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? (e as { message?: string }).message
          : String(e);
      console.warn("[two-agent:plan-loop] cycle error", msg);
      await sleep(Math.min(INTERVAL_MS * 2, 120000));
    }
  }
  console.log("[two-agent:plan-loop] finished");
}

main().catch((e) => {
  const msg =
    e && typeof e === "object" && "message" in e
      ? (e as { message?: string }).message
      : String(e);
  console.error("[two-agent:plan-loop] fatal", msg);
  process.exit(1);
});
