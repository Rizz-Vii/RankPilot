import fs from "fs";
import path from "path";

export interface RunRecord {
  ts: number | string;
  runId: string;
  mode: string;
  tasks?: unknown[];
  plan?: unknown;
  domains?: string[];
  toolsInvoked?: string[];
  diffs?: { files: number; locAdded: number };
  validation?: unknown;
  outcome?: { status: "OK" | "FAIL" };
  metrics?: {
    elapsedMs?: number;
    estTokens?: number;
    batches?: number;
    budget?: {
      tokenUsed?: number;
      tokenBudget?: number;
      timeUsedMs?: number;
      timeBudgetMs?: number;
    };
  };
  followUps?: unknown[];
  aborted?: boolean;
  reason?: string;
}

const REDACT_KEYS = ["apiKey", "openaiKey", "authToken", "password", "secret"];

function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(redact);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[k];
    if (REDACT_KEYS.includes(k) && typeof v === "string") {
      out[k] =
        v.length > 8
          ? v.slice(0, 4) + "***REDACTED***" + v.slice(-2)
          : "***REDACTED***";
    } else if (v && typeof v === "object") out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

export function writeRunLog(obj: unknown) {
  const dir = path.join(process.cwd(), "artifacts", "brain");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `run-${ts}.json`);
  const safe = redact(obj);
  fs.writeFileSync(file, JSON.stringify(safe, null, 2));
  return file;
}

export default { writeRunLog };
