#!/usr/bin/env node
/**
 * guard-diff-loc.js
 * Fail (exit 1) if total added+removed lines in git diff (working tree vs HEAD) exceed threshold.
 * Default threshold: 200 (override via MAX_DIFF_LOC env var).
 */
import { execSync } from 'node:child_process';

const max = parseInt(process.env.MAX_DIFF_LOC||'200',10);

function run(cmd){return execSync(cmd,{stdio:'pipe',encoding:'utf8'});}    

function main(){
  let diff;
  try { diff = run('git diff --numstat'); } catch { diff=''; }
  let added=0, removed=0;
  for(const line of diff.split(/\n/)){
    if(!line.trim()) continue;
    const [a,r] = line.split(/\t/);
    const ai = parseInt(a,10); const ri = parseInt(r,10);
    if(!isNaN(ai)) added+=ai; if(!isNaN(ri)) removed+=ri;
  }
  const total = added+removed;
  console.log(`[guard-diff-loc] Added=${added} Removed=${removed} Total=${total} (limit ${max})`);
  if(total>max){
    console.error('[guard-diff-loc] Diff too large; aborting.');
    process.exit(1);
  }
}

main();
