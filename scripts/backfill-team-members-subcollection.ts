import type { ServiceAccount } from 'firebase-admin/app';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let appInited = false;
function init() {
    if (appInited) return;
    try {
        const raw = fs.readFileSync('serviceAccount.json', 'utf8');
        const sa = JSON.parse(raw) as ServiceAccount;
        initializeApp({ credential: cert(sa) });
        appInited = true;
    } catch (e) {
        console.error('Failed to initialize Firebase Admin (missing serviceAccount.json)');
        process.exit(1);
    }
}

async function run() {
    init();
    const db = getFirestore();
    const teamsSnap = await db.collection('teams').get();
    let processed = 0;
    for (const doc of teamsSnap.docs) {
        const data: any = doc.data();
        const members: any[] = Array.isArray(data.members) ? data.members : [];
        if (!members.length) continue;
        const subSnap = await db.collection('teams').doc(doc.id).collection('members').limit(1).get();
        if (!subSnap.empty) continue;
        for (const m of members) {
            const id = m.userId || m.id || m.email;
            if (!id) continue;
            await db.collection('teams').doc(doc.id).collection('members').doc(id).set({
                userId: m.userId || null,
                email: m.email || null,
                role: m.role || 'member',
                status: m.status || 'active',
                name: m.name || null,
                avatar: m.avatar || null,
                joinedAt: m.joinedAt || new Date(),
                lastActive: m.lastActive || new Date(),
                source: 'backfill_phase2'
            }, { merge: true });
        }
        processed++;
        console.log(`Backfilled team ${doc.id} with ${members.length} members`);
    }
    console.log(`Completed backfill for ${processed} teams.`);
}

run().catch(e => { console.error(e); process.exit(1); });
