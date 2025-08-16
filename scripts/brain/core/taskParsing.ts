import fs from 'fs';
import path from 'path';
import type { Task } from '../../../types/brain';

export function parseTasks(inputs: { checkList?: string; queues?: string; changeLog?: string; todos?: string }): Task[] {
  const out: Task[] = [];
  const push = (raw: string, idPrefix: string) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return;
    const lines = trimmed.split(/\r?\n/).filter(Boolean).slice(0, 50);
    lines.forEach((ln, i) => out.push({ id: `${idPrefix}-${i}`, title: ln.slice(0, 80), raw: ln, domain: 'unknown', status: 'TODO' }));
  };
  if (inputs.checkList) push(inputs.checkList, 'CL');
  if (inputs.queues) push(inputs.queues, 'Q');
  if (inputs.changeLog) push(inputs.changeLog, 'CH');
  if (inputs.todos) push(inputs.todos, 'TD');
  // Auto-ingest from common sources if none provided
  if (!out.length) {
    const root = process.cwd();
    const safeRead = (p: string) => { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return ''; } };
    const cl = safeRead('checkList.txt'); if (cl) push(cl, 'CLF');
    const ch = safeRead('docs/CHANGE_LOG.md'); if (ch) push(ch.split('\n').filter(l=>/TODO|BACKLOG/i.test(l)).join('\n'), 'CHD');
    const inc = safeRead('docs/INCOMPLETE_CODE_AUDIT.md'); if (inc) push(inc, 'INC');
  }
  // Dedupe by title
  const seen = new Set<string>();
  const deduped: Task[] = [];
  for (const t of out) { const key = t.title.toLowerCase(); if (seen.has(key)) continue; seen.add(key); deduped.push(t); }
  return deduped;
}

export default { parseTasks };
