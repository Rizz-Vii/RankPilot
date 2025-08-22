#!/usr/bin/env ts-node
/**
 * Brain Orchestrator
 * Purpose: Automate prompt engineering & task routing between Codex (backend), Aider (frontend), and OpenAI (planning layer).
 * Safety: Dry-run by default (RUN=1 to execute). Never logs secret values.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CHECKLIST_FILE = path.resolve(ROOT, 'checkList.txt');
const MAX_TASKS = parseInt(process.env.MAX_TASKS || '3', 10);
const RUN = process.env.RUN === '1';
const DRY_SAVE_ONLY = process.env.DRY_SAVE_ONLY === '1';
const CODEx_BIN = process.env.CODEx_BIN || 'codex';
const AIDER_BIN = process.env.AIDER_BIN || 'aider';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR_CODEX = path.resolve(ROOT, 'codex-prompts/auto');
const OUT_DIR_AIDER = path.resolve(ROOT, 'aider-prompts/auto');
const LOG_DIR = path.resolve(ROOT, 'logs/orchestrator');
for (const d of [OUT_DIR_CODEX, OUT_DIR_AIDER, LOG_DIR]) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

interface ParsedTask { id: string; phase?: string; title: string; status: string; raw: string; }
const BACKEND_TASK_PREFIX = new Set(['T26', 'T27', 'T28', 'T30', 'T31', 'T32', 'T33', 'T34', 'T35', 'T47', 'T48', 'T49', 'T50', 'T51', 'T52', 'T53', 'T54', 'T57', 'T58']);
const FRONTEND_TASK_PREFIX = new Set(['T18', 'T19', 'T20', 'T21', 'T22', 'T23', 'T24', 'T25', 'T29', 'T35', 'T36', 'T37', 'T38', 'T39', 'T40', 'T41', 'T42', 'T43', 'T44', 'T45', 'T46']);

function parseChecklist(): ParsedTask[] {
    if (!fs.existsSync(CHECKLIST_FILE)) return [];
    const text = fs.readFileSync(CHECKLIST_FILE, 'utf8');
    const lines = text.split(/\n/);
    const tasks: ParsedTask[] = [];
    const regex = /^(T\d+)\s*\|\s*([P0-3Cont+]+)\s*\|\s*([^|]+?)\s*\|\s*(\w+)\s*\|/;
    for (const raw of lines) {
        const m = raw.match(regex);
        if (m) {
            const [, id, phase, title, status] = m;
            tasks.push({ id, phase, title: title.trim(), status: status.trim(), raw });
        }
    }
    return tasks;
}

function classifyTasks(parsed: ParsedTask[]) {
    const backend: ParsedTask[] = [];
    const frontend: ParsedTask[] = [];
    for (const t of parsed) {
        if (t.status !== 'TODO' && t.status !== 'IN-PROGRESS') continue;
        if (BACKEND_TASK_PREFIX.has(t.id)) backend.push(t);
        else if (FRONTEND_TASK_PREFIX.has(t.id)) frontend.push(t);
    }
    const num = (id: string) => parseInt(id.replace(/\D/g, ''), 10);
    backend.sort((a, b) => num(a.id) - num(b.id));
    frontend.sort((a, b) => num(a.id) - num(b.id));
    return { backend: backend.slice(0, MAX_TASKS), frontend: frontend.slice(0, MAX_TASKS) };
}

async function planPrompt(kind: 'backend' | 'frontend', tasks: ParsedTask[], repoContext: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY || tasks.length === 0) {
        return heuristicPlan(kind, tasks);
    }
    try {
        const sys = `You are a senior ${kind} engineer producing a single actionable batch prompt. Constraints: minimal diff, ≤450 LOC added, no unrelated formatting. Output only the prompt text (no JSON).`;
        const user = `Tasks to implement (table rows):\n${tasks.map(t => t.raw).join('\n')}\n\nRepo cues (truncated):\n${repoContext.slice(0, 4000)}\n\nGenerate a consolidated implementation directive.`;
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                ...(process.env.OPENAI_ORGANIZATION ? { 'OpenAI-Organization': process.env.OPENAI_ORGANIZATION } : {})
            },
            body: JSON.stringify({
                model: process.env.MODEL_PLANNER || 'gpt-4o-mini',
                messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
                temperature: 0.3,
                max_tokens: 900
            })
        });
        if (!resp.ok) throw new Error('planner_http_' + resp.status);
        const json: unknown = await resp.json();
        let content: string = '';
        if (json && typeof json === 'object') {
            const obj = json as Record<string, unknown>;
            const choices = Array.isArray(obj.choices) ? obj.choices as Array<unknown> : [];
            const first = choices.length > 0 && choices[0] && typeof choices[0] === 'object' ? choices[0] as Record<string, unknown> : undefined;
            const message = first && first.message && typeof first.message === 'object' ? first.message as Record<string, unknown> : undefined;
            const c = message && typeof message.content === 'string' ? message.content : '';
            content = String(c).trim();
        }
        if (content) return content;
        return heuristicPlan(kind, tasks);
    } catch {
        return heuristicPlan(kind, tasks);
    }
}

function heuristicPlan(kind: 'backend' | 'frontend', tasks: ParsedTask[]) {
    if (!tasks.length) return '# No tasks selected';
    const header = `# ${kind.toUpperCase()} BATCH PLAN (heuristic)`;
    const list = tasks.map(t => `- ${t.id}: ${t.title}`).join('\n');
    const guidelines = kind === 'backend'
        ? `Implement server/lib logic with unit tests. Keep Firestore writes minimal. No derived ratios.`
        : `Implement UI components/pages with FeatureGate usage & minimal styling churn.`;
    return `${header}\n${guidelines}\n\nTasks:\n${list}\n\nOutput: Provide final JSON summary {"batch":{"tasks":[ids],"status":"done"}} after edits.`;
}

function sampleRepoContext(): string {
    const candidates = [
        'src/lib/events/publishEvent.ts',
        'src/constants/enhanced-nav.ts',
        'functions/src/chatbot.ts'
    ];
    let out = '';
    for (const c of candidates) {
        if (fs.existsSync(path.resolve(ROOT, c))) {
            const txt = fs.readFileSync(path.resolve(ROOT, c), 'utf8').split(/\n/).slice(0, 60).join('\n');
            out += `\n===== ${c} (head 60) =====\n${txt}\n`;
        }
    }
    return out;
}

function writePrompt(kind: 'backend' | 'frontend', content: string): string {
    const file = path.resolve(kind === 'backend' ? OUT_DIR_CODEX : OUT_DIR_AIDER, `${TS}-${kind}.txt`);
    fs.writeFileSync(file, content + '\n', 'utf8');
    return file;
}

function runTool(kind: 'backend' | 'frontend', promptFile: string) {
    if (!RUN || DRY_SAVE_ONLY) return { skipped: true };
    const prompt = fs.readFileSync(promptFile, 'utf8');
    if (kind === 'backend') {
        const res = spawnSync(CODEx_BIN, ['exec', '-p', prompt], { stdio: 'inherit' });
        return { skipped: false, status: res.status };
    }
    const res = spawnSync(AIDER_BIN, ['--model', 'gpt-5-mini', '--message', prompt, '--yes'], { stdio: 'inherit' });
    return { skipped: false, status: res.status };
}

async function main() {
    const parsed = parseChecklist();
    const { backend, frontend } = classifyTasks(parsed);
    const repoCtx = sampleRepoContext();
    const backendPrompt = await planPrompt('backend', backend, repoCtx);
    const frontendPrompt = await planPrompt('frontend', frontend, repoCtx);
    const backendFile = writePrompt('backend', backendPrompt);
    const frontendFile = writePrompt('frontend', frontendPrompt);
    const backendRun = runTool('backend', backendFile);
    const frontendRun = runTool('frontend', frontendFile);
    const summary = { backend: backend.map(t => t.id), frontend: frontend.map(t => t.id), executed: RUN && !DRY_SAVE_ONLY };
    fs.appendFileSync(path.resolve(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.log`), JSON.stringify({ summary, backendFile, frontendFile }) + '\n');
    console.log(JSON.stringify({ orchestrator: { summary, backendFile, frontendFile, backendRun, frontendRun } }, null, 2));
}

// Polyfill fetch if needed

// @ts-ignore
if (typeof fetch === 'undefined') {

    const https = require('https');

    // @ts-ignore
    global.fetch = function (url: string, opts: unknown) {
        return new Promise((resolve, reject) => {
            const u = new URL(url);
            const o = (opts && typeof opts === 'object') ? (opts as Record<string, unknown>) : {};
            const method = typeof o.method === 'string' ? o.method : 'GET';
            const headers = (o.headers && typeof o.headers === 'object') ? (o.headers as Record<string, string>) : undefined;
            const bodyVal = ((): string | Buffer | undefined => {
                if (typeof (o as { body?: unknown }).body === 'string') return (o as { body?: unknown }).body as string;
                const maybeBuf = (o as { body?: unknown }).body as unknown;
                return (typeof Buffer !== 'undefined' && Buffer.isBuffer(maybeBuf)) ? (maybeBuf as Buffer) : undefined;
            })();
            const req = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, (res: unknown) => {
                const r = res as { statusCode?: number; on: (ev: string, cb: (d: Buffer) => void) => void };
                const chunks: Buffer[] = []; r.on('data', (d: Buffer) => chunks.push(d)); r.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    // @ts-ignore - minimal Response-like object for planner usage
                    const code = typeof r.statusCode === 'number' ? r.statusCode : 0;
                    resolve({ ok: code >= 200 && code < 300, status: code, json: async () => { try { return JSON.parse(body); } catch { return {}; } }, text: async () => body } as unknown as Response);
                });
            }); req.on('error', reject); if (bodyVal) req.write(bodyVal); req.end();
        });
    };
}

main().catch(e => { console.error('[orchestrator] failed', e); process.exit(1); });

