import fs from 'fs';
import path from 'path';

export interface RunRecord {
  ts: number | string;
  runId: string;
  mode: string;
  tasks?: any[];
  plan?: any;
  domains?: string[];
  toolsInvoked?: string[];
  diffs?: { files: number; locAdded: number };
  validation?: any;
  outcome?: { status: 'OK' | 'FAIL' };
  metrics?: { batchCount?: number; estTokens?: number; elapsedMs?: number; budget?: { tokenUsed?: number; tokenBudget?: number; timeUsedMs?: number; timeBudgetMs?: number } };
  followUps?: any[];
  aborted?: boolean;
  reason?: string;
}

const REDACT_KEYS = ['apiKey', 'openaiKey', 'authToken', 'password', 'secret'];

function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (REDACT_KEYS.includes(k) && typeof v === 'string') {
      out[k] = v.length > 8 ? v.slice(0, 4) + '***REDACTED***' + v.slice(-2) : '***REDACTED***';
    } else if (typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

export function writeRunLog(obj: any) {
  const dir = path.join(process.cwd(), 'artifacts', 'brain');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `run-${ts}.json`);
  const safe = redact(obj);
  fs.writeFileSync(file, JSON.stringify(safe, null, 2));
  return file;
}

export default { writeRunLog };

