import { execSync } from "child_process";
import fs from "fs";
import type { Task } from "../../../types/brain";
import { checkBatchLimits } from "../governance/guards";
import { getRunnersFor } from "./toolRegistry";

// Lightweight styling (mirrors brain CLI; no external deps)
const useColor = !process.env.NO_COLOR;
const c = (code: number) => (s: string) =>
  useColor ? `\u001b[${code}m${s}\u001b[0m` : s;
const dim = c(2);
const cyan = c(36);
const green = c(32);
const red = c(31);

function timeMeta(): { date: string; melbTime: string; utcDelta: string } {
  const now = new Date();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const date = `${String(now.getDate()).padStart(2, "0")}-${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
  const melbTz = "Australia/Melbourne";
  const melbFmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: melbTz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  const m = melbFmt.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  const melbTime = m
    ? `${m[1].padStart(2, "0")}:${m[2]} ${m[3].toUpperCase()}`
    : melbFmt;
  const getOffset = (d: Date, tz: string): number => {
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts: Record<string, string> = {};
    for (const p of f.formatToParts(d))
      if (p.type !== "literal") parts[p.type] = p.value;
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return (asUTC - d.getTime()) / 60000;
  };
  let utcDelta = "N/A";
  try {
    const melbOffset = getOffset(now, melbTz);
    const serverOffset = -now.getTimezoneOffset();
    const diff = Math.round(melbOffset - serverOffset);
    const sign = diff >= 0 ? "+" : "-";
    const abs = Math.abs(diff);
    const dh = Math.floor(abs / 60);
    const dm = abs % 60;
    utcDelta = `${sign}${String(dh).padStart(2, "0")}:${String(dm).padStart(2, "0")}`;
  } catch {
    // ignore errors computing timezone delta
  }
  return { date, melbTime, utcDelta };
}

function computeDiffStats(): { files: number; locAdded: number } {
  try {
    const out = execSync("git diff --numstat", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    let files = 0,
      loc = 0;
    out
      .split(/\n/)
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split(/\t/);
        if (parts.length >= 2) {
          files++;
          const n = parseInt(parts[0], 10);
          if (!isNaN(n)) loc += n;
        }
      });
    return { files, locAdded: Math.max(0, loc) };
  } catch {
    return { files: 0, locAdded: 0 };
  }
}

function writeRemediation(reason: string, tasks: Task[]): void {
  try {
    fs.mkdirSync("artifacts/brain", { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(
      `artifacts/brain/remediation-${ts}.json`,
      JSON.stringify({ reason, tasks }, null, 2)
    );
  } catch (err) {
    // ignore errors while attempting to write remediation artifact
    void err;
  }
}

export async function runBatch(
  tasks: Task[],
  opts: {
    mode: "execute" | "dry-run" | "plan-only";
    cfg: unknown;
    preflightEstimate?: { files: number; locAdded: number };
  }
): Promise<{
  results: Array<{
    taskId: string;
    tool: string;
    ok: boolean;
    note: string;
    elapsedMs: number;
    date: string;
    melbTime: string;
    utcDelta: string;
  }>;
  diffs: { files: number; locAdded: number };
}> {
  const results: Array<{
    taskId: string;
    tool: string;
    ok: boolean;
    note: string;
    elapsedMs: number;
    date: string;
    melbTime: string;
    utcDelta: string;
  }> = [];
  if (opts.mode !== "execute")
    return { results, diffs: { files: 0, locAdded: 0 } };
  // Pre-flight guard estimate (placeholder 0 for now)
  const estimate = opts.preflightEstimate || { files: 0, locAdded: 0 };
  const cfgAny = opts.cfg as {
    limits?: { maxLocAdded: number; maxFiles: number };
  };
  const guard =
    cfgAny && cfgAny.limits
      ? checkBatchLimits(estimate, cfgAny.limits)
      : { ok: true };
  if (!guard.ok) {
    writeRemediation("limits", tasks);
    return { results, diffs: estimate };
  }
  const tMeta = timeMeta();
  for (const t of tasks) {
    const runners = getRunnersFor(t.domain || "docs", cfgAny);
    for (const r of runners) {
      const start = Date.now();
      const outUnknown = await r.run({ taskId: t.id }, { cfg: cfgAny });
      const outObj =
        outUnknown && typeof outUnknown === "object"
          ? (outUnknown as Record<string, unknown>)
          : {};
      const elapsedMs = Date.now() - start;
      const ok = !!outObj.ok;
      const note = typeof outObj.note === "string" ? outObj.note : "stub";
      results.push({
        taskId: t.id,
        tool: r.name,
        ok,
        note,
        elapsedMs,
        date: tMeta.date,
        melbTime: tMeta.melbTime,
        utcDelta: tMeta.utcDelta,
      });
      // Structured console line (skip if JSON capture expected via higher layer env flag)
      if (!process.env.BRAIN_SILENCE_RUNNERS) {
        const status = ok ? green("OK") : red("FAIL");
        console.log(
          `${cyan("[runner]")} ${tMeta.date} ${dim("@")} ${tMeta.melbTime} Δ${tMeta.utcDelta} ${r.name} ${dim("task=" + t.id)} ${status} ${dim(elapsedMs + "ms")} ${note ? dim(note) : ""}`
        );
      }
    }
  }
  const diffs = computeDiffStats();
  return { results, diffs };
}

export default { runBatch };
