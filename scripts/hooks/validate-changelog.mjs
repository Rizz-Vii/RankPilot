#!/usr/bin/env node
// CHANGE_LOG enforcement hook (T57 / DQ7)
// Fails if a commit (staged changes) modifies src/ runtime files without CHANGE_LOG.md delta.
import { execSync } from 'child_process';
import fs from 'fs';

function getStaged() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
  return out.split(/\n/).filter(Boolean);
}

function main() {
  const staged = getStaged();
  const runtimeTouched = staged.some(f => f.startsWith('src/') || f.startsWith('functions/'));
  if (!runtimeTouched) return; // no runtime changes
  const changelogTouched = staged.some(f => f === 'docs/CHANGE_LOG.md' || f === 'CHANGE_LOG.md' );
  if (!changelogTouched) {
    console.error('\n[CHANGE_LOG ENFORCEMENT] Runtime files changed but CHANGE_LOG.md not updated.');
    console.error('Add an entry summarizing the behavior change (or rationale if purely internal refactor) then stage it.');
    process.exit(2);
  }
  // Optional lightweight diff size guidance
  const diffStat = execSync('git diff --cached --shortstat', { encoding: 'utf8' }).trim();
  console.log(`[CHANGE_LOG ENFORCEMENT] OK (runtime + CHANGE_LOG present). Diff: ${diffStat}`);
}

try { main(); } catch (e) {
  console.error('[CHANGE_LOG ENFORCEMENT] Error:', (e as any)?.message);
  process.exit(2);
}
