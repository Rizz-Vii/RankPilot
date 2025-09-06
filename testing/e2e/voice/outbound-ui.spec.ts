import { adminDb } from '@/lib/firebase-admin';
import { expect, test } from '@playwright/test';

// E2E: fill the Voice Agent UI, submit, and assert an appointment is created

test.describe('voice agent outbound UI', () => {
    test.skip(process.env.E2E_VOICE !== 'true', 'Voice tests disabled by default; set E2E_VOICE=true to enable');
    test('accepts a number, calls with a pitch, and saves appointment', async ({ page, baseURL, request }) => {
        if (!baseURL) test.skip(true, 'no baseURL configured');

        await page.goto(`${baseURL}/voice`);
        // The FeatureGate may hide the UI depending on plan; if the labeled field is missing, skip.
        const phoneField = page.getByLabel('Phone Number');
        const hasPhoneField = await phoneField.count().then(c => c > 0).catch(() => false);
        if (!hasPhoneField) test.skip(true, 'voice page gated or input not available in this env');

        await phoneField.fill('+1 555 0101');
        await page.getByLabel('Pitch').fill('Hi! Quick intro call to share RankPilot.');

        // Set a near-future time
        const dt = new Date(Date.now() + 60 * 60 * 1000); // +1h
        const pad = (n: number) => String(n).padStart(2, '0');
        const v = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        await page.getByLabel('Appointment Start').fill(v);

        await page.getByRole('button', { name: 'Call & Book' }).click();

        // Success banner
        const success = page.getByText(/Success\. Appointment ID:/i);
        await expect(success).toBeVisible();

        // Extract apptId text if present
        const apptText = await success.textContent();
        const match = apptText?.match(/Appointment ID:\s*(\S+)/i);
        const apptId = match?.[1];

        // Optional DB assertions if admin creds available
        const hasAdminCreds = !!(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
            (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
        );

        if (hasAdminCreds && apptId) {
            const apptSnap = await adminDb.collection('appointments').doc(apptId).get();
            expect(apptSnap.exists).toBeTruthy();
            const confSnap = await adminDb.collection('voice_confirmations').where('apptId', '==', apptId).limit(1).get();
            expect(confSnap.empty).toBeFalsy();
        }
    });
});
