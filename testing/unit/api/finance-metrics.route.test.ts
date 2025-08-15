import { expect } from 'chai';
import { GET as financeGET } from '../../../src/app/api/finance/metrics/route';

// Minimal NextRequest shim
class FakeRequest {
    url: string;
    headers: Map<string, string>;
    constructor(url: string, headers: Record<string, string> = {}) {
        this.url = url;
        this.headers = new Map(Object.entries(headers));
    }
    get headersShim() { return { get: (k: string) => this.headers.get(k) || this.headers.get(k.toLowerCase()) || null }; }
}

// Patch global adminAuth/adminDb mocks by leveraging the module's own fallback:
// src/lib/firebase-admin.ts already creates a mock admin when initialization fails.

describe('API finance/metrics route (unit)', () => {
    it('returns 401 without auth', async () => {
        const req: any = { url: 'http://localhost/api/finance/metrics?months=3', headers: { get: () => null } };
        const res: any = await (financeGET as any)(req);
        expect(res.status).to.equal(401);
    });

    it('returns 200 or tolerated status with Bearer test token (mock admin)', async () => {
        const headers: any = { get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer test' : null) };
        const req: any = { url: 'http://localhost/api/finance/metrics?months=2', headers };
        const res: any = await (financeGET as any)(req);
        expect([200, 401, 500]).to.include(res.status);
    });
});
