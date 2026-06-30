// Sales Metrics Service - Firestore aggregation with graceful mock fallback
// NOTE: Collections assumed: salesDeals, salesForecastSnapshots. Adjust to real schema.
import { getMockMetrics } from "@/lib/domain/mockMetrics";
import { allowDemoContent } from "@/lib/flags/demo";
import { db } from "@/lib/firebase";
import { mapDocs } from "@/lib/firebase/snapshot-map";
import { managedOnSnapshot } from "@/lib/firebase/write-guard";
import type {
  ForecastSnapshotFirestore,
  SalesDealFirestore,
} from "@/types/firestore-docs";
import { mapForecastSnapshot, mapSalesDeal } from "@/types/firestore-docs";
import type {
  DocumentData,
  QueryConstraint,
  QuerySnapshot,
  Unsubscribe,
} from "firebase/firestore";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
// Local diagnostics for sales metrics ingestion
const salesDiagnostics: { lastIngestError?: string } = {};

export interface SalesDealDoc {
  stage: string;
  amount: number;
  probability?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  status?: string;
  cycleDays?: number;
  userId?: string;
  teamId?: string;
}
export interface ForecastSnapshotDoc {
  period: string;
  forecast: number;
  actual?: number;
  createdAt?: unknown;
  userId?: string;
  teamId?: string;
}

export interface AggregatedSalesMetrics {
  kpis: {
    key: string;
    label: string;
    value: number;
    delta: number;
    trend: number[];
    intent?: "neutral" | "success" | "warning" | "danger" | "accent";
    target?: number;
    invertTarget?: boolean;
  }[];
  funnel: { stage: string; count: number; value: number; conversion: number }[];
  forecastSeries: { label: string; forecast: number; actual: number }[];
  coverage: { pipeline: number; target: number; coverageRatio: number };
  velocity: { stage: string; days: number }[];
}

function aggregate(
  deals: SalesDealDoc[],
  forecast: ForecastSnapshotDoc[]
): AggregatedSalesMetrics {
  // Aggregate funnel by stage order heuristic
  const stageOrder = ["S1", "S2", "S3", "S4", "S5", "ClosedWon"];
  const funnelMap = new Map<string, { count: number; value: number }>();
  deals.forEach((d) => {
    const st = d.stage || "Unknown";
    if (!funnelMap.has(st)) funnelMap.set(st, { count: 0, value: 0 });
    const rec = funnelMap.get(st)!;
    rec.count += 1;
    rec.value += d.amount || 0;
  });
  const funnel = stageOrder
    .filter((s) => funnelMap.has(s))
    .map((s, i, arr) => {
      const rec = funnelMap.get(s)!;
      const prevCount =
        i === 0 ? rec.count : funnelMap.get(arr[i - 1])?.count || rec.count;
      const conversion = prevCount ? (rec.count / prevCount) * 100 : 100;
      return {
        stage: s,
        count: rec.count,
        value: rec.value,
        conversion: Number(conversion.toFixed(1)),
      };
    });

  const pipelineValue = deals
    .filter((d) => d.status !== "ClosedLost")
    .reduce((a, b) => a + (b.amount || 0), 0);
  const closedWon = deals.filter((d) => d.status === "ClosedWon");
  const winRate = closedWon.length
    ? (closedWon.length / deals.length) * 100
    : 0;
  const avgCycle = (() => {
    const arr = closedWon.map((d) => d.cycleDays || 0).filter(Boolean);
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  })();
  const lastSnapshots = forecast.slice(-8);
  const accuracy = lastSnapshots.length
    ? (lastSnapshots.reduce(
        (a, b) =>
          a +
          (b.actual && b.forecast
            ? 1 - Math.abs((b.actual - b.forecast) / (b.forecast || 1))
            : 0),
        0
      ) /
        lastSnapshots.length) *
      100
    : 0;
  const trend = (metric: "pipeline" | "win" | "accuracy") => {
    if (metric === "pipeline") return lastSnapshots.map((s) => s.forecast || 0);
    if (metric === "win")
      return lastSnapshots.map((_, i) => winRate + Math.sin(i / 2) * 2);
    return lastSnapshots.map((_, i) => accuracy + Math.cos(i / 2) * 2);
  };
  const kpis: AggregatedSalesMetrics["kpis"] = [
    {
      key: "pipeline",
      label: "Pipeline Value",
      value: pipelineValue,
      delta: 0,
      trend: trend("pipeline"),
      intent: "success",
      target: pipelineValue * 0.9,
    },
    {
      key: "win_rate",
      label: "Win Rate %",
      value: Number(winRate.toFixed(1)),
      delta: 0,
      trend: trend("win"),
      intent: winRate > 25 ? "success" : "warning",
      target: 30,
    },
    {
      key: "forecast_accuracy",
      label: "Forecast Accuracy %",
      value: Number(accuracy.toFixed(1)),
      delta: 0,
      trend: trend("accuracy"),
      intent: accuracy > 85 ? "success" : "warning",
      target: 90,
    },
    {
      key: "avg_cycle",
      label: "Avg Sales Cycle (d)",
      value: Number(avgCycle.toFixed(1)),
      delta: 0,
      trend: trend("win"),
      intent: avgCycle < 35 ? "success" : "warning",
      target: 30,
      invertTarget: true,
    },
  ];
  const target =
    (lastSnapshots.reduce((a, b) => a + (b.forecast || 0), 0) /
      (lastSnapshots.length || 1)) *
    3;
  const coverage = {
    pipeline: pipelineValue,
    target,
    coverageRatio: target ? pipelineValue / target : 0,
  };
  const velocityMap = new Map<string, { total: number; count: number }>();
  deals.forEach((d) => {
    if (!d.stage || !d.cycleDays) return;
    if (!velocityMap.has(d.stage))
      velocityMap.set(d.stage, { total: 0, count: 0 });
    const rec = velocityMap.get(d.stage)!;
    rec.total += d.cycleDays;
    rec.count++;
  });
  const velocity = stageOrder
    .filter((s) => velocityMap.has(s))
    .map((s) => ({
      stage: s,
      days: Number(
        (velocityMap.get(s)!.total / velocityMap.get(s)!.count).toFixed(1)
      ),
    }));
  const forecastSeries = lastSnapshots.map((s) => ({
    label: s.period,
    forecast: s.forecast || 0,
    actual: s.actual || s.forecast || 0,
  }));
  return { kpis, funnel, forecastSeries, coverage, velocity };
}

export async function fetchSalesMetrics(
  userId: string,
  range: "30d" | "90d" | "ytd",
  teamId?: string
): Promise<AggregatedSalesMetrics> {
  try {
    const now = new Date();
    const start = new Date(now);
    if (range === "30d") start.setDate(start.getDate() - 30);
    else if (range === "90d") start.setDate(start.getDate() - 90);
    else start.setMonth(0, 1);
    const startTs = Timestamp.fromDate(start);
    const dealsConditions: QueryConstraint[] = [
      where("createdAt", ">=", startTs),
    ];
    if (teamId) dealsConditions.push(where("teamId", "==", teamId));
    else dealsConditions.push(where("userId", "==", userId));
    const dealsQ = query(collection(db, "salesDeals"), ...dealsConditions);
    const dealsSnap = await getDocs(dealsQ);
    const deals: SalesDealDoc[] = mapDocs(
      dealsSnap as QuerySnapshot<DocumentData>,
      (_id, data) => mapSalesDeal(data as SalesDealFirestore)
    );
    const fcConditions: QueryConstraint[] = teamId
      ? [where("teamId", "==", teamId)]
      : [where("userId", "==", userId)];
    const fcQ = query(
      collection(db, "salesForecastSnapshots"),
      ...fcConditions
    );
    const fcSnap = await getDocs(fcQ);
    const forecast: ForecastSnapshotDoc[] = mapDocs(
      fcSnap as QuerySnapshot<DocumentData>,
      (_id, data) => mapForecastSnapshot(data as ForecastSnapshotFirestore)
    );
    if (!deals.length) throw new Error("No deals");
    return aggregate(deals, forecast);
  } catch (e) {
    const msg =
      typeof e === "object" &&
      e &&
      "message" in (e as Record<string, unknown>) &&
      typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : String(e);
    salesDiagnostics.lastIngestError =
      msg.length > 140 ? msg.slice(0, 140) : msg;
    // Pre-launch: real users (demo off) get an honest EMPTY state, never hardcoded sample funnels.
    if (!allowDemoContent()) {
      return {
        kpis: [],
        funnel: [],
        forecastSeries: [],
        coverage: { pipeline: 0, target: 0, coverageRatio: 0 },
        velocity: [],
      };
    }
    const mock = await getMockMetrics("sales");
    return {
      kpis: mock.kpis.map((k) => ({
        ...k,
        target:
          k.key === "forecast" ? 95 : k.key === "velocity" ? 30 : undefined,
        invertTarget: k.key === "velocity",
      })),
      funnel: [
        { stage: "S1", count: 120, value: 300000, conversion: 100 },
        { stage: "S2", count: 80, value: 240000, conversion: 66.7 },
        { stage: "S3", count: 50, value: 160000, conversion: 62.5 },
        { stage: "S4", count: 25, value: 100000, conversion: 50 },
        { stage: "S5", count: 12, value: 60000, conversion: 48 },
      ],
      forecastSeries: [
        { label: "W1", forecast: 120000, actual: 118000 },
        { label: "W2", forecast: 180000, actual: 175000 },
        { label: "W3", forecast: 230000, actual: 210000 },
        { label: "W4", forecast: 300000, actual: 298000 },
      ],
      coverage: { pipeline: 420000, target: 300000, coverageRatio: 1.4 },
      velocity: [
        { stage: "S1", days: 3 },
        { stage: "S2", days: 5 },
        { stage: "S3", days: 7 },
        { stage: "S4", days: 12 },
        { stage: "S5", days: 9 },
      ],
    };
  }
}

export function subscribeSalesMetrics(
  userId: string,
  range: "30d" | "90d" | "ytd",
  cb: (
    m: AggregatedSalesMetrics,
    ctx: { deals: SalesDealDoc[]; forecast: ForecastSnapshotDoc[] }
  ) => void,
  teamId?: string
): Unsubscribe {
  const now = new Date();
  const start = new Date(now);
  if (range === "30d") start.setDate(start.getDate() - 30);
  else if (range === "90d") start.setDate(start.getDate() - 90);
  else start.setMonth(0, 1);
  const startTs = Timestamp.fromDate(start);
  const dealsConditions: QueryConstraint[] = [
    where("createdAt", ">=", startTs),
  ];
  if (teamId) dealsConditions.push(where("teamId", "==", teamId));
  else dealsConditions.push(where("userId", "==", userId));
  const dealsQ = query(collection(db, "salesDeals"), ...dealsConditions);
  const fcConditions: QueryConstraint[] = teamId
    ? [where("teamId", "==", teamId)]
    : [where("userId", "==", userId)];
  const fcQ = query(collection(db, "salesForecastSnapshots"), ...fcConditions);
  let deals: SalesDealDoc[] = [];
  let forecast: ForecastSnapshotDoc[] = [];
  const emit = () => {
    if (deals.length) {
      try {
        const aggregated = aggregate(deals, forecast);
        cb(aggregated, { deals, forecast });
      } catch {}
    }
  };
  const unsubs: Unsubscribe[] = [];
  unsubs.push(
    managedOnSnapshot(
      dealsQ,
      (snap) => {
        deals = mapDocs(snap as QuerySnapshot<DocumentData>, (_id, data) =>
          mapSalesDeal(data as SalesDealFirestore)
        );
        emit();
      },
      (err) => console.error("[SalesMetrics] deals snapshot error", err),
      { debounceMs: 120 }
    )
  );
  unsubs.push(
    managedOnSnapshot(
      fcQ,
      (snap) => {
        forecast = mapDocs(snap as QuerySnapshot<DocumentData>, (_id, data) =>
          mapForecastSnapshot(data as ForecastSnapshotFirestore)
        );
        emit();
      },
      (err) => console.error("[SalesMetrics] forecast snapshot error", err),
      { debounceMs: 120 }
    )
  );
  return () => {
    unsubs.forEach((u) => u());
  };
}
