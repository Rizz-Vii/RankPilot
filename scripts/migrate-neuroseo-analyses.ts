/**
 * Migration Script: Consolidate legacy NeuroSEO analysis documents into canonical collection.
 * Canonical: neuroSeoAnalyses
 * Legacy variants: neuroseo-analyses, neuroSeoAnalysis
 * Strategy: Scan each legacy collection, copy docs absent in canonical (by deterministic hash or existing id),
 * add migration metadata, and report summary. Idempotent (safe to re-run).
 */
import { adminDb } from '../src/lib/firebase-admin';
import { createHash } from 'crypto';

const CANONICAL = 'neuroSeoAnalyses';
const LEGACY = ['neuroseo-analyses', 'neuroSeoAnalysis'];

interface MigratedDocInfo { legacyId: string; canonicalId: string; sourceCollection: string; }

function buildDeterministicId(d: any): string {
    const base = JSON.stringify({
        userId: d.userId || d.request?.userId || 'unknown',
        urls: d.urls || d.request?.urls || [],
        createdAt: d.createdAt || d.timestamp || d.created_at || null,
        overallScore: d.overallScore || d.score || 0,
    });
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
                    
                    // Mark original document as migrated for Wave 4 cleanup
                    await doc.ref.update({
                        migrated: true,
                        migratedToCanonical: canonicalId,
                        migratedAt: new Date().toISOString()
                    });
                    
                    results.push({ legacyId: doc.id, canonicalId, sourceCollection: col });
                } catch (wErr) {
                    errors++; console.warn('[migrate] write failed', col, doc.id, (wErr as any)?.message);
                }
            }
        } catch (e) {
            console.warn('[migrate] scan failed', col, (e as any)?.message);
        }
    }
    const summary = { examined, migrated: results.length, skipped, errors, ms: Date.now() - start };
    console.log('[NeuroSEO Migration Summary]', summary);
    if (results.length) {
        console.log('Sample migrated ids:', results.slice(0, 10));
    }
}

migrate().then(() => process.exit(0)).catch(e => { console.error('Migration failed', e); process.exit(1); });
