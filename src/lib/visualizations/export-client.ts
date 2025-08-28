import { auth } from '@/lib/firebase';
import type { ChartExportConfig } from '@/lib/visualizations/d3-visualization-engine';

export type ChartExportFormat = ChartExportConfig['format'];

export interface ExportResult {
    exportUrl: string;
}

async function getIdToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
}

async function blobToDataUrl(blob: Blob, fallbackMime?: string): Promise<string> {
    const mime = blob.type || fallbackMime || 'application/octet-stream';
    // Prefer FileReader in browser
    try {
        if (typeof FileReader !== 'undefined') {
            const fr = new FileReader();
            return await new Promise<string>((resolve, reject) => {
                fr.onerror = () => reject(fr.error);
                fr.onload = () => resolve(String(fr.result));
                fr.readAsDataURL(blob);
            });
        }
    } catch { }
    // Fallback: Node/Buffer path
    const buf = Buffer.from(await blob.arrayBuffer());
    return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function normalizeArtifactForUpload(artifact: string, format: ChartExportFormat): Promise<string> {
    // Already a data URL
    if (/^data:[^;]+;base64,/i.test(artifact)) return artifact;
    // If it's an object URL or http(s), fetch the blob and convert
    if (artifact.startsWith('blob:') || artifact.startsWith('http://') || artifact.startsWith('https://')) {
        const resp = await fetch(artifact);
        const blob = await resp.blob();
        const guessedMime = blob.type || (format === 'pdf' ? 'application/pdf' : format === 'png' ? 'image/png' : format === 'svg' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'application/octet-stream');
        return blobToDataUrl(blob, guessedMime);
    }
    // If it's raw base64 without data: prefix, wrap it
    if (/^[A-Za-z0-9+/=]+$/.test(artifact)) {
        const mime = (format === 'pdf' ? 'application/pdf' : format === 'png' ? 'image/png' : format === 'svg' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'application/octet-stream');
        return `data:${mime};base64,${artifact}`;
    }
    return artifact; // best-effort
}

export async function exportChartClient(
    chartId: string,
    exportConfig: ChartExportConfig,
    options?: { openInNewTab?: boolean }
): Promise<ExportResult> {
    // Generate client-side artifact (data URL)
    const { d3VisualizationEngine } = await import('@/lib/visualizations/d3-visualization-engine');
    let artifact = await d3VisualizationEngine.exportChart(chartId, exportConfig);
    artifact = await normalizeArtifactForUpload(artifact, exportConfig.format);

    // Auth
    const token = await getIdToken();

    // POST to API to persist and get signed URL
    const res = await fetch('/api/visualizations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            action: 'export_chart',
            data: {
                chartId,
                format: exportConfig.format,
                config: exportConfig,
                artifact,
            }
        })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.error || `Export failed (${res.status})`;
        throw new Error(msg);
    }

    const exportUrl = json?.exportUrl as string | undefined;
    if (!exportUrl) {
        throw new Error('No export URL returned');
    }

    if (options?.openInNewTab && typeof window !== 'undefined') {
        try { window.open(exportUrl, '_blank', 'noopener,noreferrer'); } catch { }
    }

    return { exportUrl };
}

export async function exportDashboardClient(
    dashboardId: string,
    format: Exclude<ChartExportFormat, 'excel'> | 'excel',
    config: Partial<ChartExportConfig> = {},
    options?: { artifact?: string; openInNewTab?: boolean }
): Promise<ExportResult> {
    const token = await getIdToken();

    const res = await fetch('/api/visualizations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            action: 'export_dashboard',
            data: {
                dashboardId,
                format,
                config: { ...config, format },
                artifact: options?.artifact,
            }
        })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.error || `Export failed (${res.status})`;
        throw new Error(msg);
    }

    const exportUrl = json?.exportUrl as string | undefined;
    if (!exportUrl) {
        throw new Error('No export URL returned');
    }

    if (options?.openInNewTab && typeof window !== 'undefined') {
        try { window.open(exportUrl, '_blank', 'noopener,noreferrer'); } catch { }
    }

    return { exportUrl };
}
