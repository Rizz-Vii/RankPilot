import fs from 'fs';
import path from 'path';
import type { Task, RemediationRecord } from '../../types/brain';

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
  metrics?: { elapsedMs?: number; estTokens?: number; batches?: number; budget?: { tokenUsed?: number; tokenBudget?: number; timeUsedMs?: number; timeBudgetMs?: number } };
  followUps?: Task[];
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

export function writeRemediationFile(record: RemediationRecord): string {
  const dir = path.join(process.cwd(), 'artifacts', 'brain');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { }
  
  const jsonFile = path.join(dir, `remediation-${record.runId}.json`);
  const mdFile = path.join(dir, `remediation-${record.runId}.md`);
  
  // Write JSON remediation record
  fs.writeFileSync(jsonFile, JSON.stringify(record, null, 2));
  
  // Write markdown summary
  const mdContent = `# Remediation Report
**Run ID:** ${record.runId}
**Timestamp:** ${record.timestamp}
**Failure Reason:** ${record.failureReason}

## Summary
${record.summary}

## Original Tasks (${record.originalTasks.length})
${record.originalTasks.map((task, i) => `${i + 1}. **${task.title}** (${task.domain}) - ${task.status}`).join('\n')}

## Follow-up Tasks (${record.followUpTasks.length})
${record.followUpTasks.map((task, i) => `${i + 1}. **${task.title}** (${task.domain})`).join('\n')}

## Next Steps
Review the follow-up tasks above and execute them to resolve the failure conditions.
`;
  
  fs.writeFileSync(mdFile, mdContent);
  
  return jsonFile;
}

export default { writeRunLog, writeRemediationFile };

