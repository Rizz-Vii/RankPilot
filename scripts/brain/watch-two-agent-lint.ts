#!/usr/bin/env ts-node
/**
 * Periodic watcher: generate fresh lint JSON, run two-agent lint cycle, rely on existing
 * delegation loop to process tasks. Intended to be safe (no refactors beyond queued tasks).
 */
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

function runInherit(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  return res.status === 0;
}

function runCapture(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    ok: res.status === 0,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
  };
}

function main() {
  const intervalMs = Number(process.env.TWO_AGENT_INTERVAL_MS || 120000); // 2 min default
  const drain = process.env.TWO_AGENT_DRAIN === "1";
  if (process.env.TWO_AGENT_ONCE === "1" || drain) {
    runDrainLoop({ drain });
    return;
  }
  console.log(`[two-agent:watch] starting interval=${intervalMs}ms`);
  setInterval(() => runDrainLoop({ drain: false }), intervalMs);
  runDrainLoop({ drain: false });
}

interface DrainOptions {
  drain: boolean;
}

function runDrainLoop(opts: DrainOptions) {
  const {
    TWO_AGENT_AUTOFIX_FIRST,
    TWO_AGENT_SELF_PROCESS,
    TWO_AGENT_SELF_PROCESS_ROUNDS,
    TWO_AGENT_MAX_DRAIN_CYCLES,
  } = process.env as Record<string, string | undefined>;

  const maxDrainCycles = Number(TWO_AGENT_MAX_DRAIN_CYCLES || 20);
  const selfProcessRounds = Number(TWO_AGENT_SELF_PROCESS_ROUNDS || 3);

  let cycleIndex = 0;
  while (true) {
    cycleIndex++;
    console.log(`[two-agent:watch] === DrainCycle ${cycleIndex} ===`);
    if (TWO_AGENT_AUTOFIX_FIRST === "1") {
      console.log("[two-agent:watch] running eslint autofix pass...");
      runInherit("npm", ["run", "eslint:autofix-all"]);
    }
    const issuesBefore = generateLintReportGetCount();
    console.log(`[two-agent:watch] issues before planning: ${issuesBefore}`);
    const planResult = runPlanningCycle();
    if (planResult && planResult.planned && TWO_AGENT_SELF_PROCESS === "1") {
      for (let i = 0; i < selfProcessRounds; i++) {
        console.log(
          `[two-agent:watch] self-processing delegation queue round ${i + 1}/${selfProcessRounds}`
        );
        const handled = runInherit("npm", ["run", "delegation:process"]);
        if (!handled) break;
      }
    }
    const issuesAfter = generateLintReportGetCount();
    console.log(`[two-agent:watch] issues after processing: ${issuesAfter}`);
    const improved = issuesAfter < issuesBefore;
    if (!opts.drain) break;
    if (issuesAfter === 0) {
      console.log(
        "[two-agent:watch] all lint issues resolved. Exiting drain loop."
      );
      break;
    }
    if (!improved && (planResult?.planned || 0) === 0) {
      console.log(
        "[two-agent:watch] no improvements and no new tasks; stopping to avoid churn."
      );
      break;
    }
    if (cycleIndex >= maxDrainCycles) {
      console.log("[two-agent:watch] reached max drain cycles limit.");
      break;
    }
  }
}

function runPlanningCycle() {
  console.log("[two-agent:watch] planning remediation tasks...");
  const cycle = runCapture("npm", [
    "run",
    "--silent",
    "brain:two-agent:lint-cycle",
  ]);
  if (!cycle.ok) {
    console.warn("[two-agent:watch] planning cycle failed");
    if (cycle.stderr) console.warn(cycle.stderr.trim());
    return undefined;
  }
  const lines = cycle.stdout.trim().split(/\r?\n/);
  const last = lines
    .reverse()
    .find((l) => l.trim().startsWith("{") && l.trim().endsWith("}"));
  if (!last) {
    console.warn("[two-agent:watch] no JSON line detected in cycle output");
    return undefined;
  }
  try {
    const parsed = JSON.parse(last);
    summarizeCycle(parsed);
    return parsed;
  } catch (e) {
    const msg =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as { message?: unknown }).message === "string"
        ? (e as { message?: string }).message
        : String(e);
    console.warn("[two-agent:watch] failed to parse JSON output", msg);
    return undefined;
  }
}

function generateLintReportGetCount(): number {
  console.log("[two-agent:watch] generating lint report...");
  runInherit("npm", ["run", "lint:report:json"]);
  try {
    const raw = readFileSync("artifacts/eslint-report.json", "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return 0;
    let total = 0;
    for (const fileRes of data) {
      if (fileRes && Array.isArray(fileRes.messages))
        total += fileRes.messages.length;
    }
    return total;
  } catch {
    return 0;
  }
}

function summarizeCycle(result: unknown) {
  const o =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};
  const planned = o.planned as number | undefined;
  const drift = o.drift as number | string | undefined;
  const adaptiveMax = o.adaptiveMax as number | undefined;
  const considered = o.considered as number | undefined;
  const skippedDueToHash = Boolean(o.skippedDueToHash);
  const summary = {
    planned,
    drift,
    adaptiveMax,
    considered,
    skippedDueToHash,
    taskIds: Array.isArray(o.taskIds) ? o.taskIds : undefined,
    timestamp:
      (typeof o.timestamp === "string" && o.timestamp) ||
      new Date().toISOString(),
  };
  const concise = `[two-agent:watch] cycle planned=${planned} drift=${drift ?? "n/a"} adaptiveMax=${adaptiveMax ?? "n/a"} considered=${considered ?? "n/a"}${skippedDueToHash ? " (skippedDueToHash)" : ""}`;
  if (!process.env.TWO_AGENT_JSON_ONLY) console.log(concise);
  try {
    const artifactsDir = path.resolve("artifacts");
    if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(
      path.join(artifactsDir, "two-agent-last-cycle.json"),
      JSON.stringify(summary, null, 2)
    );
  } catch {
    /* ignore */
  }
  if (process.env.TWO_AGENT_EMIT_JSON_LINE === "1") {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  }
}

if (require.main === module) main();
