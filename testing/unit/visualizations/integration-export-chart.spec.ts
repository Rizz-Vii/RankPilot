import { expect } from 'chai';
import sinon from 'sinon';
import { POST } from '@/app/api/visualizations/route';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';

// Build a NextRequest-like mock
class MockRequest {
    headers: Map<string, string>;
    private body: any;
    constructor(body: any, token: string) {
        this.headers = new Map([["authorization", `Bearer ${token}`]]);
        this.body = body;
    }
    get headersObj() {
        return { get: (k: string) => this.headers.get(k.toLowerCase()) } as any;
    }
    get headersArray() { return this.headers; }
    get json() { return async () => this.body; }
}

// Helper to wrap into NextRequest signature compat
function toNextRequest(body: any, token: string): any {
    const r: any = new MockRequest(body, token);
    return { headers: r.headersObj, json: r.json };
}

describe('Integration: POST export_chart', () => {
    const bucketStub: any = { file: sinon.stub() };
    beforeEach(() => {
        sinon.stub(adminAuth, 'verifyIdToken').callsFake(async (t: any) => ({ uid: 'u1' } as any));
        // users doc exists and is enterprise
        const userDoc = { exists: true, data: () => ({ subscriptionTier: 'enterprise' }) } as any;
        const chartDoc = { exists: true, data: () => ({ id: 'c9', userId: 'u1', config: { type: 'bar' }, data: [] }) } as any;
        const analyticsColl = { add: sinon.stub().resolves({ id: 'an1' }) } as any;
        const chartsColl = {
            doc: (id: string) => ({ get: async () => chartDoc })
        } as any;
        sinon.stub(adminDb, 'collection').callsFake((name: string) => {
            if (name === 'users') return { doc: () => ({ get: async () => userDoc }) } as any;
            if (name === 'visualizations') return chartsColl;
            if (name === 'analytics') return analyticsColl;
            return {} as any;
        });
        (adminStorage as any).bucket = sinon.stub().returns(bucketStub);
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/integration-chart.pdf'])
        };
        bucketStub.file.returns(fakeFile);
    });

    afterEach(() => sinon.restore());

    it('returns signed URL for server-rendered PDF when artifact not supplied', async () => {
        const req = toNextRequest({ action: 'export_chart', data: { chartId: 'c9', format: 'pdf', config: { title: 'Integration' } } }, 'tok');
        const res: any = await POST(req);
        const json = await res.json();
        expect(json.success).to.equal(true);
        expect(json.exportUrl).to.equal('https://signed.example.com/integration-chart.pdf');
    });

    it('returns signed URL for server-rendered SVG when artifact not supplied', async () => {
        // For SVG, our server path persists JSON/SVG buffers similarly through Storage
        // Stub a new file URL
        const bucket: any = (adminStorage as any).bucket();
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/integration-chart.svg'])
        };
        bucket.file.returns(fakeFile);

        const req = toNextRequest({ action: 'export_chart', data: { chartId: 'c9', format: 'svg', config: {} } }, 'tok');
        const res: any = await POST(req);
        const json = await res.json();
        expect(json.success).to.equal(true);
        expect(json.exportUrl).to.equal('https://signed.example.com/integration-chart.svg');
    });

    it('returns signed URL when client artifact (SVG data URL) is provided', async () => {
        const bucket: any = (adminStorage as any).bucket();
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/integration-artifact.svg'])
        };
        bucket.file.returns(fakeFile);

        const inlineSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="30"><rect width="50" height="30" fill="green"/></svg>';
        const artifact = `data:image/svg+xml;base64,${Buffer.from(inlineSvg, 'utf-8').toString('base64')}`;

        const req = toNextRequest({ action: 'export_chart', data: { chartId: 'c9', format: 'svg', config: {}, artifact } }, 'tok');
        const res: any = await POST(req);
        const json = await res.json();
        expect(json.success).to.equal(true);
        expect(json.exportUrl).to.equal('https://signed.example.com/integration-artifact.svg');
        // Ensure save called with decoded buffer
        sinon.assert.called(fakeFile.save);
    });
});
