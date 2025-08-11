#!/usr/bin/env ts-node
// NEU-03 TTL cleanup for neuroSeoAnalyses (compact docs)
import { adminDb } from '../src/lib/firebase-admin';

async function main() {
    const maxAgeMs = 1000 * 60 * 60 * 24 * 7; // 7 days
    const cutoff = Date.now() - maxAgeMs;
    const snap = await adminDb.collection('neuroSeoAnalyses').where('createdAt', '<', new Date(cutoff)).limit(500).get().catch(() => null);
    if (!snap) { console.warn('Cleanup skipped (mock admin)'); return; }
    let deleted = 0;
    for (const doc of snap.docs) {
        await doc.ref.delete();
        deleted++;
    }
    console.log('NEU-03 cleanup complete', { deleted });
}
main().catch(e => { console.error('NEU-03 cleanup failed', e); process.exit(1); });
