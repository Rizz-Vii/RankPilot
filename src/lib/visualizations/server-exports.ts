import { adminStorage } from '@/lib/firebase-admin';
import { generateServerArtifact } from '@/lib/visualizations/server-artifacts';

// Persist client-provided export artifact (data URL or base64) to Firebase Storage and return a signed URL
export async function persistExportArtifact(input: {
  userId: string;
  kind: 'chart' | 'dashboard';
  id: string;
  format: string;
  artifact: string; // data URL (data:mime;base64,...) or raw base64
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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

export async function generateChartExport(chartData: any, format: string, config: any): Promise<string> {
  // If SVG requested but not available, synthesize minimal SVG as a fallback
  let svgMarkup: string | undefined = chartData?.svg;
  if ((format === 'svg' || format === 'png') && !svgMarkup) {
    const w = Number(config?.width) || 800;
    const h = Number(config?.height) || 600;
    const title = (config?.title || chartData?.metadata?.title || 'Chart').toString();
    svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n  <rect width="100%" height="100%" fill="white"/>\n  <text x="50%" y="50" text-anchor="middle" font-family="Helvetica, Arial" font-size="18">${title}</text>\n</svg>`;
  }
  const { buffer, contentType, ext } = await generateServerArtifact(format as any, {
    image: chartData?.previewImage || chartData?.image,
    data: chartData?.data,
    svg: svgMarkup
  }, config || {});
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

export async function generateDashboardExport(dashboardData: any, format: string, config: any): Promise<string> {
  // Minimal server export: JSON of dashboard structure or server-rendered artifact
  const material: any = {
    svg: undefined,
    image: undefined,
    data: dashboardData.widgets?.map((w: any) => ({ id: w.id || 'widget', type: w.type || 'unknown' }))
  };
  const { buffer, contentType, ext } = await generateServerArtifact(format as any, material, config || {});
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
