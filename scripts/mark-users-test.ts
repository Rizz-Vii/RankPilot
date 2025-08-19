/**
 * mark-users-test.ts
 * Sets testAccount=true for specified user emails so they are included in historical seeding.
 */
 
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

const TARGET_EMAILS = [
    'admin@rankpilot.com',
    'enterprise@rankpilot.com',
    'agency@rankpilot.com'
];

function init() {
    if (!getApps().length) {
        const keyPath = path.resolve(__dirname, '../serviceAccount.json');
        let creds: any;
        if (fs.existsSync(keyPath)) {
            creds = require(keyPath);
        } else {
            creds = {
                project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
                client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                private_key: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            };
        }
        initializeApp({ credential: cert(creds), projectId: creds.project_id });
    }
    return getFirestore();
}

async function run() {
    const db = init();
    let updated = 0;
    for (const email of TARGET_EMAILS) {
        const snap = await db.collection('users').where('email', '==', email).limit(5).get();
        if (snap.empty) {
            console.warn(`\u26a0\ufe0f  No user document found for ${email}`);
            continue;
        }
        for (const doc of snap.docs) {
            const data = doc.data() || {};
            if (data.testAccount === true) {
                console.log(`\u2713 Already testAccount: ${email} (doc ${doc.id})`);
                continue;
            }
            await doc.ref.set({ testAccount: true }, { merge: true });
            updated++;
            console.log(`✅ Marked testAccount=true for ${email} (doc ${doc.id})`);
        }
    }
    console.log(`Done. Updated ${updated} document(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
