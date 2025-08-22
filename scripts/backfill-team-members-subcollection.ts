import type { ServiceAccount } from 'firebase-admin/app';
import { cert, initializeApp } from 'firebase-admin/app';
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
        console.error('Failed to initialize Firebase Admin (missing serviceAccount.json)', e);
        process.exit(1);
    }
}

async function run() {
    init();
    const db = getFirestore();
    const teamsSnap = await db.collection('teams').get();
    let processed = 0;
    for (const doc of teamsSnap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const rawMembers = data.members;
        const members: Array<Record<string, unknown>> = Array.isArray(rawMembers) ? rawMembers.filter(m => m && typeof m === 'object') as Array<Record<string, unknown>> : [];
        if (!members.length) continue;
        const subSnap = await db.collection('teams').doc(doc.id).collection('members').limit(1).get();
        if (!subSnap.empty) continue;
        for (const m of members) {
            const id = (m.userId as string | undefined) || (m.id as string | undefined) || (m.email as string | undefined);
            if (!id) continue;
            await db.collection('teams').doc(doc.id).collection('members').doc(id).set({
                userId: (m.userId as string | undefined) || null,
                email: (m.email as string | undefined) || null,
                role: (m.role as string | undefined) || 'member',
                status: (m.status as string | undefined) || 'active',
                name: (m.name as string | undefined) || null,
                avatar: (m.avatar as string | undefined) || null,
                joinedAt: (m.joinedAt as Date | undefined) || new Date(),
                lastActive: (m.lastActive as Date | undefined) || new Date(),
                source: 'backfill_phase2'
            }, { merge: true });
        }
        processed++;
        console.log(`Backfilled team ${doc.id} with ${members.length} members`);
    }
    console.log(`Completed backfill for ${processed} teams.`);
}

run().catch(e => { console.error(e); process.exit(1); });
