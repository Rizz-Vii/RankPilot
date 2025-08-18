import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Test-only endpoint: seeds a kpiAlertsDaily doc for the current date so Playwright
// can deterministically validate alert history rendering on /admin/observability.
// Non-production only; returns 404 in production environments.
// Query params (optional): type (default provenanceCoverage), level (warn|critical, default warn),
// value (number), ma7 (number for relevant MA7 metric), message (string override).
export const dynamic = 'force-dynamic';

// Shared MA7 field mapping (
const MA7_MAP: Record<string, string> = {
    provenanceCoverage: 'ma7Provenance',
    crawlerAggregateAdoption: 'ma7CrawlerAdoption',
    semanticMapAggregateAdoption: 'ma7SemanticAdoption',
    fallbackRate: 'ma7FallbackRate',
    latencyOverallP95: 'ma7LatencyP95',
    cacheHitRatio: 'ma7CacheHitRatio',
    rateLimitRejectionRate: 'ma7RateLimitRejectionRate'
};

function coerceNum(v: unknown): number | undefined {
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

async function seed(dateKey: string, alertsIn: Array<unknown>, ma7Override?: Record<string, number | null>) {
    const ref = adminDb.collection('kpiAlertsDaily').doc(dateKey);
    await adminDb.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const base: any = snap.exists ? (snap.data() as any) : { date: dateKey, alerts: [], createdAt: new Date() };
        const alerts: any[] = (base.alerts || []) as any[];
        alertsIn.forEach(a => alerts.push(a as any));
        const update: any = { alerts, updatedAt: new Date() };
        if (ma7Override) {
            for (const [k, v] of Object.entries(ma7Override)) {
                if (v == null) continue;
                (update as any)[k] = v;
            }
        }
        if (!snap.exists) tx.set(ref, { ...base, ...update }); else tx.update(ref, update);
    });
}

// Backward compatible single-alert seeding via GET + ability to set multiple MA7 fields through query params.
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production' || process.env.CI_PRODUCTION === '1') {
        return NextResponse.json({ ok: false, reason: 'disabled' }, { status: 404 });
    }
    const url = new URL(req.url);
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const type = url.searchParams.get('type') || 'provenanceCoverage';
    const level = (url.searchParams.get('level') as 'warn' | 'critical') || 'warn';
    const valueRaw = url.searchParams.get('value');
    const value = valueRaw ? Number(valueRaw) : (type === 'provenanceCoverage' ? 95 : 60);
    const ma7Raw = url.searchParams.get('ma7');
    const ma7 = ma7Raw ? Number(ma7Raw) : (type === 'provenanceCoverage' ? 96 : 65);
    const message = url.searchParams.get('message') || `${type} seeded for test`;

    // Collect explicit MA7 overrides (any provided query matching known MA7 field names or shorthand parameters e.g. ma7LatencyP95=123).
    const ma7Override: Record<string, number> = {};
    // Provide both direct field style (ma7LatencyP95) and raw map style (?ma7Map=latencyOverallP95:123,cacheHitRatio:90)
    for (const key of Object.values(MA7_MAP)) {
        const qp = url.searchParams.get(key);
        const num = coerceNum(qp);
        if (typeof num === 'number') ma7Override[key] = num;
    }
    const mapRaw = url.searchParams.get('ma7Map');
    if (mapRaw) {
        mapRaw.split(',').forEach(pair => {
            const [metric, val] = pair.split(':');
            const field = MA7_MAP[metric];
            const num = coerceNum(val);
            if (field && typeof num === 'number') ma7Override[field] = num;
        });
    }
    // If user just passes ?ma7LatencyP95 without generic ma7 param, we still respect it. Also apply single-alert's own ma7 value.
    const maField = MA7_MAP[type];
    if (maField && typeof ma7 === 'number' && ma7Override[maField] == null) ma7Override[maField] = ma7;

    try {
        await seed(dateKey, [{ type, level, message, value, threshold: 0 }], ma7Override);
        return NextResponse.json({ ok: true, date: dateKey, seeded: { type, level, value }, ma7Override });
    } catch (e: unknown) {
        const msg = (e as any)?.message || 'seed_failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}

// New: POST supports batch seeding: { alerts: [{type, level?, value?, ma7?, message?}], ma7: { ma7LatencyP95:123, ... } }
export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === 'production' || process.env.CI_PRODUCTION === '1') {
        return NextResponse.json({ ok: false, reason: 'disabled' }, { status: 404 });
    }
    let body: any = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const alertsReq: any[] = Array.isArray(body?.alerts) ? body.alerts : [];
    const alerts = alertsReq.map((a: any) => ({
        type: a?.type || 'provenanceCoverage',
        level: (a?.level === 'critical' ? 'critical' : 'warn') as 'warn' | 'critical',
        message: a?.message || `${a?.type || 'provenanceCoverage'} seeded (batch)`,
        value: typeof a?.value === 'number' ? a.value : (a?.type === 'provenanceCoverage' ? 95 : 60),
        threshold: 0
    }));
    // If no alerts provided, seed a default provenance coverage alert to simplify usage.
    if (!alerts.length) alerts.push({ type: 'provenanceCoverage', level: 'warn', message: 'provenanceCoverage seeded (default)', value: 95, threshold: 0 });
    // Apply per-alert ma7 override if provided
    const ma7Overrides: Record<string, number> = { ...((body as any)?.ma7 || {}) };
    alertsReq.forEach((a: any) => {
        if (a && typeof a?.ma7 === 'number') {
            const field = MA7_MAP[a.type as string];
            if (field) ma7Overrides[field] = a.ma7 as number;
        }
    });
    try {
        await seed(dateKey, alerts, ma7Overrides);
        return NextResponse.json({ ok: true, date: dateKey, count: alerts.length, ma7Override: ma7Overrides });
    } catch (e: unknown) {
        const msg = (e as any)?.message || 'seed_failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
