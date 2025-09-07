/*
  Edge-case contract tests for /api/table-data
  - empty dataset under scoping should return empty without synthetic fallback
  - string-only values should still sort and paginate without crashing
  - large CSV all-cap should be respected and not hang

  Usage:
    BASE_URL=http://localhost:3000 tsx scripts/test-table-data-edge-cases.ts
*/

import fetch from "node-fetch";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const widgetId = process.env.WIDGET_ID || "edge-table";
const STR_ONLY_WIDGET = process.env.STRING_ONLY_WIDGET_ID || "edge-fallback";
const FALLBACK_WIDGET = process.env.FALLBACK_WIDGET_ID || "edge-fallback";
const SCOPED_EMPTY_WIDGET =
  process.env.SCOPED_EMPTY_WIDGET_ID || "edge-scoped-empty";
const SCOPED_TEAM = process.env.TEST_TEAM_ID || "team-edge";
const SCOPED_USER = process.env.TEST_USER_ID || "user-edge";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("Assertion failed:", msg);
    process.exitCode = 1;
  }
}

async function http(method: "GET" | "POST", path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { method });
  return res;
}

async function json(params: Record<string, string>) {
  const qs = new URLSearchParams({
    widgetId,
    format: "json",
    ...params,
  }).toString();
  const res = await http("GET", `/api/table-data?${qs}`);
  assert(res.ok, `JSON request failed: ${res.status}`);
  return res.json() as Promise<{
    rows: Array<Record<string, unknown>>;
    total?: number;
  }>;
}

async function csv(params: Record<string, string>) {
  const qs = new URLSearchParams({
    widgetId,
    format: "csv",
    ...params,
  }).toString();
  const res = await http("GET", `/api/table-data?${qs}`);
  assert(res.ok, `CSV request failed: ${res.status}`);
  return res.text();
}

async function run() {
  // 1) Empty dataset under scoping (different widget): expect no fallback rows
  const emptyScoped = await json({
    widgetId: SCOPED_EMPTY_WIDGET,
    sort: "metric.asc",
    page: "1",
    pageSize: "10",
    teamId: SCOPED_TEAM,
    userId: SCOPED_USER,
  });
  assert(Array.isArray(emptyScoped.rows), "Scoped rows not array");
  assert(
    emptyScoped.rows.length === 0,
    "Scoped empty dataset should return 0 rows"
  );

  // 2) String-only values: verify ordering on fallback dataset using numeric parse from strings
  // Use a widget that triggers fallback (no Firestore data) so values are strings; verify non-decreasing order for value.asc
  const toNum = (v: unknown) =>
    Number(String((v as unknown) ?? "").replace(/[^0-9.-]/g, ""));
  const stringAsc = await json({
    widgetId: STR_ONLY_WIDGET,
    sort: "value.asc",
    page: "1",
    pageSize: "25",
  });
  assert(
    stringAsc.rows.length > 0,
    "String-only dataset request returned no rows"
  );
  for (let i = 1; i < stringAsc.rows.length; i++) {
    const prev = toNum(stringAsc.rows[i - 1]?.value);
    const curr = toNum(stringAsc.rows[i]?.value);
    assert(
      !Number.isNaN(prev) && !Number.isNaN(curr),
      "Non-numeric string encountered in value"
    );
    assert(
      prev <= curr,
      `value.asc order violated at index ${i}: ${prev} > ${curr}`
    );
  }

  // 3) Large CSV all-cap via fallback: request an oversized total and ensure cap applied
  const text = await csv({
    widgetId: FALLBACK_WIDGET,
    sort: "metric.asc",
    all: "true",
    total: "100000",
  });
  const lines = text.trim().split("\n");
  assert(lines.length >= 1, "CSV edge-case returned no lines");
  const dataLines = lines.length - 1;
  assert(dataLines <= 2000, `CSV cap exceeded: ${dataLines} > 2000`);
  assert(
    dataLines === 2000,
    `CSV cap mismatch: expected 2000, got ${dataLines}`
  );

  console.log("Table-data edge-case tests passed");
  if (process.exitCode) process.exit(process.exitCode);
}

run().catch((err) => {
  console.error("Edge-case tests failed", err);
  process.exit(1);
});
