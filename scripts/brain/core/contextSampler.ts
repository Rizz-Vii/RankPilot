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
    'archey/01-system-overview.md'
  ].filter(exists);
  // last two run artifacts
  const artsDir = path.join(root, 'artifacts/brain');
  let recent: string[] = [];
  try {
    const list = fs.readdirSync(artsDir).filter(f => f.startsWith('run-')).sort();
    recent = list.slice(-2).map(f => path.join('artifacts/brain', f));
  } catch {}
  const allFiles = [...pri, ...recent];
  const notes: string[] = [];
  
  // Cap by size budget - calculate actual file sizes
  const maxBytes = Math.max(1024, maxKb * 1024); // Convert KB to bytes, minimum 1KB
  let totalBytes = 0;
  const selected: string[] = [];
  
  for (const file of allFiles) {
    try {
      const filePath = path.join(root, file);
      const stats = fs.statSync(filePath);
      if (totalBytes + stats.size <= maxBytes) {
        selected.push(file);
        totalBytes += stats.size;
      } else {
        break; // Stop if adding this file would exceed budget
      }
    } catch {
      // If we can't stat the file, skip it
      continue;
    }
  }
  
  // Ensure we have at least one file if any exist
  if (selected.length === 0 && allFiles.length > 0) {
    selected.push(allFiles[0]);
  }
  
  notes.push(`contextKb=${Math.round(totalBytes/1024)}/${maxKb}`, `filesSelected=${selected.length}`);
  return { files: selected, notes };
}

export default { sampleContext };
