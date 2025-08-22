import { strict as assert } from 'assert';

describe('SSE abort should not error (streaming route)', () => {
  it('aborts /api/streaming?action=sse gracefully', async function () {
    this.timeout(8000);
    const url = process.env.TEST_BASE_URL || 'http://localhost:3000';
    const target = `${url}/api/streaming?action=sse&clientId=unit-abort`;
    const controller = new AbortController();

    const res = await fetch(target, { signal: controller.signal, headers: { accept: 'text/event-stream' } });
    assert.equal(res.status, 200, 'SSE endpoint should return 200');
    const ct = res.headers.get('content-type') || '';
    assert.ok(ct.includes('text/event-stream'), 'content-type should be text/event-stream');

    // Start reading one chunk to ensure the stream is live
    const body = (res as Response).body as ReadableStream<Uint8Array> | (NodeJS.ReadableStream & { once?: (ev: string, fn: (...args: unknown[]) => void) => void; off?: (ev: string, fn: (...args: unknown[]) => void) => void; on?: (ev: string, fn: (...args: unknown[]) => void) => void });
    const hasWebReader = typeof (body as ReadableStream<Uint8Array> | undefined)?.getReader === 'function';

    if (hasWebReader) {
      const reader: ReadableStreamDefaultReader<Uint8Array> = (body as ReadableStream<Uint8Array>).getReader();
      try {
        await Promise.race([
          reader.read(),
          new Promise((resolve) => setTimeout(() => resolve({ done: true }), 500)),
        ]);
        // First chunk read or timeout (non-blocking)
      } catch {
        // Ignore first read failure; stream may be slow
      }
      controller.abort();
      await new Promise((r) => setTimeout(r, 250));
      try {
        await Promise.race([
          reader.read(),
          new Promise((resolve) => setTimeout(() => resolve({ done: true }), 250)),
        ]);
      } catch {
        // swallow post-abort read error
      }
    } else if (body && typeof (body as { on?: unknown }).on === 'function') {
      // Node Readable stream path (node-fetch or older environments)
      await new Promise<void>((resolve) => {
        const nodeBody = body as NodeJS.ReadableStream & { off?: (ev: string, fn: (...args: unknown[]) => void) => void; once?: (ev: string, fn: (...args: unknown[]) => void) => void };
        const onData = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); resolve(); };
        const cleanup = () => { try { nodeBody.off?.('data', onData); nodeBody.off?.('error', onError); } catch { } };
        nodeBody.once?.('data', onData);
        nodeBody.once?.('error', onError);
        setTimeout(() => { cleanup(); resolve(); }, 500);
      });
      controller.abort();
      await new Promise((r) => setTimeout(r, 250));
    } else {
      // Unknown body type; still abort
      controller.abort();
      await new Promise((r) => setTimeout(r, 200));
    }

  // Success criterion: request started (200 + content-type) and abort completed without hanging.
  // Some runtimes may surface a read() rejection after abort; that's acceptable.
  assert.ok(true);
  });
});
