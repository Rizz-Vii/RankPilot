import { emit } from "@/lib/events/event-bus";
import { ensureBiEventSubscribers } from "@/lib/events/subscribers/bi-subscribers";
import { getFinanceMetrics } from "@/lib/finance/metrics";
import { getLogger } from "@/lib/logging/app-logger";
import {
  getProvenanceReasonCounts,
  getUnifiedMetricsSnapshot,
} from "@/lib/metrics/unified-metrics";
import { enforceProvenance } from "@/lib/middleware/provenance";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = getLogger("api.bi.export");

type Format = "json" | "csv";
type Kind = "latency" | "finance" | "ops" | "all";

function toCsvLine(fields: Array<string | number>): string {
  return fields
    .map((v) => {
      const s = String(v);
      // Quote if contains comma, quote, or newline
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    })
    .join(",");
}

function latencyCsv(
  unified: ReturnType<typeof getUnifiedMetricsSnapshot>,
  routeFilter?: string | null
): string {
  const rows: string[] = [];
  rows.push(
    toCsvLine(["route", "count", "totalMs", "maxMs", "p90", "p95", "p99"])
  );
  const entries = Object.entries(unified.latency || {}).filter(
    ([route]) => !routeFilter || route === routeFilter
  );
  for (const [route, stats] of entries) {
    const p90 = (stats as { p90?: number | null }).p90 ?? null;
    const p95 = (stats as { p95?: number | null }).p95 ?? null;
    const p99 = (stats as { p99?: number | null }).p99 ?? null;
    rows.push(
      toCsvLine([
        route,
        stats.count,
        stats.totalMs,
        stats.maxMs,
        p90 ?? "",
        p95 ?? "",
        p99 ?? "",
      ])
    );
  }
  return rows.join("\n");
}

function financeCsv(finance: { [k: string]: unknown }): string {
  const usable = Object.entries(finance).filter(
    ([k, v]) => typeof v === "number" || typeof v === "string"
  );
  const rows: string[] = [];
  rows.push(toCsvLine(["metric", "value"]));
  for (const [k, v] of usable) rows.push(toCsvLine([k, String(v)]));
  return rows.join("\n");
}

function entriesCsv(
  title: string,
  rows: Array<[string, number]>,
  headers: [string, string]
): string {
  const out: string[] = [];
  out.push(`# ${title}`);
  out.push(toCsvLine(headers));
  for (const [k, v] of rows) out.push(toCsvLine([k, v]));
  return out.join("\n");
}

function opsCsv(unified: ReturnType<typeof getUnifiedMetricsSnapshot>): string {
  const parts: string[] = [];
  const fallbacks = Object.entries(unified.fallbackReasons || {}).sort(
    (a, b) => b[1] - a[1]
  );
  if (fallbacks.length)
    parts.push(entriesCsv("fallbackReasons", fallbacks, ["reason", "count"]));
  const rl = Object.entries(unified.rateLimitRejections || {}).sort(
    (a, b) => b[1] - a[1]
  );
  if (rl.length)
    parts.push(entriesCsv("rateLimitRejections", rl, ["scope", "count"]));
  const gov =
    (
      unified as unknown as {
        governance?: {
          provenanceInjected?: number;
          forbiddenFieldStrips?: number;
        };
      }
    ).governance || {};
  parts.push(
    entriesCsv(
      "governance",
      Object.entries(gov as Record<string, number>) as Array<[string, number]>,
      ["metric", "value"]
    )
  );
  const queue =
    (unified as unknown as { queue?: { [k: string]: number } }).queue ||
    ({} as Record<string, number>);
  parts.push(
    entriesCsv("queue", Object.entries(queue) as Array<[string, number]>, [
      "metric",
      "value",
    ])
  );
  const provReasons = Object.entries(getProvenanceReasonCounts()).sort(
    (a, b) => b[1] - a[1]
  );
  if (provReasons.length)
    parts.push(entriesCsv("provenanceReasons", provReasons, ["note", "count"]));
  return parts.filter(Boolean).join("\n") + "\n";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    ensureBiEventSubscribers();
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") as Format) || "json";
    const kind = (url.searchParams.get("kind") as Kind) || "all";
    const route = url.searchParams.get("route");

    const unified = getUnifiedMetricsSnapshot();
    const { data: finance, headers: financeHeaders } = await getFinanceMetrics(
      req as unknown as Request
    );
    try {
      emit("bi.export.requested", {
        ts: Date.now(),
        source: "api",
        attrs: { kind, format, route },
      });
    } catch {
      /* ignore */
    }

    if (format === "csv") {
      let csv = "";
      if (kind === "latency" || kind === "all") {
        csv += "# latency\n" + latencyCsv(unified, route) + "\n";
      }
      if (kind === "finance" || kind === "all") {
        csv +=
          "# finance\n" +
          financeCsv(finance as unknown as Record<string, unknown>) +
          "\n";
      }
      if (kind === "ops") {
        csv += opsCsv(unified);
      }
      const res = new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
      Object.entries(financeHeaders || {}).forEach(([k, v]) =>
        res.headers.set(k, v)
      );
      return res;
    }

    // Default JSON
    const body = enforceProvenance(
      { ok: true, unified, finance, exportedAt: new Date().toISOString() },
      { path: "bi/export", note: "ok" }
    );
    const res = NextResponse.json(body, { status: 200 });
    Object.entries(financeHeaders || {}).forEach(([k, v]) =>
      res.headers.set(k, v)
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("bi.export.error", { message });
    const body = enforceProvenance(
      {
        ok: false,
        error: "internal_error",
        message: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { path: "bi/export", note: "exception" }
    );
    return NextResponse.json(body, { status: 500 });
  }
}
