/*
  Seeds Firestore with example rows under dashboardTables/{widgetId}/rows.
  Usage:
    WIDGET_ID=my-table COUNT=25 ts-node -P scripts/tsconfig.json scripts/seed-dashboard-table-rows.ts
  Env:
    WIDGET_ID: target widget id (default: demo-table)
    COUNT: number of rows to seed (default: 25)
*/

import { adminDb } from "../src/lib/firebase-admin";

type Row = {
  metric: string;
  value: string;
  valueNum?: number;
  change: string;
  changeNum?: number;
  createdAt: Date;
  teamId?: string;
  userId?: string;
};

async function main() {
  const widgetId = process.env.WIDGET_ID || "demo-table";
  const count = Number(process.env.COUNT || 25);
  const teamId = process.env.TEAM_ID || undefined;
  const userId = process.env.USER_ID || undefined;
  const stringOnly =
    (process.env.STRING_ONLY || "false").toLowerCase() === "true";
  // Minimal deterministic RNG (LCG)
  let seed =
    0x2f6e2b1 ^
    widgetId.split("").reduce((a, c) => (a * 33) ^ c.charCodeAt(0), 5381);
  const rng = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const col = adminDb
    .collection("dashboardTables")
    .doc(widgetId)
    .collection("rows");

  // Wipe existing rows for deterministic results (safe for demo widgets).
  const snapshot = await col.get();
  const batch = adminDb.batch();
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic numeric values
    const base = Math.floor(1000 + (1 - rng()) * 9000);
    const trend = (i % 2 === 0 ? 1 : -1) * ((i % 9) + Math.floor(rng() * 5));
    const valueNum = base - i * 13; // strictly decreasing by index
    const changeNum = trend; // signed delta percentage points
    const value = valueNum.toLocaleString("en-US");
    const change = `${changeNum >= 0 ? "+" : ""}${changeNum}%`;

    rows.push({
      metric: `Metric ${String(i + 1).padStart(2, "0")}`,
      value: stringOnly ? `${value}` : value,
      valueNum: stringOnly ? undefined : valueNum,
      change: stringOnly ? `${change}` : change,
      changeNum: stringOnly ? undefined : changeNum,
      createdAt: new Date(),
      teamId,
      userId,
    });
  }

  // Write in batches of 500
  let pending = adminDb.batch();
  let idx = 0;
  for (const r of rows) {
    const ref = col.doc();
    pending.set(ref, r);
    idx++;
    if (idx % 500 === 0) {
      await pending.commit();
      pending = adminDb.batch();
    }
  }
  await pending.commit();

  console.log(
    JSON.stringify(
      { status: "ok", widgetId, seeded: rows.length, sample: rows.slice(0, 3) },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("Seeding failed", err);
  process.exit(1);
});
