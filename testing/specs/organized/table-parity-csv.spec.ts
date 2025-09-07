import { expect, test } from "@playwright/test";

const WIDGET_ID = "default"; // adjust if contract script uses different id

function parseCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift()!.split(",");
  return lines.filter(Boolean).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

interface RowLike {
  metric?: unknown;
  value?: unknown;
  change?: unknown;
}
function isRowLike(r: unknown): r is RowLike {
  return !!r && typeof r === "object";
}
function normalizeRows(rows: unknown[]) {
  return rows
    .filter(isRowLike)
    .map((r) => ({
      metric: String(r.metric ?? ""),
      value: r.value as unknown as string | number | undefined,
      change: r.change as unknown as string | number | undefined,
    }))
    .sort((a, b) => (a.metric < b.metric ? -1 : a.metric > b.metric ? 1 : 0));
}

test("table JSON / CSV export parity", async ({ request }) => {
  const jsonRes = await request.get(`/api/table-data?widgetId=${WIDGET_ID}`);
  expect(jsonRes.ok()).toBeTruthy();
  const jsonData = await jsonRes.json();

  const csvRes = await request.get(
    `/api/table-data?widgetId=${WIDGET_ID}&format=csv`
  );
  expect(csvRes.ok()).toBeTruthy();
  const csvText = await csvRes.text();
  const csvData = parseCsv(csvText).map((r) => ({
    metric: (r.metric || r.Metric || "").replace(/^"|"$/g, ""),
    value: (r.value || r.Value || "").replace(/^"|"$/g, ""),
    change: (r.change || r.Change || "").replace(/^"|"$/g, ""),
  }));

  const normJson = normalizeRows((jsonData.rows || []) as unknown[]);
  const normCsv = normalizeRows(csvData);
  expect(normCsv).toEqual(normJson);
});
