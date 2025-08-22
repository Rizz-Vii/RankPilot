#!/usr/bin/env ts-node
/**
 * prune-if-ready.ts
 * Safely triggers legacy NeuroSEO doc prune when BOTH crawler & semantic adoption ≥95% (aggregate hits dominance)
 * and a guard file `.adoption_sustained` records at least SUSTAIN_DAYS consecutive confirmations.
 *
 * Usage:
 *   ts-node scripts/prune-if-ready.ts            # dry run (default)
 *   CONFIRM=1 ts-node scripts/prune-if-ready.ts  # execute prune script when sustained
 * Env:
 *   ADOPTION_TARGET=95   (override threshold)
 *   SUSTAIN_DAYS=3       (override consecutive day requirement)
 *   DRY_RUN=0            (alias for CONFIRM=1)
 */
import { spawnSync } from 'child_process';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

interface Adoption { crawler: number | null; semantic: number | null; }

async function currentAdoption(): Promise<Adoption> {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    try {
        const today = new Date().toISOString().slice(0, 10);
        const doc = await db.collection('unifiedMetricsDaily').doc(today).get();
        if (doc.exists) {
            const d = doc.data() as unknown;
            const getNum = (obj: unknown, key: string): number | null => {
                if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
                    const v = (obj as Record<string, unknown>)[key];
                    return typeof v === 'number' ? v : null;
                }
                return null;
            };
            return {
                crawler: getNum(d, 'crawlerAggregateAdoptionPct'),
                semantic: getNum(d, 'semanticMapAggregateAdoptionPct')
            };
        }
    } catch { }
    const [crawlerLegacy, crawlerAgg, semanticLegacy, semanticAgg] = await Promise.all([
        db.collection('neuralCrawlerResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('neuralCrawlerResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResultsAgg').count().get().then(r => r.data().count).catch(() => 0)
    ]);
    const crawlerDen = crawlerLegacy + crawlerAgg;
    const semanticDen = semanticLegacy + semanticAgg;
    return {
        crawler: crawlerDen ? +(crawlerAgg / crawlerDen * 100).toFixed(2) : null,
        semantic: semanticDen ? +(semanticAgg / semanticDen * 100).toFixed(2) : null
    };
}

function updateSustainFile(ok: boolean, sustainDays: number): boolean {
    const file = '.adoption_sustained';
    let entries: string[] = [];
    if (fs.existsSync(file)) {
        entries = fs.readFileSync(file, 'utf8').trim().split(/\n+/).filter(Boolean);
        const last = entries[entries.length - 1];
        if (last?.startsWith(new Date().toISOString().slice(0, 10))) return entries.length >= sustainDays; // already recorded today
    }
    if (ok) { entries.push(`${new Date().toISOString().slice(0, 10)} OK`); }
    else { entries = []; }
    fs.writeFileSync(file, entries.join('\n') + '\n');
    return entries.length >= sustainDays;
}

async function main() {
    const target = parseFloat(process.env.ADOPTION_TARGET || '95');
    const sustainDays = parseInt(process.env.SUSTAIN_DAYS || '3', 10);
    const adoption = await currentAdoption();
    const ok = (adoption.crawler ?? 0) >= target && (adoption.semantic ?? 0) >= target;
    const sustained = updateSustainFile(ok, sustainDays);
    console.log(JSON.stringify({ adoption, target, ok, sustained, sustainDays }, null, 2));
    if (sustained && (process.env.CONFIRM === '1' || process.env.DRY_RUN === '0')) {
        console.log('[prune-if-ready] Sustained adoption achieved – invoking prune script (dryRun unless CONFIRM=1)');
        const args = ['scripts/prune-neuroseo-legacy-docs.ts'];
        const env = { ...process.env, DRY_RUN: process.env.CONFIRM === '1' ? '0' : '1', CONFIRM_PRUNE: process.env.CONFIRM === '1' ? '1' : '0' } as NodeJS.ProcessEnv;
        const res = spawnSync('ts-node', args, { stdio: 'inherit', env });
        process.exit(res.status ?? 0);
    } else {
        console.log('[prune-if-ready] Not sustained / below target – no action.');
    }
}

main().catch(e => { console.error('[prune-if-ready] failed', e); process.exit(1); });
