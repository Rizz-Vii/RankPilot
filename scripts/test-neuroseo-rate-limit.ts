import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';

(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        console.warn('PERF-01 rate limit test skipped (FIRESTORE_EMULATOR_HOST not set)');
        process.exit(0);
    }
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    const hostPort = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    const testEnv: RulesTestEnvironment = await initializeTestEnvironment({ projectId: 'demo-rankpilot', firestore: { rules, host: hostPort[0], port: Number(hostPort[1]) } });
    try {
        // Use admin SDK via testEnv.unauthenticatedContext? We'll simulate via direct require of admin instance if available.
        const admin = await import('firebase-admin');
        if (admin.apps.length === 0) { admin.initializeApp({ projectId: 'demo-rankpilot' } as any); }
        const adminDb = admin.firestore();

        const rateMod = require('../src/lib/neuroseo/rate-limit.ts');
        const enforceNeuroSeoRateLimit = rateMod.enforceNeuroSeoRateLimit;
        const NeuroSeoRateLimitError = rateMod.NeuroSeoRateLimitError;
        const scope = 'user:testRate';

        let allowed = 0; let blocked = 0; const limit = 5;
        for (let i = 0; i < limit + 2; i++) {
            try {
                await enforceNeuroSeoRateLimit(adminDb as any, scope, { limit });
                allowed++;
            } catch (e: any) {
                if (e instanceof NeuroSeoRateLimitError) { blocked++; break; } else { throw e; }
            }
        }
        if (allowed !== limit || blocked !== 1) {
            console.error('PERF-01 rate limit test FAILED', { allowed, blocked });
            process.exitCode = 1;
        } else {
            console.log('PERF-01 rate limit test passed');
        }
    } catch (e) {
        console.error('PERF-01 rate limit test errored', e);
        process.exitCode = 1;
    } finally {
        await testEnv.cleanup();
    }
})();
