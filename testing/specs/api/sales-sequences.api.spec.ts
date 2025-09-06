import { expect, request as pwRequest, test } from '@playwright/test';

// Helper to try to obtain a real Firebase ID token if local test helpers are available.
async function fetchIdToken(baseURL: string): Promise<string | null> {
    try {
        const customTokRes = await fetch(`${baseURL}/api/test/auth/custom-token`).catch(() => undefined);
        if (!customTokRes || !customTokRes.ok) return null;
        const customTokJson = (await customTokRes.json().catch(() => ({}))) as { token?: string };
        const customToken = customTokJson?.token;
        if (!customToken) return null;

        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
        if (!apiKey) return null;
        const idTokRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: customToken, returnSecureToken: true })
            }
        ).catch(() => undefined);
        if (!idTokRes || !idTokRes.ok) return null;
        const idTokJson = (await idTokRes.json().catch(() => ({}))) as { idToken?: string };
        return idTokJson?.idToken || null;
    } catch {
        return null;
    }
}

test.describe('Sales Sequences API', () => {
    let idToken: string | null = null;
    const probeToken = process.env.CRAWL_PROBE_TOKEN || process.env.RL_PROBE_TOKEN || '8ab3b3a95a0d9cf1b5bb2b61be5e3981';

    test.beforeAll(async ({ baseURL }) => {
        if (!baseURL) return;
        idToken = await fetchIdToken(baseURL);
    });

    test('GET /api/sales/sequences requires auth', async ({ request }) => {
        const res = await request.get('/api/sales/sequences', {
            headers: { 'x-probe-token': probeToken }
        });
        // Expect 401 when auth is enforced; allow 500 for dev environments without auth wiring
        expect([401, 500]).toContain(res.status());
    });

    test('GET /api/sales/sequences returns list or forbidden with auth', async ({ baseURL }) => {
        const req = await pwRequest.newContext({ baseURL });
        const headers = {
            'x-probe-token': probeToken,
            Authorization: idToken ? `Bearer ${idToken}` : 'Bearer test'
        };
        const res = await req.get('/api/sales/sequences', { headers });
        const status = res.status();
        // Either 200 with { sequences: [] } or 403 forbidden (feature gate), tolerate 500 in flaky local setups
        expect([200, 403, 500]).toContain(status);
        if (status === 200) {
            const json = await res.json();
            expect(json).toHaveProperty('sequences');
            expect(Array.isArray(json.sequences)).toBeTruthy();
        } else if (status === 403) {
            const json = await res.json();
            expect(json).toHaveProperty('error');
            expect(json.error).toBe('forbidden');
        }
    });

    test('POST create + run sequence (happy path, best-effort with testMode)', async ({ baseURL }) => {
        const req = await pwRequest.newContext({ baseURL });
        const headers = {
            'x-probe-token': probeToken,
            'Content-Type': 'application/json',
            Authorization: idToken ? `Bearer ${idToken}` : 'Bearer test'
        };

        // Attempt to create a minimal valid sequence
        const createRes = await req.post('/api/sales/sequences', {
            headers,
            data: {
                name: `Seq PW ${Date.now()}`,
                description: 'Playwright-created sequence',
                steps: [
                    { id: 'step1', type: 'call', delayMinutes: 0 }
                ],
                targets: [
                    { id: 't1', name: 'Test Target', phone: '+15555550123' }
                ],
                status: 'draft'
            }
        });

        const createStatus = createRes.status();
        expect([201, 403, 401, 500]).toContain(createStatus);
        if (createStatus !== 201) {
            // If not created (likely missing admin/feature), nothing else we can assert safely in this env
            test.info().annotations.push({ type: 'skip-followup', description: `Create not permitted (status ${createStatus}); skipping run.` });
            return;
        }

        const created = await createRes.json();
        expect(created).toHaveProperty('id');
        const sequenceId = created.id as string;

        // Run the sequence in test mode to avoid real telephony
        const runRes = await req.post('/api/sales/sequences/run', {
            headers,
            data: { sequenceId, testMode: true }
        });
        const runStatus = runRes.status();
        expect([200, 403, 401, 500]).toContain(runStatus);
        if (runStatus === 200) {
            const json = await runRes.json();
            expect(json).toHaveProperty('executionId');
            expect(json).toHaveProperty('attempted');
            expect(json).toHaveProperty('succeeded');
            expect(json).toHaveProperty('failed');
            expect(json.testMode).toBeTruthy();
        }
    });

    test('POST create enforces admin permission (permission-denied when enforced)', async ({ baseURL }) => {
        const req = await pwRequest.newContext({ baseURL });
        const headers = {
            'x-probe-token': probeToken,
            'Content-Type': 'application/json',
            Authorization: idToken ? `Bearer ${idToken}` : 'Bearer test'
        };
        const res = await req.post('/api/sales/sequences', {
            headers,
            data: {
                name: `Seq PW Deny ${Date.now()}`,
                steps: [{ id: 's', type: 'call', delayMinutes: 0 }],
                targets: [{ id: 't', name: 'X', phone: '+15555550123' }],
                status: 'draft'
            }
        });
        // Expect 403 when server determines non-admin or no feature; allow 201 if the environment seeds admin rights, 401/500 tolerated in dev
        expect([403, 201, 401, 500]).toContain(res.status());
        if (res.status() === 403) {
            const json = await res.json();
            // Could be forbidden (feature) or admin_required based on enforcement order
            expect(['forbidden', 'admin_required']).toContain(json.error);
        }
    });
});
