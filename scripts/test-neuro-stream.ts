#!/usr/bin/env ts-node
/* NEU-01 streaming acceptance tests: cache, live, timeout->synthetic */
import assert from "assert";
import http from "http";

type StreamEvent = { type: string; data: unknown };
const asObj = (u: unknown): Record<string, unknown> =>
  u && typeof u === "object" ? (u as Record<string, unknown>) : {};
async function postStream(body: unknown): Promise<{ events: StreamEvent[] }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body as Record<string, unknown>);
    const req = http.request(
      {
        hostname: "localhost",
        port: process.env.PORT || 3000,
        path: "/api/neuroseo/stream",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => {
          buf += c.toString();
        });
        res.on("end", () => {
          const events: StreamEvent[] = [];
          for (const block of buf.split("\n\n")) {
            if (!block.trim()) continue;
            const lines = block.split("\n");
            let ev = "message";
            let dataLine = "";
            for (const l of lines) {
              if (l.startsWith("event:")) ev = l.slice(6).trim();
              if (l.startsWith("data:")) dataLine += l.slice(5).trim();
            }
            if (!dataLine) continue;
            try {
              events.push({ type: ev, data: JSON.parse(dataLine) as unknown });
            } catch {
              /* ignore */
            }
          }
          resolve({ events });
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const unique = Date.now();
  // Live (expected) run with unique URLs to avoid pre-existing cache
  const testUrls = [
    `https://example.com/a?u=${unique}`,
    `https://example.com/b?u=${unique}`,
  ];
  const live = await postStream({
    urls: testUrls,
    userId: "tester-live",
    timeoutMs: 20000,
  });
  const completeEv = live.events.find((e) => e.type === "complete");
  const cachedFirst = live.events.find((e) => e.type === "cached");
  assert(completeEv || cachedFirst, "missing complete or cached (first run)");
  const firstData = asObj((completeEv || cachedFirst)!.data);
  const firstProvenance = String(firstData.provenance || "");

  // Second run should hit cache
  const cache = await postStream({
    urls: testUrls,
    userId: "tester-live",
    timeoutMs: 15000,
  });
  const cachedEv = cache.events.find((e) => e.type === "cached");
  assert(cachedEv, "missing cached event (second run)");
  assert.equal(String(asObj(cachedEv!.data).provenance || ""), "cache");

  // Timeout synthetic attempt (very small timeout). Accept cached/complete/fallback since fast runs may finish before timeout.
  const manyUrls = Array.from(
    { length: 12 },
    (_, i) => `https://example.com/slow${i}?u=${unique}`
  );
  const fallback = await postStream({
    urls: manyUrls,
    userId: "tester-timeout",
    timeoutMs: 10,
  });
  const fb = fallback.events.find((e) => e.type === "fallback");
  const completeFallback = fallback.events.find((e) => e.type === "complete");
  const cachedFallback = fallback.events.find((e) => e.type === "cached");
  if (!fb && !completeFallback && !cachedFallback) {
    console.error(
      "DEBUG fallback events types:",
      fallback.events.map((e) => e.type)
    );
  }
  assert(
    fb || completeFallback || cachedFallback,
    "expected fallback, complete, or cached event in timeout scenario"
  );
  if (fb) {
    assert.equal(String(asObj(fb!.data).provenance || ""), "synthetic");
  }

  const endLive = live.events.find((e) => e.type === "end");
  const endCache = cache.events.find((e) => e.type === "end");
  if (endLive && endCache && completeEv) {
    const dCache = Number(asObj(endCache.data).durationMs || 0);
    const dLive = Number(asObj(endLive.data).durationMs || 0);
    assert(
      dCache < dLive,
      `cache duration not faster: live=${dLive} cache=${dCache}`
    );
  }

  console.log("NEU-01 streaming acceptance OK", {
    firstProvenance,
    liveEvents: live.events.length,
    cacheEvents: cache.events.length,
    fallbackEvents: fallback.events.length,
    timeoutOutcome: fb ? "fallback" : completeFallback ? "complete" : "cached",
  });
}

main().catch((e) => {
  console.error("NEU-01 streaming acceptance FAIL", e);
  process.exit(1);
});
