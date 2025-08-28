import { noStoreHeaders } from '@/lib/http/cache';
import { handleCors } from '@/lib/http/cors';
import { getLogger } from '@/lib/logging/app-logger';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logger = getLogger('internal-metrics');
// Ephemeral in-memory ring buffer for recent client telemetry (best-effort, per-instance)
const RECENT_LIMIT = 50;
const recentClientTelemetry: Array<{ at: number; data: unknown }> = [];
function pushRecent(data: unknown) {
  recentClientTelemetry.push({ at: Date.now(), data });
  if (recentClientTelemetry.length > RECENT_LIMIT) recentClientTelemetry.shift();
}

export async function GET(req: NextRequest): Promise<Response> {
  const cors = handleCors(req, { allowMethods: ['GET', 'POST', 'OPTIONS'] });
  if ('preflight' in cors) return cors.preflight as Response;
  try {
    const neuro = getNeuroseoMetricsSnapshot();
    const unified = getUnifiedMetricsSnapshot();
    return NextResponse.json(
      { neuro, unified, client: recentClientTelemetry },
      { headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('metrics.error', { message });
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500, headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  }
}

// Accept lightweight client telemetry (e.g., ErrorBoundary beacons)
export async function POST(req: NextRequest): Promise<Response> {
  const cors = handleCors(req, { allowMethods: ['GET', 'POST', 'OPTIONS'] });
  if ('preflight' in cors) return cors.preflight as Response;
  try {
    // Navigator.sendBeacon defaults to text/plain; fall back to text parsing if JSON fails
    let data: unknown;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await req.json().catch(() => undefined);
    } else {
      const raw = await req.text();
      try { data = raw ? JSON.parse(raw) : undefined; } catch { data = { raw }; }
    }

    // Log with structured channel; avoid throwing on unexpected shapes
    logger.warn('client.telemetry', { data });
    pushRecent(data);
    return new NextResponse(null, { status: 204, headers: { ...noStoreHeaders(), ...cors.headers } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('metrics.post.error', { message });
    return NextResponse.json(
      { ok: false },
      { status: 200, headers: { ...noStoreHeaders(), ...cors.headers } }
    );
  }
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  const cors = handleCors(req, { allowMethods: ['GET', 'POST', 'OPTIONS'] });
  return 'preflight' in cors ? (cors.preflight as Response) : new Response(null, { status: 204, headers: cors.headers });
}
