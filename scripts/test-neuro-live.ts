#!/usr/bin/env ts-node
/* NEU-01 minimal smoke test for live execution scaffold */
import assert from "assert";
import { executeNeuroLive } from "../src/lib/neuroseo/live-exec";

async function main() {
  const res = await executeNeuroLive({
    urls: ["https://example.com"],
    userId: "tester",
  });
  assert(res.report, "report missing");
  assert(
    ["cache", "live", "synthetic"].includes(res.provenance),
    "invalid provenance"
  );
  console.log("NEU-01 live exec smoke OK", {
    provenance: res.provenance,
    latency: res.latencyMs,
  });
}
main().catch((e) => {
  console.error("NEU-01 live exec smoke FAIL", e);
  process.exit(1);
});
