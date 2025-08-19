import { adminStorage } from '@/lib/firebase-admin';
import { generateServerArtifact } from '@/lib/visualizations/server-artifacts';
import type { ExportFormat, ServerChartArtifactData, ServerDashboardArtifactData } from '@/types/visualization-exports';

// Persist client-provided export artifact (data URL or base64) to Firebase Storage and return a signed URL
export async function persistExportArtifact(input: {
  userId: string;
  kind: 'chart' | 'dashboard';
  id: string;
  format: ExportFormat | string; // backward compatibility
  artifact: string; // data URL (data:mime;base64,...) or raw base64
  metadata?: Record<string, unknown>;
}): Promise<string> {
  let mime = 'application/octet-stream';
  let base64 = input.artifact;
  const match = /^data:([^;]+);base64,(.*)$/i.exec(input.artifact);
  if (match) {
    mime = match[1];
    base64 = match[2];
  }
  const buffer = Buffer.from(base64, 'base64');
  const ext = (() => {
    if (input.format) return input.format.replace(/^\./, '').toLowerCase();
    if (/pdf$/i.test(mime)) return 'pdf';
    if (/png$/i.test(mime)) return 'png';
    if (/svg\+xml$/i.test(mime) || /svg$/i.test(mime)) return 'svg';
    if (/json$/i.test(mime)) return 'json';
    return 'bin';
  })();
  const filePath = `exports/${input.userId}/${input.kind}s/${input.id}/${Date.now()}.${ext}`;
  const bucket = adminStorage.bucket();
  const file = bucket.file(filePath);
  await file.save(buffer, {
    contentType: mime,
    resumable: false,
    metadata: {
      metadata: {
        userId: input.userId,
        kind: input.kind,
        refId: input.id,
        ...Object.fromEntries(Object.entries(input.metadata || {}).map(([k, v]) => [String(k), String(v)]))
      }
    }
  });
  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
  return signedUrl;
}

// Persist a raw Buffer to Firebase Storage and return a signed URL (server-side export path)
export async function persistBufferToStorage(input: {
  userId: string;
  kind: 'chart' | 'dashboard';
  id: string;
  ext: string;
  contentType: string;
  buffer: Buffer;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const filePath = `exports/${input.userId}/${input.kind}s/${input.id}/${Date.now()}.${input.ext.replace(/^\./, '')}`;
  const bucket = adminStorage.bucket();
  const file = bucket.file(filePath);
  await file.save(input.buffer, {
    contentType: input.contentType,
    resumable: false,
    metadata: {
      metadata: {
        userId: input.userId,
        kind: input.kind,
        refId: input.id,
        ...Object.fromEntries(Object.entries(input.metadata || {}).map(([k, v]) => [String(k), String(v)]))
      }
    }
  });
  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
  return signedUrl;
}

type ChartExportConfigInput = Partial<{ title?: string; width?: number; height?: number }> | undefined;
function coerceChartConfig(cfg: ChartExportConfigInput): { title?: string; width?: number; height?: number } {
  if (!cfg) return {};
  const out: { title?: string; width?: number; height?: number } = {};
  if (typeof cfg.title === 'string') out.title = cfg.title;
  if (typeof cfg.width === 'number') out.width = cfg.width;
  if (typeof cfg.height === 'number') out.height = cfg.height;
  return out;
}

export async function generateChartExport(chartData: ServerChartArtifactData, format: ExportFormat, config: ChartExportConfigInput): Promise<string> {
  const supported: ExportFormat[] = ['pdf', 'excel', 'json', 'png', 'svg'];
  if (!supported.includes(format)) throw new Error(`Unsupported export format: ${format}`);
  // If SVG requested but not available, synthesize minimal SVG as a fallback
  let svgMarkup: string | undefined = chartData.svg;
  const coerced = coerceChartConfig(config);
  if ((format === 'svg' || format === 'png') && !svgMarkup) {
    const w = typeof coerced.width === 'number' ? coerced.width : 800;
    const h = typeof coerced.height === 'number' ? coerced.height : 600;
    const title = (coerced.title || chartData.metadata?.title || 'Chart').toString();
    svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n  <rect width="100%" height="100%" fill="white"/>\n  <text x="50%" y="50" text-anchor="middle" font-family="Helvetica, Arial" font-size="18">${title}</text>\n</svg>`;
  }
  const { buffer, contentType, ext } = await generateServerArtifact(format, {
    image: chartData.previewImage || chartData.image,
    // If chartData.data is an array treat it as data[] else pass as-is (fits union via cast)
    data: Array.isArray(chartData.data) ? chartData.data : undefined,
    svg: svgMarkup
  }, coerced);
  return persistBufferToStorage({
    userId: chartData.userId,
    kind: 'chart',
    id: chartData.id,
    ext: ext || format.replace(/^\./, ''),
    contentType,
    buffer,
    metadata: { chartType: chartData.config?.type }
  });
}

type DashboardExportConfigInput = Partial<{ title?: string }> | undefined;
function coerceDashboardConfig(cfg: DashboardExportConfigInput): { title?: string } {
  if (!cfg) return {};
  return typeof cfg.title === 'string' ? { title: cfg.title } : {};
}

export async function generateDashboardExport(dashboardData: ServerDashboardArtifactData, format: ExportFormat, config: DashboardExportConfigInput): Promise<string> {
  const supported: ExportFormat[] = ['pdf', 'excel', 'json', 'png', 'svg'];
  if (!supported.includes(format)) throw new Error(`Unsupported export format: ${format}`);
  // Minimal server export: JSON of dashboard structure or server-rendered artifact
  const material = {
    svg: undefined as string | undefined,
    image: undefined as string | undefined,
    data: dashboardData.widgets?.map(w => ({ id: w.id, type: w.type }))
  };
  const { buffer, contentType, ext } = await generateServerArtifact(format, material, coerceDashboardConfig(config));
  return persistBufferToStorage({
    userId: dashboardData.userId,
    kind: 'dashboard',
    id: dashboardData.id,
    ext: ext || format.replace(/^\./, ''),
    contentType,
    buffer,
    metadata: { widgetCount: dashboardData.widgets?.length || 0 }
  });
}
