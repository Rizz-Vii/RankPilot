/**
 * mark-users-test.ts
 * Sets testAccount=true for specified user emails so they are included in historical seeding.
 */

import type { ServiceAccount } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const TARGET_EMAILS = [
    'admin@rankpilot.com',
    'enterprise@rankpilot.com',
    'agency@rankpilot.com'
];

function init() {
    if (!getApps().length) {
        // Prefer ADC if GOOGLE_APPLICATION_CREDENTIALS is set
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            initializeApp();
            return getFirestore();
        }

        const keyPath = path.resolve(__dirname, '../serviceAccount.json');

        const fromEnv = (() => {
            const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
            const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
            if (projectId && clientEmail && privateKeyRaw) {
                const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
                const sa: ServiceAccount = { projectId, clientEmail, privateKey };
                return sa;
            }
            return null;
        })();

        const fromFile = (() => {
            if (!fs.existsSync(keyPath)) return null;
            try {
                const raw = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as Record<string, unknown>;
                const projectId = typeof raw.project_id === 'string' ? raw.project_id : (typeof raw.projectId === 'string' ? raw.projectId : undefined);
                const clientEmail = typeof raw.client_email === 'string' ? raw.client_email : (typeof raw.clientEmail === 'string' ? raw.clientEmail : undefined);
                const privateKey = typeof raw.private_key === 'string' ? raw.private_key : (typeof raw.privateKey === 'string' ? raw.privateKey : undefined);
                if (projectId && clientEmail && privateKey) {
                    const sa: ServiceAccount = { projectId, clientEmail, privateKey };
                    return sa;
                }
                return null;
            } catch {
                return null;
            }
        })();

        const sa = fromEnv ?? fromFile;
        if (!sa) {
            throw new Error('Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_* env vars, or provide serviceAccount.json locally.');
        }
        initializeApp({ credential: cert(sa), projectId: sa.projectId });
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
