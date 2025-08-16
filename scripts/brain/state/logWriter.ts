import fs from 'fs';
import path from 'path';

export function writeRunLog(obj: any) {
  const dir = path.join(process.cwd(), 'artifacts', 'brain');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `run-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

export default { writeRunLog };

