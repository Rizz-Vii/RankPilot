#!/usr/bin/env node
// Simple guard to prevent reintroduction of untyped array React state: useState<unknown[]>
const { readdirSync, statSync, readFileSync } = require('fs');
const { join } = require('path');
const root = join(process.cwd(), 'src');
const hits = [];
function walk(p){
  let s; try { s = statSync(p); } catch { return; }
  if(s.isDirectory()) { for(const f of readdirSync(p)) walk(join(p,f)); return; }
  if(!/\.(tsx|ts|jsx|js)$/.test(p)) return;
  const txt = readFileSync(p,'utf8');
  if(/useState<unknown\[]/.test(txt)) hits.push(p);
}
walk(root);
if(hits.length){
  console.error('\nForbidden pattern useState<unknown[]> found in:');
  hits.forEach(h=> console.error(' -', h));
  process.exit(2);
} else {
  console.log('✅ No useState<unknown[]> usages detected.');
}
