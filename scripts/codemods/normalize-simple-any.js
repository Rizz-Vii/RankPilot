#!/usr/bin/env node
/**
 * normalize-simple-any.js
 * Safe regex-based normalization for trivial 'any' patterns:
 *  1. Promise<any> -> Promise<unknown>
 *  2. Array<any>   -> Array<unknown>
 *  3. any[]        -> unknown[]
 *  4. Record<string, any> -> Record<string, unknown>
 *  5. {[key: string]: any} style index signatures -> Record<string, unknown>
 * Idempotent: running multiple times causes no further changes.
 * Dry-run unless APPLY=1 is set.
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.env.APPLY === '1';
const root = process.cwd();
const exts = new Set(['.ts','.tsx','.js','.jsx']);

function walk(dir, out=[]) {
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('.')) continue;
    const full = path.join(dir,e.name);
    if(e.isDirectory()) { if(['node_modules','.next','dist','out','functions','coverage'].includes(e.name)) continue; walk(full,out); continue; }
    if(!exts.has(path.extname(e.name))) continue;
    if(e.name.endsWith('.d.ts')) continue;
    out.push(full);
  }
  return out;
}

const patterns = [
  { re: /Promise<any>/g, replace: 'Promise<unknown>' },
  { re: /Array<any>/g, replace: 'Array<unknown>' },
  { re: /([^A-Za-z0-9_])any\[\]/g, replace: '$1unknown[]' }, // keep preceding char (not part of identifier)
  { re: /Record<\s*string\s*,\s*any\s*>/g, replace: 'Record<string, unknown>' },
  { re: /\{\s*\[\s*key\s*:\s*string\s*]\s*:\s*any\s*}\s*/g, replace: 'Record<string, unknown>' }
];

function transform(code){
  let changed = false; let out = code;
  for(const p of patterns){
    const before = out;
    out = out.replace(p.re, p.replace);
    if(out !== before) changed = true;
  }
  return { changed, out };
}

const files = walk(path.join(root,'src'));
let modified=0; let totalChanges=0;
for(const f of files){
  const orig = fs.readFileSync(f,'utf8');
  const { changed, out } = transform(orig);
  if(changed){
    modified++; totalChanges++;
    if(APPLY) fs.writeFileSync(f,out,'utf8');
    console.log(`[any-codemod] ${APPLY?'updated':'would update'} ${path.relative(root,f)}`);
  }
}
console.log(JSON.stringify({ apply: APPLY, filesScanned: files.length, filesModified: modified, totalChanges }));
