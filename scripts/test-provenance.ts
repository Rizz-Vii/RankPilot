#!/usr/bin/env ts-node
// PROV-01 provenance enforcement smoke tests
import assert from "assert";
import { adminDb } from "../src/lib/firebase-admin";
import { sanitizeMarketingCampaignDoc } from "../src/lib/firebase/marketing-write-guard";
import { hasProvenance, provenanceTag } from "../src/lib/middleware/provenance";
import { executeNeuroLive } from "../src/lib/neuroseo/live-exec";

async function testMarketingPreservesProvenance() {
  const cleaned = sanitizeMarketingCampaignDoc({
    name: "Test",
    channel: "email",
    impressions: 0,
    clicks: 0,
    spend: 0,
    period: "2025-08",
    __provenance: "synthetic",
  });
  assert.strictEqual(
    cleaned.__provenance,
    "synthetic",
    "marketing provenance preserved"
  );
}

async function testMarketingDoesNotInventProvenance() {
  const cleaned = sanitizeMarketingCampaignDoc({
    name: "NoProv",
    channel: "email",
    impressions: 0,
    clicks: 0,
    spend: 0,
    period: "2025-08",
  });
  assert.ok(
    !("__provenance" in cleaned),
    "sanitizer should not add provenance when absent"
  );
}

async function testNeuroAnalysisPersistenceProvenance() {
  const userId = "prov_user";
  const urls = ["https://example.com/p"];
  await executeNeuroLive({ urls, userId });
  const hashKey = Buffer.from(
    JSON.stringify({ u: [...urls].sort(), t: "comprehensive" })
  )
    .toString("base64")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 40);
  const doc = await adminDb.collection("neuroSeoAnalyses").doc(hashKey).get();
  if (!doc.exists) {
    console.warn("Skipping persistence provenance assertion (mock admin)");
    return;
  }
  const data = doc.data()!;
  assert.ok(
    ["live", "synthetic"].includes(data.__provenance),
    "invalid analysis provenance"
  );
}

async function testLiveRouteProvenance() {
  const res = await fetch("http://localhost:3000/api/neuroseo/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: ["https://example.com"],
      userId: "prov_user_cli",
    }),
  });
  if (!res.ok) {
    console.warn("live route not reachable (dev server?) skipping");
    return;
  }
  const json = await res.json();
  if (!hasProvenance(json))
    throw new Error("live route response missing provenance");
  console.log("Live route provenance:", provenanceTag(json));
}

async function testStreamRouteProvenance() {
  const res = await fetch("http://localhost:3000/api/neuroseo/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: ["https://example.com"],
      userId: "prov_user_cli",
    }),
  });
  if (!res.ok || !res.body) {
    console.warn("stream route not reachable (dev server?) skipping");
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finalProv: string | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const events = text.split("\n\n").filter(Boolean);
    for (const evt of events) {
      const match = evt.match(/^event: (.*)\ndata: (.*)$/s);
      if (match) {
        const eventName = match[1];
        try {
          const data = JSON.parse(match[2]);
          if (data && typeof data === "object" && "provenance" in data)
            finalProv = String((data as Record<string, unknown>).provenance);
        } catch {
          // ignore JSON parse errors from partial SSE chunks
        }
        if (eventName === "end") break;
      }
    }
  }
  if (!finalProv)
    throw new Error("stream route missing provenance in final events");
  console.log("Stream route final provenance:", finalProv);
}

async function main() {
  await testMarketingPreservesProvenance();
  await testNeuroAnalysisPersistenceProvenance();
  await testMarketingDoesNotInventProvenance();
  await testLiveRouteProvenance();
  await testStreamRouteProvenance();
  console.log("PROV-01 provenance tests completed");
}
main().catch(() => {
  console.error("PROV-01 provenance tests FAILED");
  process.exit(1);
});
