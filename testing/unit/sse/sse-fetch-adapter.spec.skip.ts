import { fetchSSE } from "@/lib/sse/adapter";
import { strict as assert } from "assert";

// Skipped by filename. Kept for local debugging if needed.
describe("fetchSSE adapter (skipped by default)", () => {
  const realFetch: typeof globalThis.fetch | undefined = (
    global as unknown as { fetch?: typeof globalThis.fetch }
  ).fetch;

  beforeEach(() => {
    (global as any).fetch = (_url: string, init?: any) =>
      new Promise((_resolve, reject) => {
        const sig: AbortSignal | undefined = init?.signal;
        if (sig) {
          if (sig.aborted) {
            reject(
              Object.assign(new Error("AbortError"), { name: "AbortError" })
            );
            return;
          }
          sig.addEventListener(
            "abort",
            () => {
              reject(
                Object.assign(new Error("AbortError"), { name: "AbortError" })
              );
            },
            { once: true }
          );
        }
        // Never resolve otherwise
      });
  });

  afterEach(() => {
    (global as any).fetch = realFetch as any;
  });

  it("aborts on timeout", async () => {
    const p = fetchSSE("http://example.com/never", { timeoutMs: 50 });
    await assert.rejects(p);
  });

  it("merges external signal", async () => {
    const ctl = new AbortController();
    const p = fetchSSE("http://example.com/never", {
      signal: ctl.signal,
      timeoutMs: 10_000,
    });
    setTimeout(() => ctl.abort(), 10);
    await assert.rejects(p);
  });
});
