import { expect } from 'chai';
import sinon from 'sinon';
import { __test_only__ as vizApiTest } from '@/app/api/visualizations/route';
import { adminStorage } from '@/lib/firebase-admin';
import { generateServerArtifact } from '@/lib/visualizations/chart-export-manager';
import { d3VisualizationEngine } from '@/lib/visualizations/d3-visualization-engine';

// Minimal typings for NextResponse wrappers aren't needed; we call the internal helpers

describe('Visualizations API exports', () => {
    const bucketStub: any = {
        file: sinon.stub()
    };
    const storageStub: any = {
        bucket: sinon.stub().returns(bucketStub)
    };

    beforeEach(() => {
        // Stub adminStorage.bucket().file().save and getSignedUrl
        (adminStorage as any).bucket = storageStub.bucket;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('persists client-provided artifact and returns signed URL (chart)', async () => {
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/chart.pdf'])
        };
        bucketStub.file.returns(fakeFile);

        const url = await vizApiTest.persistExportArtifact({
            userId: 'u1', kind: 'chart', id: 'c1', format: 'pdf', artifact: 'data:application/pdf;base64,UEsDBAoAAAAA', metadata: { chartType: 'bar' }
        } as any);

        expect(url).to.equal('https://signed.example.com/chart.pdf');
        expect(bucketStub.file.called).to.be.true;
        expect(fakeFile.save.called).to.be.true;
    });

    it('generates server-side export when no artifact is provided (chart PDF)', async () => {
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/chart-generated.pdf'])
        };
        bucketStub.file.returns(fakeFile);

        const chartDoc: any = {
            id: 'c2',
            userId: 'u1',
            config: { type: 'line' },
            data: [{ x: '2024-01-01', y: 10 }],
            previewImage: undefined
        };

        const url = await vizApiTest.generateChartExport(chartDoc, 'pdf', { title: 'Test Chart' });
        expect(url).to.equal('https://signed.example.com/chart-generated.pdf');
        expect(fakeFile.save.called).to.be.true;
    });

    it('generates server-side export for dashboard (JSON)', async () => {
        const fakeFile = {
            save: sinon.stub().resolves(),
            getSignedUrl: sinon.stub().resolves(['https://signed.example.com/dashboard.json'])
        };
        bucketStub.file.returns(fakeFile);

        const dashboardDoc: any = {
            id: 'd1',
            userId: 'u1',
            widgets: [{ id: 'w1', type: 'bar' }, { id: 'w2', type: 'line' }]
        };

        const url = await vizApiTest.generateDashboardExport(dashboardDoc, 'json', {});
        expect(url).to.equal('https://signed.example.com/dashboard.json');
        expect(fakeFile.save.called).to.be.true;
    });

    it('generateServerArtifact returns SVG buffer when svg markup provided', async () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>';
        const out = await generateServerArtifact('svg', { svg }, {});
        expect(out.ext).to.equal('svg');
        expect(out.contentType).to.equal('image/svg+xml');
        expect(out.buffer.length).to.be.greaterThan(10);
    });

    it('generateServerArtifact returns PNG buffer from SVG when no PNG data URL provided', async () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><circle cx="40" cy="40" r="35" fill="blue"/></svg>';
        const out = await generateServerArtifact('png', { svg }, { width: 120, height: 80 });
        expect(out.ext).to.equal('png');
        expect(out.contentType).to.equal('image/png');
        expect(out.buffer.length).to.be.greaterThan(10);
    });

    it('client export SVG includes inlined styles when includeStyles=true', async () => {
        // Create a minimal container and chart
        const container = document.createElement('div');
        container.id = 'c-svg-inline';
        document.body.appendChild(container);

        const config: any = {
            id: 'chart-inline',
            type: 'bar',
            width: 200,
            height: 120,
            margin: { top: 10, right: 10, bottom: 20, left: 20 },
            data: [{ x: 'A', y: 5 }, { x: 'B', y: 7 }],
            options: { grid: false, animations: false, interactive: false, legend: false },
            styling: { backgroundColor: undefined }
        };

        d3VisualizationEngine.createBarChart(container.id, config);
        const dataUrl = await d3VisualizationEngine.exportChart('chart-inline', { format: 'svg', includeStyles: true } as any);
        expect(dataUrl.startsWith('data:image/svg+xml;base64,')).to.be.true;
        // Decode and assert style attributes present on elements
        const b64 = dataUrl.replace(/^data:[^,]+,/, '');
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        expect(decoded).to.include('<svg');
        // At least some style="fill:..." should be present on rect bars
        expect(/style="[^"]*fill:/i.test(decoded)).to.be.true;
    });

    it('client export SVG embeds @font-face when provided', async () => {
        const container = document.createElement('div');
        container.id = 'c-svg-font';
        document.body.appendChild(container);

        const config: any = {
            id: 'chart-font',
            type: 'bar',
            width: 200,
            height: 120,
            margin: { top: 10, right: 10, bottom: 20, left: 20 },
            data: [{ x: 'A', y: 5 }],
            options: { grid: false, animations: false, interactive: false, legend: false },
            styling: { backgroundColor: undefined }
        };

        d3VisualizationEngine.createBarChart(container.id, config);
        const dataUrl = await d3VisualizationEngine.exportChart('chart-font', {
            format: 'svg',
            includeStyles: true,
            embedFonts: [{ family: 'TestSans', src: 'data:font/woff2;base64,d09GRgABAAAAA' as any, format: 'woff2', display: 'swap' }]
        } as any);
        const b64 = dataUrl.replace(/^data:[^,]+,/, '');
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        expect(decoded).to.include('<style');
        expect(decoded).to.include('@font-face');
        expect(decoded).to.include("font-family: 'TestSans'");
    });
});
