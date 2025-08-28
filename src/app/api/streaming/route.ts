// Real-time Streaming API
import { handleCors } from '@/lib/http/cors';
import { sse } from '@/lib/http/sse';
import { enforceProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;
export async function GET(request: NextRequest) {
  // CORS
  const cors = handleCors(request, { allowMethods: ['GET', 'OPTIONS'] });
  if ('preflight' in cors) return cors.preflight;
  // Optional metrics JSON endpoint for health/runtime audits
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    if (action === 'metrics') {
      // Minimal synthetic metrics; expand if real metrics available
      const metrics = { totalConnections: 0, streamsOpen: 0, uptimeMs: Math.floor(process.uptime() * 1000) };
      return NextResponse.json(enforceProvenance({ success: true, metrics, provenance: 'synthetic' }, { path: 'streaming', note: 'metrics' }), { headers: cors.headers });
    }
  } catch { /* fallthrough to SSE */ }
  return sse(request, async (client) => {
    client.send({ type: 'connection_established' });
  }, { headers: cors.headers, heartbeatMs: 30000 });
}
export async function OPTIONS(request: NextRequest) {
  const cors = handleCors(request, { allowMethods: ['GET', 'OPTIONS'] });
  return 'preflight' in cors ? cors.preflight : new Response(null, { status: 204, headers: cors.headers });
}
