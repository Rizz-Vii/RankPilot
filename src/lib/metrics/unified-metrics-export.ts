// Unified Metrics Daily Export (T16 extension)
// Persists a compact daily snapshot of provenance coverage & latency percentiles
// so the Cloud Function KPI daily snapshot can enrich fields without access to
// in-process unified metrics.
import { adminDb } from "@/lib/firebase-admin";
import { getKpiSnapshot } from "./kpi-aggregation";
import { getUnifiedMetricsSnapshot } from "./unified-metrics";

interface ExternalCrawlerMetrics {
  success: number;
  errors: number;
  totalCrawlMs: number;
  totalAnalysisMs: number;
  crawlP95: number | null;
  analysisP95: number | null;
  crawlP99: number | null;
  analysisP99: number | null;
}

interface UnifiedDailyDoc {
  date: string;
  provenanceCoveragePct: number | null;
  p90LatencyOverall: number | null;
  p95LatencyOverall: number | null;
  p99LatencyOverall: number | null;
  routesP95: Record<string, number | null>;
  crawler?: ExternalCrawlerMetrics;
  semanticMap?: unknown;
  createdAt?: Date;
  updatedAt: Date;
  _schema: 1;
}

let lastWrittenDate: string | null = null;

export async function ensureDailyUnifiedMetricsExport(): Promise<void> {
  try {
    const dateKey = new Date().toISOString().slice(0, 10);
    if (lastWrittenDate === dateKey) return; // already written this runtime
    const kpis = getKpiSnapshot();
    // Merge external runtime crawler counters (written by Cloud Function environment) if present
    let externalCrawler: Partial<ExternalCrawlerMetrics> | null = null;
    try {
      const cDoc = await adminDb
        .collection("runtimeMetrics")
        .doc("crawler")
        .get();
      if (cDoc.exists) {
        const data = cDoc.data() as Partial<ExternalCrawlerMetrics> | undefined;
        externalCrawler = data || null;
      }
    } catch (e: unknown) {
      const msg =
        typeof e === "object" &&
        e &&
        "message" in e &&
        typeof (e as { message?: unknown }).message === "string"
          ? (e as { message: string }).message
          : "unknown";
      console.warn("crawlerMetrics.load_failed", msg);
    }
    const ref = adminDb.collection("unifiedMetricsDaily").doc(dateKey);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const base: UnifiedDailyDoc = {
        date: dateKey,
        provenanceCoveragePct: kpis.provenanceCoveragePct ?? null,
        p90LatencyOverall: kpis.p90LatencyOverall ?? null,
        p95LatencyOverall: kpis.p95LatencyOverall ?? null,
        p99LatencyOverall: kpis.p99LatencyOverall ?? null,
        routesP95: kpis.routesP95 as Record<string, number | null>,
        crawler: externalCrawler
          ? {
              success: Number(externalCrawler.success) || 0,
              errors: Number(externalCrawler.errors) || 0,
              totalCrawlMs: Number(externalCrawler.totalCrawlMs) || 0,
              totalAnalysisMs: Number(externalCrawler.totalAnalysisMs) || 0,
              crawlP95: externalCrawler.crawlP95 ?? null,
              analysisP95: externalCrawler.analysisP95 ?? null,
              crawlP99: externalCrawler.crawlP99 ?? null,
              analysisP99: externalCrawler.analysisP99 ?? null,
            }
          : kpis.crawler
            ? {
                success: Number(kpis.crawler.success) || 0,
                errors: Number(kpis.crawler.errors) || 0,
                totalCrawlMs: Number(kpis.crawler.totalCrawlMs) || 0,
                totalAnalysisMs: Number(kpis.crawler.totalAnalysisMs) || 0,
                crawlP95: null,
                analysisP95: null,
                crawlP99: null,
                analysisP99: null,
              }
            : undefined,
        // Persist semantic map aggregate adoption counters (raw) if present
        semanticMap:
          ((): unknown => {
            const snap = getUnifiedMetricsSnapshot() as
              | { semanticMap?: unknown }
              | undefined;
            return snap?.semanticMap;
          })() || undefined,
        updatedAt: new Date(),
        _schema: 1,
      };
      if (!snap.exists) tx.set(ref, { ...base, createdAt: new Date() });
      else tx.update(ref, base as Partial<UnifiedDailyDoc>);
    });
    lastWrittenDate = dateKey;
  } catch (e: unknown) {
    const msg =
      typeof e === "object" &&
      e &&
      "message" in e &&
      typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "unknown";
    console.warn("unifiedMetricsDaily.export_failed", msg);
  }
}
