#!/usr/bin/env node
/**
 * hydrate-env.mjs
 * Populates or updates .env.local with real values sourced from:
 *   1) Current process.env
 *   2) Firebase service account data (if FIREBASE_SERVICE_ACCOUNT_JSON or related keys present)
 *   3) GitHub API (user + optional repo) if GITHUB_PERSONAL_ACCESS_TOKEN set
 *
 * Designed to be safe & incremental:
 *  - Does not overwrite existing non-placeholder values unless --overwrite specified
 *  - Placeholders considered: "", YOUR_VALUE_HERE, replace_me_dev_secret, strings containing 'placeholder'
 *  - Adds comment block when it writes new lines
 *
 * Usage:
 *   node scripts/hydrate-env.mjs                   # hydrate missing keys only
 *   node scripts/hydrate-env.mjs --overwrite       # also overwrite placeholder values
 *   node scripts/hydrate-env.mjs --github=owner/repo
 *   node scripts/hydrate-env.mjs --dry-run         # show planned changes
 *   node scripts/hydrate-env.mjs --include-firebase # force firebase extraction attempt
 *
 * Environment:
 *   GITHUB_PERSONAL_ACCESS_TOKEN   (for GitHub API)
 *   FIREBASE_SERVICE_ACCOUNT_JSON  (JSON string) OR FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL
 */
import fs from 'fs';
import path from 'path';

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs.filter(a=>!a.startsWith('--github')));
const githubArg = rawArgs.find(a=>a.startsWith('--github'));
const repoTarget = githubArg ? githubArg.split('=')[1] : undefined; // owner/repo
const overwrite = args.has('--overwrite');
const dryRun = args.has('--dry-run');
const forceFirebase = args.has('--include-firebase');

const root = process.cwd();
const envLocalPath = path.join(root,'.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('.env.local not found. Create it first.');
  process.exit(1);
}

function parseEnvFile(pathFile){
  const lines = fs.readFileSync(pathFile,'utf8').split(/\r?\n/);
  const map = new Map();
  lines.forEach((line,i)=>{
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0,eq).trim();
    if (/^[A-Z0-9_]+$/.test(key)) map.set(key,{value: line.slice(eq+1), index:i});
  });
  return {lines,map};
}

function isPlaceholder(v){
  const val = (v||'').trim().replace(/^"|"$/g,'');
  if (!val) return true;
  const low = val.toLowerCase();
  return ["your_value_here","replace_me_dev_secret"].includes(low) || low.includes('placeholder');
}

function escapeVal(v){
  if (v == null) return '';
  if (/\n/.test(v)) return JSON.stringify(v);
  if (/\s/.test(v) || v.includes('#')) return JSON.stringify(v);
  return v;
}

const envData = parseEnvFile(envLocalPath);
const changes = []; // {key, old, new, action}

function upsertKey(key, value){
  if (value == null) return;
  const existing = envData.map.get(key);
  if (!existing){
    envData.lines.push(`${key}=${escapeVal(value)}`);
    changes.push({key, old: undefined, new: value, action:'add'});
  } else {
    if (overwrite && (isPlaceholder(existing.value) || isPlaceholder(value))){
      envData.lines[existing.index] = `${key}=${escapeVal(value)}`;
      changes.push({key, old: existing.value, new: value, action:'overwrite'});
    }
  }
}

// 1) Process env (only uppercase keys)
for (const [k,v] of Object.entries(process.env)){
  if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
  upsertKey(k, v);
}

// 2) Firebase service account extraction
function hydrateFirebase(){
  let sa = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON){
    try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); } catch { /* ignore */ }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL){
    sa = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL
    };
  }
  if (!sa) return;
  upsertKey('FIREBASE_PROJECT_ID', sa.project_id);
  if (sa.private_key) upsertKey('FIREBASE_PRIVATE_KEY', sa.private_key.replace(/\n/g,'\\n'));
  if (sa.client_email) upsertKey('FIREBASE_CLIENT_EMAIL', sa.client_email);
  if (sa.private_key && sa.project_id && sa.client_email){
    const jsonString = JSON.stringify({
      type:'service_account',
      project_id: sa.project_id,
      private_key: sa.private_key.replace(/\n/g,'\n'),
      client_email: sa.client_email
    });
    upsertKey('FIREBASE_SERVICE_ACCOUNT_JSON', jsonString);
  }
}

if (forceFirebase || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID)) {
  hydrateFirebase();
}

// 3) GitHub
async function hydrateGitHub(){
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) return;
  try {
    const userResp = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'env-hydrator' } });
    if (userResp.ok){
      const data = await userResp.json();
      if (data.login) upsertKey('GITHUB_LOGIN', data.login);
      if (data.id) upsertKey('GITHUB_USER_ID', String(data.id));
    }
    if (repoTarget){
      const repoResp = await fetch(`https://api.github.com/repos/${repoTarget}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'env-hydrator' } });
      if (repoResp.ok){
        const repo = await repoResp.json();
        if (repo.default_branch) upsertKey('GITHUB_REPO_DEFAULT_BRANCH', repo.default_branch);
        if (repo.visibility) upsertKey('GITHUB_REPO_VISIBILITY', repo.visibility);
      }
    }
  } catch (e) {
    console.warn('[hydrate-env] GitHub fetch failed:', e.message);
  }
}

(async () => {
  await hydrateGitHub();

  if (dryRun){
    console.log('[hydrate-env] DRY RUN. Planned changes:');
    for (const c of changes){
      console.log(`  ${c.action.toUpperCase()}: ${c.key}${c.old?` (was ${String(c.old).slice(0,20)}...)`:''}`);
    }
    console.log(`[hydrate-env] Total changes: ${changes.length}`);
    process.exit(0);
  }

  if (changes.length){
    envData.lines.push('', `# Hydrated by hydrate-env.mjs ${new Date().toISOString()}`);
    fs.writeFileSync(envLocalPath, envData.lines.join('\n'));
  }
  console.log(`[hydrate-env] Completed. Changes: ${changes.length}. Overwrite=${overwrite}`);
})();
