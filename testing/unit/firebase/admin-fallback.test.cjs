require('ts-node/register/transpile-only');
const assert = require('assert');

describe('firebase-admin fallback', () => {
    const modPath = '../../../src/lib/firebase-admin.ts';

    beforeEach(() => {
        // Clear any admin env so initialization prefers fallback
        delete process.env.FIREBASE_ADMIN_PROJECT_ID;
        delete process.env.FIREBASE_PROJECT_ID;
        delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
        delete process.env.FIREBASE_PRIVATE_KEY;
        delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        // Force mock path in tests to avoid real token verification
        process.env.FIREBASE_ADMIN_FORCE_MOCK = '1';
        process.env.NODE_ENV = 'test';
        try { delete require.cache[require.resolve(modPath)]; } catch { }
    });

    it('exports adminAuth/adminDb/adminStorage even without credentials', () => {
        const mod = require(modPath);
        assert.ok(mod.adminAuth);
        assert.ok(mod.adminDb);
        assert.ok(mod.adminStorage);
    });

    it('mock admin auth returns mock-user', async () => {
        const { adminAuth } = require(modPath);
        const token = await adminAuth.verifyIdToken('any');
        assert.strictEqual(token.uid, 'mock-user');
    });
});
