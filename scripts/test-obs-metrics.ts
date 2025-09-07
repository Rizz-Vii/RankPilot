#!/usr/bin/env ts-node
/** OBS-01 dedicated counters test */
import assert from "assert";
import http from "http";

const get = (path: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    http
      .get(
        { hostname: "localhost", port: process.env.PORT || 3000, path },
        (res) => {
          let b = "";
          res.on("data", (c) => {
            b += c;
          });
          res.on("end", () => {
            try {
              resolve(JSON.parse(b));
            } catch (err) {
              reject(err);
            }
          });
        }
      )
      .on("error", reject);
  });
};
const postJson = (path: string, body: unknown): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port: process.env.PORT || 3000,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => {
          b += c;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(b));
          } catch {
            resolve({});
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

const postStreamAwait = (
  path: string,
  body: unknown,
  waitMs = 10000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port: process.env.PORT || 3000,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => {
          buf += c;
          if (buf.includes("\n\nevent: end")) {
            resolve();
          }
        });
        res.on("end", () => resolve());
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
    setTimeout(() => resolve(), waitMs + 50);
  });
};

async function main() {
  const before = await get("/api/neuroseo/metrics");
  const bObj =
    before && typeof before === "object"
      ? (before as Record<string, unknown>)
      : {};
  const base =
    bObj.neuro && typeof bObj.neuro === "object"
      ? (bObj.neuro as Record<string, number>)
      : {};
  // Trigger guard strip (empty urls)
  await postJson("/api/neuroseo/stream", { urls: [], userId: "obs-test" });
  // Trigger workflow run (valid)
  await postStreamAwait("/api/neuroseo/stream", {
    urls: ["https://obs.example/a"],
    userId: "obs-test",
  });
  // Inject stripe webhook error counter reliably (test-only endpoint)
  await get("/api/neuroseo/test-stripe-error");
  await new Promise((r) => setTimeout(r, 100));
  // Persist snapshot (optional)
  await postJson("/api/neuroseo/metrics-export", {});
  const after = await get("/api/neuroseo/metrics");
  const aObj =
    after && typeof after === "object"
      ? (after as Record<string, unknown>)
      : {};
  const neuro =
    aObj.neuro && typeof aObj.neuro === "object"
      ? (aObj.neuro as Record<string, number>)
      : {};
  const br = Number(base.workflowRuns || 0);
  const ar = Number(neuro.workflowRuns || 0);
  const bg = Number(base.guardStrips || 0);
  const ag = Number(neuro.guardStrips || 0);
  const bs = Number(base.stripeWebhookErrors || 0);
  const asE = Number(neuro.stripeWebhookErrors || 0);
  assert(ar >= br + 1, "workflowRuns did not increment");
  assert(ag >= bg + 1, "guardStrips did not increment");
  assert(asE >= bs + 1, "stripeWebhookErrors did not increment");
  console.log("OBS METRICS TEST PASS", {
    delta: {
      workflowRuns: ar - br,
      guardStrips: ag - bg,
      stripeWebhookErrors: asE - bs,
    },
  });
}
main().catch((e) => {
  console.error("OBS METRICS TEST FAIL", e);
  process.exit(1);
});
