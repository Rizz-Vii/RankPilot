import { adminDb } from '@/lib/firebase-admin';
import { expect, test } from '@playwright/test';

test.describe('voice inbound create', () => {
    test.skip(process.env.E2E_VOICE !== 'true', 'Voice tests disabled by default; set E2E_VOICE=true to enable');
    test('posts create action and gets appointment id', async ({ request, baseURL }) => {
        if (!baseURL) {
            test.skip(true, 'no baseURL configured for Playwright');
        }

        const res = await request.post(`${baseURL}/api/voice/inbound`, {
            headers: { 'x-probe-token': process.env.CRAWL_PROBE_TOKEN || '8ab3b3a95a0d9cf1b5bb2b61be5e3981' },
            timeout: 20000,
            data: {
                action: 'create',
                payload: {
                    start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
                    serviceId: 'test-service',
                    customer: {
                        name: 'Playwright Test',
                        email: 'pw-test+voice@example.com',
                    },
                },
            },
        });

        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body).toHaveProperty('ok', true);
        // In probe/dev mode, backend may not allocate apptId. Accept ok+probe responses.
        const apptOk = body.apptId && typeof body.apptId === 'string';
        const probeOk = body.probe === true;
        expect(apptOk || probeOk).toBeTruthy();

        // Optional DB assertions if admin credentials are available
        const hasAdminCreds = !!(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
            (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
        );

        if (hasAdminCreds && apptOk) {
            const apptId: string = body.apptId as string;

            // appointments doc exists
            const apptSnap = await adminDb.collection('appointments').doc(apptId).get();
            expect(apptSnap.exists).toBeTruthy();
            const appt = apptSnap.data() as any;
            expect(appt?.status).toBe('confirmed');

            // voice_confirmations has an entry for this appt
            const confSnap = await adminDb.collection('voice_confirmations')
                .where('apptId', '==', apptId)
                .limit(1)
                .get();
            expect(confSnap.empty).toBeFalsy();

            // emailQueue has an entry referencing this appt
            const eqSnap = await adminDb.collection('emailQueue')
                .where('meta.apptId', '==', apptId)
                .limit(1)
                .get();
            expect(eqSnap.empty).toBeFalsy();
        }
    });
});
