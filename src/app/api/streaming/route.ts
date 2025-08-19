// Real-time Streaming API
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { enforceProvenance } from '@/lib/middleware/provenance';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  // Optional metrics JSON endpoint for health/runtime audits
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    if (action === 'metrics') {
      // Minimal synthetic metrics; expand if real metrics available
      const metrics = { totalConnections: 0, streamsOpen: 0, uptimeMs: Math.floor(process.uptime() * 1000) };
      return NextResponse.json(enforceProvenance({ success: true, metrics, provenance: 'synthetic' }, { path: 'streaming', note: 'metrics' }));
    }
  } catch { /* fallthrough to SSE */ }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => { if (closed) return; try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; try { controller.close(); } catch {} } };
      const safeClose = () => { if (closed) return; closed = true; try { controller.close(); } catch { /* already closed */ } };
      // initial event
      safeEnqueue('data: {"type":"connection_established"}\n\n');
      // heartbeat to keep-alive
      const hb = setInterval(() => {
        safeEnqueue('data: {"type":"heartbeat"}\n\n');
      }, 30000);
      // abort handling
      request.signal.addEventListener('abort', () => { clearInterval(hb); safeClose(); });
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}