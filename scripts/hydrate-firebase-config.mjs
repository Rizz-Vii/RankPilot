#!/usr/bin/env node
/**
 * hydrate-firebase-config.mjs
 *
 * Pulls runtime Firebase Functions config (via `firebase functions:config:get`)
 * and merges selected keys into .env.local if they appear to be "real" and either
 * missing or placeholder locally.
 *
 * Requirements:
 *  - Firebase CLI installed and authenticated (`firebase login`)
 *  - Project must be set (either via --project flag or FIREBASE_PROJECT / GOOGLE_CLOUD_PROJECT env)
 *
 * Placeholders are detected with the same heuristic as merge-env-backup plus empty values.
 * By default this script maps common config namespaces to environment variables:
 *   config.example.api_key -> EXAMPLE_API_KEY (uppercased path)
 *   firebase config keys that already look like env var names pass through unchanged.
 *
 * Flags:
 *  --project <id>            Explicit firebase project id
 *  --only-namespaces=a,b     Limit to specific top-level config namespaces
 *  --dry-run                 Preview without writing
 *  --overwrite-existing      Overwrite existing real values (default false)
 *  --verbose                 Extra diagnostics (no secret values printed)
 *  --keep-prefixed           Keep original prefix when flattening (default true)
 *  --prefix=FIREBASE_CFG_    Add a prefix to generated env var names
 *  --include-regex=PATTERN   Only include keys whose flattened path matches regex
 *  --exclude-regex=PATTERN   Exclude keys matching regex
 *
 * Output is masked; secrets are not echoed fully.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
function takeFlag(name){
  const idx = args.indexOf(name);
  if(idx===-1) return false;
  args.splice(idx,1);return true;
}
function takeValueFlag(name){
  const idx = args.indexOf(name);
  if(idx===-1) return undefined;
  const val = args[idx+1];
  args.splice(idx, val?2:1);return val;
}
function takeEqFlag(prefix){
  const item = args.find(a=>a.startsWith(prefix+'='));
  if(!item) return undefined;return item.slice(prefix.length+1);
}

const DRY_RUN = takeFlag('--dry-run');
const OVERWRITE = takeFlag('--overwrite-existing');
const VERBOSE = takeFlag('--verbose');
const projectFromFlag = takeValueFlag('--project') || takeEqFlag('--project');
const onlyNamespaces = (takeEqFlag('--only-namespaces')||'').split(',').map(s=>s.trim()).filter(Boolean);
const prefix = takeEqFlag('--prefix') || '';
const includeRegexRaw = takeEqFlag('--include-regex');
const excludeRegexRaw = takeEqFlag('--exclude-regex');
const includeRegex = includeRegexRaw? new RegExp(includeRegexRaw):null;
const excludeRegex = excludeRegexRaw? new RegExp(excludeRegexRaw):null;

const ENV_FILE = path.join(process.cwd(), '.env.local');
if(!fs.existsSync(ENV_FILE)){
  console.error('[hydrate-firebase-config] Missing .env.local');
  process.exit(1);
}

function isPlaceholder(key,value){
  if(value==null) return true;
  const v = String(value).trim();
  if(v==='') return true;
  if(/your-?[^\s]*-here/i.test(v)) return true;
  if(/your_?api_?key/i.test(v)) return true;
  if(/placeholder/i.test(v)) return true;
  if(/dummy|example|changeme/i.test(v)) return true;
  if(key==='FIREBASE_PRIVATE_KEY' && /YOUR_PRIVATE_KEY/.test(v)) return true;
  return false;
}
function mask(v){
  if(v==null) return '';const s=String(v);if(s.length<=6)return '*'.repeat(s.length);return s.slice(0,3)+'...'+s.slice(-3);
}
function readEnv(){
  const text = fs.readFileSync(ENV_FILE,'utf8');
  const map={};
  for(const line of text.split(/\r?\n/)){
    if(!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx=line.indexOf('=');
    const k=line.slice(0,idx).trim();
    const raw=line.slice(idx+1);
    const unq = raw.startsWith('"')&&raw.endsWith('"')? raw.slice(1,-1):raw;
    map[k]={raw, value:unq};
  }
  return {text,map};
}
function writeEnv(map, originalText){
  const lines=originalText.split(/\r?\n/);
  const seen=new Set();
  const out = lines.map(line=>{
    if(!line || line.startsWith('#') || !line.includes('=')) return line;
    const idx=line.indexOf('=');const k=line.slice(0,idx).trim();
    if(map[k]){seen.add(k);return k+'='+map[k].raw;}return line;
  });
  for(const k of Object.keys(map)){ if(!seen.has(k)) out.push(k+'='+map[k].raw); }
  return out.join('\n')+`\n# Hydrated firebase config ${new Date().toISOString()}\n`;
}
function flatten(obj, pathParts=[]){
  let out=[];
  for(const [k,v] of Object.entries(obj||{})){
    const next=[...pathParts,k];
    if(v && typeof v === 'object' && !Array.isArray(v)) out=out.concat(flatten(v,next));
    else out.push({path:next, value:v});
  }
  return out;
}

const project = projectFromFlag || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
if(!project){
  console.error('[hydrate-firebase-config] No project specified (use --project or set FIREBASE_PROJECT_ID).');
  process.exit(1);
}

let jsonRaw;
try {
  jsonRaw = execSync(`firebase functions:config:get --project ${project}`, {stdio:['ignore','pipe','pipe']}).toString();
} catch(err){
  console.error('[hydrate-firebase-config] Failed to fetch config:', err.status, err.message);
  process.exit(1);
}
let configObj={};
try { configObj = JSON.parse(jsonRaw || '{}'); } catch(e){
  console.error('[hydrate-firebase-config] Invalid JSON from firebase CLI.');
  process.exit(1);
}

if(onlyNamespaces.length){
  configObj = Object.fromEntries(Object.entries(configObj).filter(([k])=>onlyNamespaces.includes(k)));
}

const flat = flatten(configObj);

const {text:envText, map:envMap} = readEnv();
const changes=[];

for(const entry of flat){
  const keyBase = entry.path.join('_').toUpperCase();
  if(includeRegex && !includeRegex.test(keyBase)) continue;
  if(excludeRegex && excludeRegex.test(keyBase)) continue;
  const envKey = prefix + keyBase;
  const value = entry.value;
  if(value==null || value==='') continue;
  const current = envMap[envKey];
  const valueStr = String(value);
  const isValPlaceholder = isPlaceholder(envKey,valueStr);
  if(isValPlaceholder) continue; // ignore placeholders from remote config
  if(!current){
    envMap[envKey]={raw:valueStr, value:valueStr};
    changes.push({key:envKey, action:'add', to:valueStr});
    continue;
  }
  const curVal = current.value;
  const curPlaceholder = isPlaceholder(envKey,curVal);
  if(curPlaceholder){
    envMap[envKey]={raw:valueStr, value:valueStr};
    changes.push({key:envKey, action:'replace-placeholder', from:curVal, to:valueStr});
    continue;
  }
  if(OVERWRITE && curVal!==valueStr){
    envMap[envKey]={raw:valueStr, value:valueStr};
    changes.push({key:envKey, action:'overwrite', from:curVal, to:valueStr});
  } else if(VERBOSE && curVal===valueStr){
    changes.push({key:envKey, action:'unchanged', from:curVal, to:valueStr});
  }
}

const summary={ project, totalRemote: flat.length, applied: changes.length, actions: changes.reduce((a,c)=>{a[c.action]=(a[c.action]||0)+1;return a;}, {}) };
console.log('[hydrate-firebase-config] Summary:', JSON.stringify(summary,null,2));
if(changes.length){
  console.log('[hydrate-firebase-config] Detailed (masked):');
  for(const c of changes){
    console.log(`  ${c.key} -> ${c.action} (${c.from?mask(c.from):'∅'} => ${mask(c.to)})`);
  }
}
if(DRY_RUN){
  console.log('[hydrate-firebase-config] DRY RUN - no file write');
  process.exit(0);
}
if(changes.length){
  const backup = '.env.local.firebase.'+new Date().toISOString().replace(/[:]/g,'-')+'.bak';
  fs.writeFileSync(path.join(process.cwd(),backup), envText,'utf8');
  const newContent = writeEnv(envMap, envText);
  fs.writeFileSync(ENV_FILE,newContent,'utf8');
  console.log('[hydrate-firebase-config] Wrote .env.local (backup at', backup+')');
} else {
  console.log('[hydrate-firebase-config] No changes written');
}
