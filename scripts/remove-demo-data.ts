#!/usr/bin/env ts-node
/**
 * Removes any demo/test collections not needed in production.
 * Safe-guarded by APPLY=1. Dry-run outputs what would be removed.
 */
import { adminDb } from '@/lib/firebase-admin';

const APPLY = process.env.APPLY === '1';
const DEMO_COLLECTIONS = ['demoItems', 'sampleData', 'playground', 'devOnly', 'seedJobs'];

async function removeCollections(names: string[]) {
    const res: Array<Record<string, unknown>> = [];
    for (const name of names) {
        const colRef = adminDb.collection(name);
        const snap = await colRef.limit(500).get();
        let deletes = 0;
        for (const doc of snap.docs) {
            deletes++;
            if (APPLY) await colRef.doc(doc.id).delete().catch(() => { });
        }
        res.push({ collection: name, deletes, applied: APPLY });
    }
    return res;
}

async function main() {
    const res = await removeCollections(DEMO_COLLECTIONS);
    console.log(JSON.stringify({ ok: true, res }, null, 2));
}

main().catch(err => { console.error('[remove-demo-data] error', err); process.exit(1); });
