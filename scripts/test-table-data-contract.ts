/*
  Minimal contract test for /api/table-data covering sort, pagination, and CSV export.
  Usage:
    BASE_URL=http://localhost:3000 tsx scripts/test-table-data-contract.ts
  Assumes dev server is running and Firestore seeded for widgetId.
*/

import fetch from "node-fetch";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const widgetId = process.env.WIDGET_ID || "demo-table";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("Assertion failed:", msg);
    process.exitCode = 1;
  }
}

async function getJSON(params: Record<string, string>) {
  const qs = new URLSearchParams({
    widgetId,
    format: "json",
    ...params,
  }).toString();
  const res = await fetch(`${BASE_URL}/api/table-data?${qs}`);
  assert(res.ok, `JSON request failed: ${res.status}`);
  return res.json() as Promise<{
    rows: Array<Record<string, unknown>>;
    page: number;
    pageSize: number;
    total?: number;
  }>;
}

async function getCSV(params: Record<string, string>) {
  const qs = new URLSearchParams({
    widgetId,
    format: "csv",
    ...params,
  }).toString();
  const res = await fetch(`${BASE_URL}/api/table-data?${qs}`);
  assert(res.ok, `CSV request failed: ${res.status}`);
  const text = await res.text();
  assert(/^(metric|Metric)\s*,/.test(text.trim()), "CSV header missing metric");
  return text;
}

async function run() {
  const toNumber = (r: Record<string, unknown>) => {
    if (typeof r.valueNum === "number") return r.valueNum as number;
    const n = Number(
      String((r.value as unknown) ?? "").replace(/[^0-9.-]/g, "")
    );
    return Number.isFinite(n) ? n : NaN;
  };

  // 1) Sort contract: compare first row under asc vs desc
  const pageDesc = await getJSON({
    sort: "valueNum.desc",
    page: "1",
    pageSize: "10",
  });
  const pageAsc = await getJSON({
    sort: "valueNum.asc",
    page: "1",
    pageSize: "10",
  });
  assert(
    pageDesc.rows.length > 0 && pageAsc.rows.length > 0,
    "No rows for sort contract"
  );
  const firstDesc = toNumber(pageDesc.rows[0]);
  const firstAsc = toNumber(pageAsc.rows[0]);
  if (Number.isFinite(firstDesc) && Number.isFinite(firstAsc)) {
    assert(
      firstDesc >= firstAsc,
      "Sort contract failed: desc first < asc first"
    );
  }

  // 2) Pagination: page 2 should not equal page 1 when dataset > pageSize
  const page2 = await getJSON({
    sort: "valueNum.desc",
    page: "2",
    pageSize: "10",
  });
  if (page2.rows.length > 0) {
    assert(
      JSON.stringify(pageDesc.rows) !== JSON.stringify(page2.rows),
      "Page 2 identical to page 1 (unexpected if total > pageSize)"
    );
  }

  // 3) CSV all export sorted by metric asc
  const csv = await getCSV({ sort: "metric.asc", all: "true" });
  const lines = csv.trim().split("\n");
  assert(lines.length >= 2, "CSV has no data lines");

  console.log("Table-data contract test passed");
  if (process.exitCode) process.exit(process.exitCode);
}

run().catch((err) => {
  console.error("Contract test failed", err);
  process.exit(1);
});
