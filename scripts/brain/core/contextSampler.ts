import fs from 'fs';
import path from 'path';

export function sampleContext(maxKb: number): { files: string[]; notes: string[] } {
  const root = process.cwd();
  const exists = (p: string) => fs.existsSync(path.join(root, p));
  const pri: string[] = [
    'src/lib/events/publishEvent.ts',
    'src/constants/enhanced-nav.ts',
    'src/lib/access-control.ts',
    'docs/CHANGE_LOG.md',
    'docs/EVENT_BACKBONE_REFERENCE.md',
    'archey/RUNBOOK.md'
  ].filter(exists);
  // last two run artifacts
  const artsDir = path.join(root, 'artifacts/brain');
  let recent: string[] = [];
  try {
    const list = fs.readdirSync(artsDir).filter(f => f.startsWith('run-')).sort();
    recent = list.slice(-2).map(f => path.join('artifacts/brain', f));
  } catch {}
  const files = [...pri, ...recent];
  const notes: string[] = [];
  // Cap by size budget (rough: assume 1KB per entry; keep first N)
  const cap = Math.max(1, Math.min(128, Math.floor(maxKb)));
  const capped = files.slice(0, cap);
  notes.push(`contextKb=${cap}`, `filesSelected=${capped.length}`);
  return { files: capped, notes };
}

export default { sampleContext };
