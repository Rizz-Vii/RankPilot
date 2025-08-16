#!/usr/bin/env ts-node
/*
 * NeuroSEO Adoption Monitor
 * Purpose: Surface aggregate adoption percentages for semantic map & neural crawler.
 * Strategy:
 *   1) Fetch /api/health (HEALTH_URL) to reuse live KPI logic.
 *   2) Fallback: compute naive ratios from Firestore counts (agg / (agg + legacy)).
 * Exit Codes:
 *   0 success (thresholds met or none provided)
 *   2 thresholds NOT met (if TARGET_* provided)
 *   3 unexpected failure
 * Env Vars:
 *   HEALTH_URL (default http://localhost:3000/api/health)
 *   TARGET_CRAWLER_PCT (optional)
 *   TARGET_SEMANTIC_PCT (optional)
 *   OUTPUT_FILE (optional JSON output path)
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface AdoptionSummary { source: 'health' | 'firestore-fallback'; crawlerPct: number | null; semanticPct: number | null; generatedAt: string; thresholds?: { crawler?: number; semantic?: number }; passes?: { crawler?: boolean; semantic?: boolean }; }

async function tryFetchHealth(url: string): Promise<{ crawler: number | null; semantic: number | null } | null> {
    try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        const data: any = await res.json();
        const kpis = data?.kpis || data;
        return {
            crawler: typeof kpis?.crawlerAggregateAdoptionPct === 'number' ? kpis.crawlerAggregateAdoptionPct : null,
            semantic: typeof kpis?.semanticMapAggregateAdoptionPct === 'number' ? kpis.semanticMapAggregateAdoptionPct : null,
        };
    } catch {
        return null;
    }
}

async function computeFallback(): Promise<{ crawler: number | null; semantic: number | null }> {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const [crawlerLegacy, crawlerAgg, semanticLegacy, semanticAgg] = await Promise.all([
        db.collection('neuralCrawlerResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('neuralCrawlerResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
    ]);
    const crawlerDenom = crawlerLegacy + crawlerAgg;
    const semanticDenom = semanticLegacy + semanticAgg;
    return {
        crawler: crawlerDenom > 0 ? +((crawlerAgg / crawlerDenom) * 100).toFixed(2) : null,
        semantic: semanticDenom > 0 ? +((semanticAgg / semanticDenom) * 100).toFixed(2) : null,
    };
}

async function main() {
    const healthUrl = process.env.HEALTH_URL || 'http://localhost:3000/api/health';
    const targetCrawler = process.env.TARGET_CRAWLER_PCT ? parseFloat(process.env.TARGET_CRAWLER_PCT) : undefined;
    const targetSemantic = process.env.TARGET_SEMANTIC_PCT ? parseFloat(process.env.TARGET_SEMANTIC_PCT) : undefined;
    let source: AdoptionSummary['source'] = 'health';
    let crawlerPct: number | null = null;
    let semanticPct: number | null = null;
    const health = await tryFetchHealth(healthUrl);
    if (health) { crawlerPct = health.crawler; semanticPct = health.semantic; }
    if (crawlerPct == null && semanticPct == null) {
        const fb = await computeFallback();
        crawlerPct = fb.crawler; semanticPct = fb.semantic; source = 'firestore-fallback';
    }
    const summary: AdoptionSummary = { source, crawlerPct, semanticPct, generatedAt: new Date().toISOString(), thresholds: { crawler: targetCrawler, semantic: targetSemantic }, passes: {} };
    if (targetCrawler !== undefined && crawlerPct != null) summary.passes!.crawler = crawlerPct >= targetCrawler;
    if (targetSemantic !== undefined && semanticPct != null) summary.passes!.semantic = semanticPct >= targetSemantic;
    console.log('[adoption] summary', JSON.stringify(summary, null, 2));
    const out = process.env.OUTPUT_FILE;
    if (out) {
        try {
            const fs = await import('fs');
            fs.mkdirSync(require('path').dirname(out), { recursive: true });
            fs.writeFileSync(out, JSON.stringify(summary, null, 2));
            console.log(`[adoption] wrote ${out}`);
        } catch (e) {
            console.error('[adoption] failed to write OUTPUT_FILE', (e as any)?.message);
        }
    }
    let code = 0;
    if ((targetCrawler !== undefined && summary.passes?.crawler === false) || (targetSemantic !== undefined && summary.passes?.semantic === false)) code = 2;
    process.exit(code);
}

main().catch(e => { console.error('[adoption] FAILED', e); process.exit(3); });
