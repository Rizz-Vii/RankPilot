import fs from 'fs';
import path from 'path';
import type { Task } from '../../../types/brain';

export interface TaskSourceMod { name: string; fetch(): Task[] }

function read(file: string): string { try { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); } catch { return ''; } }

export const checkListSource: TaskSourceMod = {
  name: 'checkList',
  fetch() {
    const txt = read('checkList.txt');
    return txt.split(/\r?\n/).filter(Boolean).slice(0, 100).map((ln, i) => ({ id: `CL-${i}`, title: ln.slice(0, 80), raw: ln, domain: 'unknown', status: 'TODO' }));
  }
};

export const changeLogSource: TaskSourceMod = {
  name: 'changeLog',
  fetch() {
    const txt = read('docs/CHANGE_LOG.md');
    const lines = txt.split(/\r?\n/).filter(l => /TODO|BACKLOG/i.test(l));
    return lines.slice(0, 100).map((ln, i) => ({ id: `CH-${i}`, title: ln.slice(0, 80), raw: ln, domain: 'unknown', status: 'TODO' }));
  }
};

export const auditSource: TaskSourceMod = {
  name: 'incompleteAudit',
  fetch() {
    const txt = read('docs/INCOMPLETE_CODE_AUDIT.md');
    return txt.split(/\r?\n/).filter(Boolean).slice(0, 100).map((ln, i) => ({ id: `IA-${i}`, title: ln.slice(0, 80), raw: ln, domain: 'unknown', status: 'TODO' }));
  }
};

export function collectTasks(): Task[] {
  const srcs = [checkListSource, changeLogSource, auditSource];
  const all = srcs.flatMap(s => s.fetch());
  const seen = new Set<string>();
  const out: Task[] = [];
  for (const t of all) { const k = t.title.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push(t); }
  return out;
}

