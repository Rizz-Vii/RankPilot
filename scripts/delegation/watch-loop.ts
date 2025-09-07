/* Autonomous delegation watch loop (lightweight) */
import { spawn, spawnSync } from "child_process";
import crypto from "crypto";
import fs, { statSync } from "fs";
import path from "path";

const QUEUE = path.resolve("sessions/aider-queue.jsonl");
const _LOG = path.resolve("sessions/aider-log.jsonl"); // retained for future extended logging
const INTERVAL_BASE = 15000; // 15s base
// Single-instance lock (optional): prevents multiple concurrent watch loops.
const LOCK_FILE = path.resolve(".codex/tmp/delegation.watch.lock");
function obtainLock(): boolean {
  try {
    const now = Date.now();
    if (fs.existsSync(LOCK_FILE)) {
      const raw = fs.readFileSync(LOCK_FILE, "utf8");
      const [pidStr, tsStr] = raw.split(/\s+/);
      const pid = Number(pidStr);
      const ts = Number(tsStr);
      const STALE_MS = Number(
        process.env.DELEGATE_LOCK_STALE_MS || 10 * 60_000
      ); // 10m default
      const stale = !ts || now - ts > STALE_MS;
      if (pid && !stale) {
        try {
          process.kill(pid, 0); // still alive

          console.log(
            "[delegate:loop] lock detected (another instance running) – exiting"
          );
          return false;
        } catch {
          // pid not alive -> treat as stale
        }
      }
    }
    fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    fs.writeFileSync(LOCK_FILE, `${process.pid} ${now}`);
    return true;
  } catch {
    return true; // fail-open
  }
}
if (!obtainLock()) process.exit(0);
let running = false;
let lastHash = "";
let lastPlanHash = "";
const PLAN_TRIGGER =
  process.env.TWO_AGENT_DELEGATION_TRIGGER_FILE ||
  ".codex/tmp/delegation-trigger.signal";
let lastTriggerMtime = 0;

// ANSI color helpers (fallback to plain if NO_COLOR set)
const COLOR = process.env.NO_COLOR
  ? { r: "", y: "", g: "", b: "", dim: "", reset: "" }
  : {
      r: "\x1b[31m",
      y: "\x1b[33m",
      g: "\x1b[32m",
      b: "\x1b[36m",
      dim: "\x1b[2m",
      reset: "\x1b[0m",
    };

// Define a minimal local type for QueueTask used in this script
type QueueTask = {
  taskId: string;
  status: "pending" | "running" | "done" | "failed";
  updatedAt?: string;
  createdAt?: string;
  summary?: string;
  files?: string[];
  estLoc?: number;
  previousFailures?: number;
  domains?: unknown;
};

function categorize(tasks: QueueTask[]) {
  const groups = {
    running: [] as QueueTask[],
    failed: [] as QueueTask[],
    done: [] as QueueTask[],
    pending: [] as QueueTask[],
  };
  for (const t of tasks) {
    if (t.status === "running") groups.running.push(t);
    else if (t.status === "failed") groups.failed.push(t);
    else if (t.status === "done") groups.done.push(t);
    else groups.pending.push(t);
  }
  return groups;
}

function ageSec(ts?: string) {
  if (!ts) return 0;
  const d = Date.parse(ts);
  if (isNaN(d)) return 0;
  return (Date.now() - d) / 1000;
}

/** @param {QueueTask} t @param {number} staleThresholdSec */
function fmtTask(t: QueueTask, staleThresholdSec: number) {
  const a = ageSec(t.updatedAt);
  const stale = t.status === "running" && a > staleThresholdSec;
  const color =
    t.status === "failed"
      ? COLOR.r
      : t.status === "running"
        ? stale
          ? COLOR.r
          : COLOR.y
        : t.status === "done"
          ? COLOR.g
          : COLOR.b;
  const ageLabel = a ? `${Math.round(a)}s` : "-";
  return `${color}${t.taskId}${stale ? "*" : ""}${COLOR.reset}${COLOR.dim}[${t.status},${ageLabel}]${COLOR.reset}`;
}

function renderSnapshot(tasks: QueueTask[]) {
  const groups = categorize(tasks as QueueTask[]);
  const total = tasks.length;
  const staleThresholdSec = Number(process.env.DELEGATE_STALE_SEC || 180); // 3 min default
  const summary = `${COLOR.dim}Σ=${total}${COLOR.reset} ${COLOR.y}R=${groups.running.length}${COLOR.reset} ${COLOR.r}F=${groups.failed.length}${COLOR.reset} ${COLOR.g}D=${groups.done.length}${COLOR.reset} ${COLOR.b}P=${groups.pending.length}${COLOR.reset}`;
  const parts: string[] = [];
  const verbose = process.env.DELEGATE_VERBOSE === "1";
  const show = (label: string, arr: QueueTask[]) => {
    if (!arr.length) return;
    const list = arr
      .slice(0, verbose ? arr.length : 6)
      .map((t) => fmtTask(t, staleThresholdSec))
      .join(", ");
    const more = !verbose && arr.length > 6 ? ` …(+${arr.length - 6})` : "";
    parts.push(`${label}: ${list}${more}`);
  };
  show(`${COLOR.y}Running${COLOR.reset}`, groups.running);
  show(`${COLOR.r}Failed${COLOR.reset}`, groups.failed);
  show(`${COLOR.b}Pending${COLOR.reset}`, groups.pending);
  show(`${COLOR.g}Done${COLOR.reset}`, groups.done);
  const staleRunning = groups.running.filter(
    (t) => ageSec(t.updatedAt) > staleThresholdSec
  );
  if (staleRunning.length)
    parts.push(
      `${COLOR.r}Stale (> ${staleThresholdSec}s):${COLOR.reset} ` +
        staleRunning.map((t) => t.taskId).join(", ")
    );
  return `[delegate:loop] ${summary}\n` + parts.join("\n");
}

function hashPlan(plan: unknown): string {
  try {
    return crypto.createHash("sha1").update(JSON.stringify(plan)).digest("hex");
  } catch {
    return "";
  }
}

// loadPlan removed (unused) to satisfy lint

function readQueueLines(): string[] {
  if (!fs.existsSync(QUEUE)) return [];
  return fs.readFileSync(QUEUE, "utf8").split(/\r?\n/).filter(Boolean);
}

function parseTasks() {
  const lines = readQueueLines();
  const tasks: QueueTask[] = [] as unknown as QueueTask[];
  for (const line of lines.slice(1)) {
    // skip header
    try {
      tasks.push(JSON.parse(line));
    } catch {
      /* ignore */
    }
  }
  return tasks;
}

function hashTasks(tasks: QueueTask[]): string {
  return tasks.map((t) => `${t.taskId}:${t.status}:${t.updatedAt}`).join("|");
}

function pickPending(tasks: QueueTask[]) {
  // Honor optional max concurrency: if running >= limit, skip starting new.
  const maxConc = Number(process.env.DELEGATE_MAX_CONCURRENCY || 0);
  if (maxConc > 0) {
    const runningCount = tasks.filter((t) => t.status === "running").length;
    if (runningCount >= maxConc) return undefined;
  }
  return tasks.find((t) => t.status === "pending");
}

function hasRunning(tasks: QueueTask[]) {
  return tasks.some((t) => t.status === "running");
}

function markRunning(taskId: string) {
  const lines = readQueueLines();
  const out: string[] = [];
  if (!lines.length) return;
  out.push(lines[0]);
  const now = new Date().toISOString();
  for (const line of lines.slice(1)) {
    try {
      const obj = JSON.parse(line);
      if (obj.taskId === taskId && obj.status === "pending") {
        obj.status = "running";
        obj.updatedAt = now;
        out.push(JSON.stringify(obj));
      } else out.push(line);
    } catch {
      out.push(line);
    }
  }
  fs.writeFileSync(QUEUE, out.join("\n") + "\n");
}

function markStatus(taskId: string, from: string, to: string) {
  const lines = readQueueLines();
  if (!lines.length) return;
  const out: string[] = [lines[0]];
  const now = new Date().toISOString();
  for (const line of lines.slice(1)) {
    try {
      const obj = JSON.parse(line);
      if (obj.taskId === taskId && obj.status === from) {
        obj.status = to;
        obj.updatedAt = now;
        out.push(JSON.stringify(obj));
      } else out.push(line);
    } catch {
      out.push(line);
    }
  }
  fs.writeFileSync(QUEUE, out.join("\n") + "\n");
}

function processQueue() {
  if (running) return;
  // If planner trigger file updated, we run an immediate fast pass (skip hashing throttle)
  try {
    if (PLAN_TRIGGER && fs.existsSync(PLAN_TRIGGER)) {
      const st = statSync(PLAN_TRIGGER);
      if (st.mtimeMs > lastTriggerMtime) {
        lastTriggerMtime = st.mtimeMs;

        console.log(
          "[delegate:loop] planner trigger detected, forcing snapshot + dequeue attempt"
        );
        lastHash = ""; // force snapshot render
      }
    }
  } catch {
    /* ignore trigger check */
  }
  const tasks = parseTasks();
  const hash = hashTasks(tasks);
  if (hash !== lastHash) {
    lastHash = hash;
    try {
      const pretty = renderSnapshot(tasks as unknown as QueueTask[]);

      console.log(pretty);
    } catch {
      // fallback minimal

      console.log(
        "[delegate:loop] queue snapshot",
        tasks.map((t) => `${t.taskId}:${t.status}`).join(", ")
      );
    }
  }
  // Auto-fail stale running tasks so queue can make progress
  const STALE_SEC = Number(process.env.DELEGATE_STALE_SEC || 900); // 15m default
  let progressed = false;
  for (const t of tasks) {
    if (t.status === "running") {
      const age = ageSec(t.updatedAt);
      if (age > STALE_SEC) {
        markStatus(t.taskId, "running", "failed");
        progressed = true;

        console.log(
          `${COLOR.r}[delegate:loop] auto-failed stale task${COLOR.reset} ${t.taskId} age=${Math.round(age)}s>`
        );
      }
    }
  }
  if (progressed) return; // will re-evaluate next tick
  if (hasRunning(tasks)) return; // wait for completion

  // (1) Emit / refresh synthesized plan file for hashing & delta detection
  if (process.env.PLAN_HASH_DELTA === "1") {
    try {
      const synthesizedPlan = {
        generatedAt: new Date().toISOString(),
        tasks: tasks.map((t) => ({
          id: t.taskId,
          status: t.status,
          files: (t.files || []).length,
          estLoc: t.estLoc,
        })),
      };
      const planPath = path.resolve(".codex/last-plan.json");
      fs.mkdirSync(path.dirname(planPath), { recursive: true });
      fs.writeFileSync(planPath, JSON.stringify(synthesizedPlan, null, 2));
      const ph = hashPlan(synthesizedPlan);
      if (ph && ph !== lastPlanHash) {
        lastPlanHash = ph;

        console.log("[delegate:loop] plan hash delta", ph.slice(0, 8));
      }
    } catch {
      /* silent */
    }
  }
  const pending = pickPending(tasks);
  if (!pending) return; // nothing to do
  markRunning(pending.taskId);

  // (2) Decide adaptive profile via profile-router (if present)
  let activeProfile = process.env.DEFAULT_PROFILE || "balanced";
  try {
    const routerPath = path.resolve(".codex/scripts/profile-router.ts");
    if (fs.existsSync(routerPath)) {
      const taskMeta = {
        id: pending.taskId,
        summary: pending.summary,
        files: pending.files,
        estLoc: pending.estLoc,
        previousFailures: pending.previousFailures,
        domains: pending.domains,
      };
      const pr = spawnSync("ts-node", [routerPath], {
        input: JSON.stringify(taskMeta),
        encoding: "utf8",
      });
      if (pr.status === 0 && pr.stdout) {
        const decision = JSON.parse(
          pr.stdout.split(/\n/).filter(Boolean).pop() || "{}"
        );
        if (decision.profile) activeProfile = decision.profile;

        console.log(
          `[delegate:loop] profile-router → ${activeProfile} (${decision.reason || "no-reason"})`
        );
      }
    }
  } catch (e: unknown) {
    const msg =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as Record<string, unknown>).message === "string"
        ? ((e as Record<string, unknown>).message as string)
        : String(e);
    console.warn("[delegate:loop] profile router failed", msg);
  }

  running = true;
  const started = Date.now();
  const proc = spawn("npm", ["run", "delegate:process"], {
    stdio: "inherit",
    env: { ...process.env, AIDER_AUTORUN: "1", ACTIVE_PROFILE: activeProfile },
  });
  proc.on("exit", (code) => {
    const durMs = Date.now() - started;

    console.log(
      `[delegate:loop] delegate:process exited code=${code} duration=${durMs}ms`
    );
    if (process.env.TOKEN_LEDGER === "1") {
      try {
        const metricsPath = path.resolve(".codex/tmp/last-token-stats.json");
        let tokenStats: {
          input_tokens?: number;
          input_tokens_est?: number;
          output_tokens?: number;
          output_tokens_est?: number;
          tool_calls?: number;
        } | null = null;
        if (fs.existsSync(metricsPath)) {
          try {
            tokenStats = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
          } catch {
            tokenStats = null;
          }
        }
        const ledgerLine = {
          ts: Date.now(),
          taskId: pending.taskId,
          profile: activeProfile,
          input_tokens:
            tokenStats?.input_tokens ?? tokenStats?.input_tokens_est ?? 0,
          output_tokens:
            tokenStats?.output_tokens ?? tokenStats?.output_tokens_est ?? 0,
          tool_calls: tokenStats?.tool_calls ?? 0,
          success: code === 0,
        };
        fs.appendFileSync(
          ".codex/token-ledger.jsonl",
          JSON.stringify(ledgerLine) + "\n"
        );
      } catch {
        /* ignore ledger append */
      }
    }
    running = false;
  });
}

setInterval(processQueue, INTERVAL_BASE);
processQueue();
