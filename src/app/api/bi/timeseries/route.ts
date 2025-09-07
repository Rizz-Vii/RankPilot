import {
  ensureSamplerStarted,
  getTimeSeries,
  registerRouteForSampling,
} from "@/lib/metrics/time-series";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toCsvLine(fields: Array<string | number>): string {
  return fields
    .map((v) => {
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    })
    .join(",");
}

export async function GET(req: NextRequest) {
  ensureSamplerStarted();
  const url = new URL(req.url);
  const route = url.searchParams.get("route") || undefined;
  if (route) registerRouteForSampling(route);
  const points = Math.max(
    1,
    Math.min(144, Number(url.searchParams.get("n") || "0") || 0)
  );
  const snap = getTimeSeries(points || undefined, route);
  const hasRoute = !!route && "p95" in snap && "p99" in snap;
  const header = hasRoute
    ? [
        "ts",
        "fallbacks",
        "rateLimit",
        "queueDepth",
        "queueSuccessPct",
        "p95",
        "p99",
      ]
    : ["ts", "fallbacks", "rateLimit", "queueDepth", "queueSuccessPct"];
  const rows: string[] = [];
  rows.push(toCsvLine(header));
  const len = snap.ts.length;
  for (let i = 0; i < len; i++) {
    const base = [
      snap.ts[i],
      snap.fallbacks[i] ?? "",
      snap.rateLimit[i] ?? "",
      snap.queueDepth[i] ?? "",
      snap.queueSuccessPct[i] ?? "",
    ];
    if (hasRoute) {
      const p95 = (snap as unknown as { p95: number[] }).p95[i] ?? "";
      const p99 = (snap as unknown as { p99: number[] }).p99[i] ?? "";
      rows.push(toCsvLine([...base, p95, p99]));
    } else {
      rows.push(toCsvLine(base));
    }
  }
  return new NextResponse(rows.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
