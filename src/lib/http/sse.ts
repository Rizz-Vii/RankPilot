import type { NextRequest } from 'next/server';

export interface SSEOptions {
    heartbeatMs?: number;
    headers?: Record<string, string>;
}

export interface SSEClient {
    send: (data: unknown) => void;
    sendRaw: (raw: string) => void;
    close: () => void;
    signal: AbortSignal;
}

/**
 * Simple SSE utility with heartbeat and safe-close guards.
 * Usage:
 *   return sse(req, async (client) => {
 *     client.send({ type: 'init' });
 *     // ... do work, emit chunks
 *     client.close();
 *   }, { headers: cors.headers, heartbeatMs: 15000 })
 */
export function sse(
    req: NextRequest,
    onClient: (client: SSEClient) => void | Promise<void>,
    options: SSEOptions = {}
): Response {
    const heartbeatMs = options.heartbeatMs ?? 15000;
    const encoder = new TextEncoder();

    let interval: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let closed = false;
            const safeEnqueue = (raw: string) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(raw));
                } catch {
                    closed = true;
                    try { controller.close(); } catch { /* ignore */ }
                }
            };
            const sendRaw = (raw: string) => safeEnqueue(raw.endsWith('\n\n') ? raw : raw + '\n\n');
            const send = (data: unknown) => sendRaw(`data: ${JSON.stringify(data)}\n\n`);
            const close = () => {
                if (closed) return;
                closed = true;
                try { controller.close(); } catch { /* ignore */ }
                if (interval !== undefined) clearInterval(interval as unknown as number);
            };
            // Heartbeat keep-alive
            interval = setInterval(() => {
                send({ type: 'heartbeat' });
            }, heartbeatMs);

            // Abort handling
            req.signal.addEventListener('abort', () => close());

            await onClient({ send, sendRaw, close, signal: req.signal });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            ...(options.headers || {}),
        }
    });
}
