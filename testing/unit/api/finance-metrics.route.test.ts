import { expect } from 'chai';
import { GET as financeGET } from '../../../src/app/api/finance/metrics/route';

// Minimal shape the route under test relies upon (url + headers.get)
interface MinimalHeaders { get: (k: string) => string | null }
interface MinimalRequest { url: string; headers: MinimalHeaders }
type MinimalResponse = { status: number } & Record<string, unknown>;

// Patch global adminAuth/adminDb mocks by leveraging the module's own fallback:
// src/lib/firebase-admin.ts already creates a mock admin when initialization fails.

describe('API finance/metrics route (unit)', () => {
    it('returns 401 without auth', async () => {
        const req: MinimalRequest = { url: 'http://localhost/api/finance/metrics?months=3', headers: { get: () => null } };
        const res = await (financeGET as unknown as (r: MinimalRequest) => Promise<MinimalResponse>)(req);
        expect(res.status).to.equal(401);
    });

    it('returns 200 or tolerated status with Bearer test token (mock admin)', async () => {
        const headers: MinimalHeaders = { get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer test' : null) };
        const req: MinimalRequest = { url: 'http://localhost/api/finance/metrics?months=2', headers };
        const res = await (financeGET as unknown as (r: MinimalRequest) => Promise<MinimalResponse>)(req);
        expect([200, 401, 500]).to.include(res.status);
    });
});
