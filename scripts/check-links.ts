#!/usr/bin/env ts-node
/**
 * Lightweight link checker for markdown and HTML files.
 * Scans repo for .md and .html (excluding node_modules, .git, dist, .next, functions/lib) and tests HTTP/HTTPS links.
 * Outputs a summary and non-zero exit code if broken links are found.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import https from 'https';
import http from 'http';

interface LinkResult { file: string; url: string; status: number | 'ERROR'; message?: string; }

const root = process.cwd();
const includeExt = new Set(['.md', '.html']);
const skipDirs = new Set(['node_modules', '.git', 'dist', '.next', 'functions/lib', 'coverage', 'artifacts']);
const httpAgents = {
    'http:': new http.Agent({ keepAlive: true, maxSockets: 8 }),
    'https:': new https.Agent({ keepAlive: true, maxSockets: 8 }),
};

function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = full.substring(root.length + 1);
        try {
            const st = statSync(full);
            if (st.isDirectory()) {
                if ([...skipDirs].some(sd => rel === sd || rel.startsWith(sd + '/'))) continue;
                walk(full, acc);
            } else if (includeExt.has(extname(entry))) {
                acc.push(full);
            }
        } catch { /* ignore */ }
    }
    return acc;
}

const urlRegex = /https?:\/\/[^)\s"'<>]+/g; // naive but sufficient

function extractUrls(content: string): string[] {
    const set = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = urlRegex.exec(content))) {
        const url = m[0].replace(/[),.;]+$/, ''); // trim trailing punctuation
        set.add(url);
    }
    return [...set];
}

function headOrGet(url: URL): Promise<{ status: number }> {
    return new Promise(resolve => {
        const lib = url.protocol === 'https:' ? https : http;
        const controller = new AbortController();
        const timeout = setTimeout(() => { controller.abort(); resolve({ status: 599 }); }, 8000);
        const opts: any = { method: 'HEAD', agent: httpAgents[url.protocol as 'http:' | 'https:'], signal: controller.signal, headers: { 'User-Agent': 'RankPilot-LinkChecker/1.0' } };
        const req = lib.request(url, opts, res => {
            clearTimeout(timeout);
            if (res.statusCode && res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 405) {
                // Retry with GET in case HEAD unsupported
                if (res.statusCode === 405) {
                    const getReq = lib.get(url, { agent: httpAgents[url.protocol as 'http:' | 'https:'] }, getRes => {
                        resolve({ status: getRes.statusCode || 0 });
                    });
                    getReq.on('error', () => resolve({ status: 598 }));
                    return;
                }
            }
            resolve({ status: res.statusCode || 0 });
        });
        req.on('error', () => { clearTimeout(timeout); resolve({ status: 597 }); });
        req.end();
    });
}

async function main() {
    const files = walk(root);
    const results: LinkResult[] = [];
    const concurrency = 12;
    const queue: Array<{ file: string; url: string }> = [];
    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        const urls = extractUrls(content).filter(u => u.startsWith('http://') || u.startsWith('https://'));
        for (const url of urls) queue.push({ file, url });
    }
    let active = 0; let idx = 0; let broken = 0;
    await new Promise<void>(resolve => {
        const pump = () => {
            while (active < concurrency && idx < queue.length) {
                const { file, url } = queue[idx++];
                active++;
                (async () => {
                    let status: number | 'ERROR' = 'ERROR';
                    try {
                        const u = new URL(url);
                        const r = await headOrGet(u);
                        status = r.status;
                    } catch {
                        status = 'ERROR';
                    }
                    if (status === 'ERROR' || (typeof status === 'number' && (status === 0 || status >= 400))) broken++;
                    results.push({ file: file.substring(root.length + 1), url, status });
                    active--;
                    if (idx >= queue.length && active === 0) resolve(); else pump();
                })();
            }
        };
        pump();
    });

    const brokenList = results.filter(r => r.status === 'ERROR' || (typeof r.status === 'number' && (r.status === 0 || r.status >= 400)));
    brokenList.sort((a, b) => a.file.localeCompare(b.file) || a.url.localeCompare(b.url));

    console.log(`Scanned files: ${files.length}`);
    console.log(`Total unique links checked: ${results.length}`);
    console.log(`Broken/Problem links: ${brokenList.length}`);
    if (brokenList.length) {
        console.log('\nBroken Links:');
        for (const b of brokenList.slice(0, 100)) {
            console.log(` - [${b.status}] ${b.file} -> ${b.url}`);
        }
        if (brokenList.length > 100) console.log(` ... (${brokenList.length - 100} more)`);
    }
    process.exit(brokenList.length ? 2 : 0);
}

main().catch(e => { console.error('Link check failed', e); process.exit(1); });
