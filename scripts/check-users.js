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

const checkUsers = async () => {
    const emails = [
        'abbas_ali_rizvi@hotmail.com',
        'starter@rankpilot.com',
        'agency@rankpilot.com',
        'enterprise@rankpilot.com',
        'admin@rankpilot.com'
    ];

    console.log('🔍 Checking Firebase Auth users...\n');

    for (const email of emails) {
        try {
            const user = await admin.auth().getUserByEmail(email);
            console.log(`✅ ${email}`);
            console.log(`   UID: ${user.uid}`);
            console.log(`   Email Verified: ${user.emailVerified}`);
            console.log(`   Disabled: ${user.disabled}`);
            console.log(`   Provider: ${user.providerData.map(p => p.providerId).join(', ')}`);
            console.log('');
        } catch (e) {
            console.log(`❌ ${email}: NOT_FOUND - ${e.code}`);
        }
    }

    process.exit(0);
};

checkUsers().catch(console._error);
