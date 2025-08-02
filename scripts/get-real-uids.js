const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const envPath = path.join(__dirname, '..', '.env.test');
const envContent = fs.readFileSync(envPath, 'utf8');

const projectId = envContent.match(/FIREBASE_ADMIN_PROJECT_ID=(.+)/)[1];
const clientEmail = envContent.match(/FIREBASE_ADMIN_CLIENT_EMAIL=(.+)/)[1];
const privateKeyMatch = envContent.match(/FIREBASE_ADMIN_PRIVATE_KEY="(.+)"/s);
const privateKey = privateKeyMatch[1].replace(/\\n/g, '\n');

const serviceAccount = {
    type: 'service_account',
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
    });
}

const emails = [
    'abbas_ali_rizvi@hotmail.com',
    'starter@rankpilot.com',
    'agency@rankpilot.com',
    'enterprise@rankpilot.com',
    'admin@rankpilot.com'
];

console.log('🔍 Fetching real Firebase UIDs for test users...\n');

const fetchUIDs = async () => {
    const uidMap = {};

    for (const email of emails) {
        try {
            const user = await admin.auth().getUserByEmail(email);
            console.log(`✅ ${email}: ${user.uid}`);
            uidMap[email] = user.uid;
        } catch (e) {
            console.log(`❌ ${email}: NOT_FOUND - ${e.code}`);
            uidMap[email] = null;
        }
    }

    console.log('\n🔧 TypeScript Configuration Update:');
    console.log('Copy these UIDs to unified-test-users.ts:\n');

    const tiers = ['free', 'starter', 'agency', 'enterprise', 'admin'];
    emails.forEach((email, _index) => {
        if (uidMap[email]) {
            console.log(`    ${tiers[index]}: {`);
            console.log(`        uid: "${uidMap[email]}",`);
            console.log(`        email: "${email}",`);
            console.log(`        // ... rest of config`);
            console.log(`    },`);
        }
    });

    process.exit(0);
};

fetchUIDs().catch(console._error);
