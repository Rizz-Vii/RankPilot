import { NextResponse } from "next/server";

async function seedFinance(testUser: string) {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  const periods: string[] = [];
  const now = new Date();
  for (let i = 3; i >= 1; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    );
    periods.push(d.toISOString().slice(0, 7));
  }
  let ok = true;
  for (let idx = 0; idx < periods.length; idx++) {
    const p = periods[idx];
    const amount = 100 * (idx + 1);
    try {
      const r = await fetch(
        `${base}/api/test/finance/seed-invoice?testUser=${encodeURIComponent(testUser)}&amount=${amount}&status=paid&period=${p}`
      );
      ok = ok && r.ok;
    } catch {
      ok = false;
    }
  }
  const current = now.toISOString().slice(0, 7);
  try {
    const draft = await fetch(
      `${base}/api/test/finance/seed-invoice?testUser=${encodeURIComponent(testUser)}&amount=75&status=draft&period=${current}`
    );
    ok = ok && draft.ok;
  } catch {
    ok = false;
  }
  return ok;
}

async function seedBiLatency() {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  const targets = [
    "/api/bi/snapshot",
    "/api/bi/snapshot?route=/api/finance/metrics",
    "/api/bi/snapshot?route=/api/neuroseo/ai-visibility",
    "/api/bi/snapshot?route=/api/finance/metrics&advisory=1",
  ];
  let ok = true;
  for (let i = 0; i < 2; i++) {
    for (const t of targets) {
      try {
        const r = await fetch(base + t);
        ok = ok && r.ok;
      } catch {
        ok = false;
      }
    }
  }
  return ok;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollInvoicesCount(testUser: string, tries = 5, delayMs = 250) {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  let count = 0;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(
        `${base}/api/finance/metrics?months=6&testUser=${encodeURIComponent(testUser)}`,
        { headers: { "x-probe-token": process.env.CRAWL_PROBE_TOKEN || "" } }
      );
      if (r.ok) {
        const json = (await r.json().catch(() => null)) as {
          invoicesCount?: number;
          invoices?: unknown[];
        } | null;
        if (json) {
          if (typeof json.invoicesCount === "number") {
            count = json.invoicesCount;
          } else if (Array.isArray(json.invoices)) {
            count = json.invoices.length;
          } else {
            count = 0;
          }
        } else {
          count = 0;
        }
        if (count > 0) return { count, ready: true, tries: i + 1 };
      }
    } catch {
      // ignore network errors and retry
    }
    await sleep(delayMs);
  }
  return { count, ready: count > 0, tries };
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const url = new URL(req.url);
  const testUser = url.searchParams.get("user") || "ui-data-pop@test.local";
  const wantFinance = url.searchParams.get("finance") !== "0";
  const wantBi = url.searchParams.get("bi") !== "0";
  let financeSeeded = false;
  let biSeeded = false;
  let financePoll: { count: number; ready: boolean; tries: number } | undefined;
  const started = Date.now();
  try {
    if (wantFinance) {
      financeSeeded = await seedFinance(testUser).catch(() => false);
      // Poll invoices count to help strict UI pass consistently
      financePoll = await pollInvoicesCount(testUser, 6, 300).catch(() => ({
        count: 0,
        ready: false,
        tries: 0,
      }));
    }
    if (wantBi) biSeeded = await seedBiLatency().catch(() => false);
  } catch {
    // swallow
  }
  return NextResponse.json({
    ok: true,
    financeSeeded,
    biSeeded,
    durationMs: Date.now() - started,
    user: testUser,
    invoicesCount: financePoll?.count ?? 0,
    financeReady: financePoll?.ready ?? false,
    financePollTries: financePoll?.tries ?? 0,
  });
}
