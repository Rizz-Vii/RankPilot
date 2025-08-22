/**
 * Migration Script: Consolidate legacy NeuroSEO analysis documents into canonical collection.
 * Canonical: neuroSeoAnalyses
 * Legacy variants: neuroseo-analyses, neuroSeoAnalysis
 * Strategy: Scan each legacy collection, copy docs absent in canonical (by deterministic hash or existing id),
 * add migration metadata, and report summary. Idempotent (safe to re-run).
 */
import { createHash } from 'crypto';
import { adminDb } from '../src/lib/firebase-admin';

const CANONICAL = 'neuroSeoAnalyses';
const LEGACY = ['neuroseo-analyses', 'neuroSeoAnalysis'];

interface MigratedDocInfo { legacyId: string; canonicalId: string; sourceCollection: string; }

function buildDeterministicId(d: unknown): string {
    const obj = (d && typeof d === 'object') ? (d as Record<string, unknown>) : {};
    const request = (obj.request && typeof obj.request === 'object') ? (obj.request as Record<string, unknown>) : {};
    const userId = typeof obj.userId === 'string' ? obj.userId : (typeof request.userId === 'string' ? request.userId : 'unknown');
    const urls = Array.isArray(obj.urls) ? obj.urls : (Array.isArray(request.urls) ? request.urls : []);
    const createdAt: string | number | null = (() => {
        if (typeof obj.createdAt === 'string' || typeof obj.createdAt === 'number') return obj.createdAt;
        const ts = (obj as Record<string, unknown>).timestamp;
        if (typeof ts === 'string' || typeof ts === 'number') return ts;
        const ca = (obj as Record<string, unknown>).created_at;
        if (typeof ca === 'string' || typeof ca === 'number') return ca;
        return null;
    })();
    const overallScore: number = (() => {
        const os = (obj as Record<string, unknown>).overallScore;
        if (typeof os === 'number') return os;
        const sc = (obj as Record<string, unknown>).score;
        if (typeof sc === 'number') return sc;
        return 0;
    })();
    const base = JSON.stringify({ userId, urls, createdAt, overallScore });
    return 'neuro-' + createHash('sha1').update(base).digest('hex').slice(0, 24);
}

async function migrate() {
    const start = Date.now();
    const results: MigratedDocInfo[] = [];
    let examined = 0; let skipped = 0; let errors = 0;
    for (const col of LEGACY) {
        try {
            const snap = await adminDb.collection(col).limit(5000).get();
            if (snap.empty) continue;
            for (const doc of snap.docs) {
                examined++;
                const data = doc.data();
                const canonicalId = data.id && typeof data.id === 'string' ? data.id : buildDeterministicId(data);
                const targetRef = adminDb.collection(CANONICAL).doc(canonicalId);
                const exists = await targetRef.get();
                if (exists.exists) { skipped++; continue; }
                try {
                    await targetRef.set({
                        ...data,
                        id: canonicalId,
                        migratedFrom: col,
                        migratedAt: new Date().toISOString(),
                    }, { merge: true });
                    results.push({ legacyId: doc.id, canonicalId, sourceCollection: col });
                } catch (wErr: unknown) {
                    errors++;
                    const msg = wErr && typeof wErr === 'object' && 'message' in wErr ? String((wErr as { message?: unknown }).message) : String(wErr);
                    console.warn('[migrate] write failed', col, doc.id, msg);
                }
            }
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
            console.warn('[migrate] scan failed', col, msg);
        }
    }
    const summary = { examined, migrated: results.length, skipped, errors, ms: Date.now() - start };
    console.log('[NeuroSEO Migration Summary]', summary);
    if (results.length) {
        console.log('Sample migrated ids:', results.slice(0, 10));
    }
}

migrate().then(() => process.exit(0)).catch(e => { console.error('Migration failed', e); process.exit(1); });
