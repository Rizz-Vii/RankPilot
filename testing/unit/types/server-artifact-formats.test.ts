import { strict as assert } from 'assert';
import { generateServerArtifact } from '@/lib/visualizations/server-artifacts';
import { generateChartExport } from '@/lib/visualizations/server-exports';
import type { ExportFormat } from '@/types/visualization-exports';

describe('Server Artifact Format Guards', () => {
    it('generateServerArtifact json format', async () => {
        const { buffer, contentType, ext } = await generateServerArtifact('json', { data: [{ x: 1 }] }, { title: 'Test' });
        assert.ok(buffer.length > 10);
        assert.equal(contentType, 'application/json');
        assert.equal(ext, 'json');
    });

    it('generateChartExport svg fallback synthesis', async () => {
        const url = await generateChartExport({ id: 'c1', userId: 'u1', data: [], config: { type: 'line' } }, 'svg', { title: 'T' });
        assert.ok(typeof url === 'string');
    });

    it('rejects unsupported format', async () => {
        let threw = false;
        try { await (generateServerArtifact as any)('wav' as ExportFormat, { data: [] }, {}); } catch { threw = true; }
        assert.equal(threw, true);
    });
});
