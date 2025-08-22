import { POST } from '@/app/api/visualizations/route';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { expect } from 'chai';
import type { DecodedIdToken } from 'firebase-admin/auth';
import sinon from 'sinon';

// Build a NextRequest-like mock
interface ExportChartBody { action: 'export_chart'; data: { chartId: string; format: string; config: Record<string, unknown>; artifact?: string } }
type PostArg = Parameters<typeof POST>[0];
interface SimpleRequestLike { headers: { get(k: string): string | undefined }; json(): Promise<ExportChartBody>; }

class MockRequest implements SimpleRequestLike {
    headers: Map<string, string>;
    private body: ExportChartBody;
    constructor(body: ExportChartBody, token: string) {
        this.headers = new Map([["authorization", `Bearer ${token}`]]);
        this.body = body;
    }
    get headersObj() { return { get: (k: string) => this.headers.get(k.toLowerCase()) }; }
    async json() { return this.body; }
}

function toNextRequest(body: ExportChartBody, token: string): PostArg {
    const r = new MockRequest(body, token);
    return { headers: r.headersObj as unknown as PostArg['headers'], json: () => r.json() } as PostArg;
}

describe('Integration: POST export_chart', () => {
    const bucketStub: { file: sinon.SinonStub } = { file: sinon.stub() };
    beforeEach(() => {
        sinon.stub(adminAuth, 'verifyIdToken').callsFake(async (_t: unknown) => ({
            uid: 'u1',
            aud: 'test',
            auth_time: Date.now() / 1000,
            exp: (Date.now() + 3600_000) / 1000,
            iat: Date.now() / 1000,
            iss: 'https://securetoken.google.com/test',
            sub: 'u1',
            firebase: { identities: {}, sign_in_provider: 'custom' }
        } as DecodedIdToken));
        // users doc exists and is enterprise
        const userDoc = { exists: true, data: () => ({ subscriptionTier: 'enterprise' }) };
        const chartDoc = { exists: true, data: () => ({ id: 'c9', userId: 'u1', config: { type: 'bar' }, data: [] }) };
        const analyticsColl = { add: sinon.stub().resolves({ id: 'an1' }) };
        const chartsColl = { doc: (_id: string) => ({ get: async () => chartDoc }) };
        sinon.stub(adminDb, 'collection').callsFake(((name: string) => {
            if (name === 'users') return { doc: () => ({ get: async () => userDoc }) } as unknown as ReturnType<typeof adminDb.collection>;
            if (name === 'visualizations') return chartsColl as unknown as ReturnType<typeof adminDb.collection>;
            if (name === 'analytics') return analyticsColl as unknown as ReturnType<typeof adminDb.collection>;
            return {} as unknown as ReturnType<typeof adminDb.collection>;
        }) as unknown as typeof adminDb.collection);
        (adminStorage as unknown as { bucket: () => { file: sinon.SinonStub } }).bucket = sinon.stub().returns(bucketStub);
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/integration-chart.pdf'])
        };
        bucketStub.file.returns(fakeFile);
    });

    afterEach(() => sinon.restore());

    it('returns signed URL for server-rendered PDF when artifact not supplied', async () => {
        const req = toNextRequest({ action: 'export_chart', data: { chartId: 'c9', format: 'pdf', config: { title: 'Integration' } } }, 'tok');
        const res = await POST(req);
        const json = await res.json();
        expect(json.success).to.equal(true);
        expect(json.exportUrl).to.equal('https://signed.example.com/integration-chart.pdf');
    });

    it('returns signed URL for server-rendered SVG when artifact not supplied', async () => {
        // For SVG, our server path persists JSON/SVG buffers similarly through Storage
        // Stub a new file URL
        const bucket = (adminStorage as unknown as { bucket: () => { file: sinon.SinonStub } }).bucket();
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/integration-chart.svg'])
        };
        bucket.file.returns(fakeFile);

        const req = toNextRequest({ action: 'export_chart', data: { chartId: 'c9', format: 'svg', config: {} } }, 'tok');
        const res = await POST(req);
        const json = await res.json();
        expect(json.success).to.equal(true);
        expect(json.exportUrl).to.equal('https://signed.example.com/integration-chart.svg');
    });

    it('returns signed URL when client artifact (SVG data URL) is provided', async () => {
        const bucket = (adminStorage as unknown as { bucket: () => { file: sinon.SinonStub } }).bucket();
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/integration-artifact.svg'])
        };
        bucket.file.returns(fakeFile);

        const inlineSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="30"><rect width="50" height="30" fill="green"/></svg>';
        const artifact = `data:image/svg+xml;base64,${Buffer.from(inlineSvg, 'utf-8').toString('base64')}`;

        const req = toNextRequest({ action: 'export_chart', data: { chartId: 'c9', format: 'svg', config: {}, artifact } }, 'tok');
        const res = await POST(req);
        const json = await res.json();
        expect(json.success).to.equal(true);
        expect(json.exportUrl).to.equal('https://signed.example.com/integration-artifact.svg');
        // Ensure save called with decoded buffer
        sinon.assert.called(fakeFile.save);
    });
});
