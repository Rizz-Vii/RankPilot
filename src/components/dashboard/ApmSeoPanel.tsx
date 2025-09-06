"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { APMMetric } from "@/lib/monitoring/enterprise-apm";
import { enterpriseAPM } from "@/lib/monitoring/enterprise-apm";
import { CheckCircle2, ImageOff, Type as TypeIcon, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SeoSnapshot = {
    metaPresent: { value: number; ts: number; meta?: { length?: number; snippet?: string; titleLength?: number; canonical?: boolean } } | null;
    h1Count: { value: number; ts: number; meta?: { firstH1?: string } } | null;
    missingAlt: { value: number; ts: number; meta?: { samples?: string[] } } | null;
};

function latest(metrics: APMMetric[] | undefined): APMMetric | null {
    if (!metrics || metrics.length === 0) return null;
    return metrics.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
}

export default function ApmSeoPanel() {
    const [snap, setSnap] = useState<SeoSnapshot>({ metaPresent: null, h1Count: null, missingAlt: null });

    // Compute initial snapshot from current buffer
    useEffect(() => {
        if (typeof window === "undefined") return;
        const path = window.location.pathname;
        const byName = (name: string) => enterpriseAPM.getMetrics({ name, limit: 50 }).filter(m => m.tags.page === path);
        const meta = latest(byName("seo.meta_description.present"));
        const h1 = latest(byName("seo.h1.count"));
        const img = latest(byName("seo.images.missing_alt"));
        const metaMeta = meta?.metadata as { length?: number; snippet?: string; titleLength?: number; canonical?: boolean } | undefined;
        const h1Meta = h1?.metadata as { firstH1?: string } | undefined;
        const imgMeta = img?.metadata as { samples?: string[] } | undefined;
        setSnap({
            metaPresent: meta ? { value: meta.value, ts: meta.timestamp, meta: metaMeta } : null,
            h1Count: h1 ? { value: h1.value, ts: h1.timestamp, meta: h1Meta } : null,
            missingAlt: img ? { value: img.value, ts: img.timestamp, meta: imgMeta } : null,
        });
    }, []);

    // Type narrowing helpers for metric.metadata
    const asMetaMeta = (m: unknown): { length?: number; snippet?: string; titleLength?: number; canonical?: boolean } | undefined => {
        if (!m || typeof m !== "object") return undefined;
        const x = m as Record<string, unknown>;
        return {
            length: typeof x.length === "number" ? x.length : undefined,
            snippet: typeof x.snippet === "string" ? x.snippet : undefined,
            titleLength: typeof x.titleLength === "number" ? x.titleLength : undefined,
            canonical: typeof x.canonical === "boolean" ? x.canonical : undefined,
        };
    };
    const asH1Meta = (m: unknown): { firstH1?: string } | undefined => {
        if (!m || typeof m !== "object") return undefined;
        const x = m as Record<string, unknown>;
        return { firstH1: typeof x.firstH1 === "string" ? x.firstH1 : undefined };
    };
    const asImgMeta = (m: unknown): { samples?: string[] } | undefined => {
        if (!m || typeof m !== "object") return undefined;
        const x = m as Record<string, unknown>;
        const raw = x.samples;
        const samples = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : undefined;
        return { samples };
    };

    // Live updates via event emitter
    useEffect(() => {
        const handler = (metric: APMMetric) => {
            if (typeof window === "undefined") return;
            if (metric.tags.page !== window.location.pathname) return;
            if (metric.name === "seo.meta_description.present") {
                setSnap(s => ({ ...s, metaPresent: { value: metric.value, ts: metric.timestamp, meta: asMetaMeta(metric.metadata) } }));
            } else if (metric.name === "seo.h1.count") {
                setSnap(s => ({ ...s, h1Count: { value: metric.value, ts: metric.timestamp, meta: asH1Meta(metric.metadata) } }));
            } else if (metric.name === "seo.images.missing_alt") {
                setSnap(s => ({ ...s, missingAlt: { value: metric.value, ts: metric.timestamp, meta: asImgMeta(metric.metadata) } }));
            }
        };
        (enterpriseAPM as unknown as { on: (ev: string, cb: (m: APMMetric) => void) => void }).on("metric-recorded", handler);
        return () => {
            // Remove listener if available
            const anyApm = enterpriseAPM as unknown as { off?: (ev: string, cb: (m: APMMetric) => void) => void };
            if (typeof anyApm.off === "function") anyApm.off("metric-recorded", handler);
        };
    }, []);

    const lastUpdated = useMemo(() => {
        const ts = Math.max(snap.metaPresent?.ts ?? 0, snap.h1Count?.ts ?? 0, snap.missingAlt?.ts ?? 0);
        if (!ts) return null;
        const diff = Date.now() - ts;
        if (diff < 60_000) return "just now";
        const m = Math.floor(diff / 60_000);
        return `${m}m ago`;
    }, [snap]);

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">On-page SEO (APM)</CardTitle>
                    {lastUpdated && <span className="text-[10px] text-muted-foreground">Updated {lastUpdated}</span>}
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">Meta Description</div>
                        {snap.metaPresent?.value ? (
                            <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                        ) : (
                            <XCircle className="h-4 w-4 text-destructive-foreground" />
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {snap.metaPresent?.value ? (
                            <>
                                Present{typeof snap.metaPresent.meta?.length === "number" && ` • ${snap.metaPresent.meta.length} chars`}
                                {snap.metaPresent.meta?.snippet && (
                                    <div className="truncate mt-0.5" title={snap.metaPresent.meta.snippet}>
                                        “{snap.metaPresent.meta.snippet}”
                                    </div>
                                )}
                            </>
                        ) : (
                            <>Missing on this page</>
                        )}
                    </div>
                </div>
                <div className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">H1 Elements</div>
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {typeof snap.h1Count?.value === "number" ? (
                            <>
                                {snap.h1Count.value} found
                                {snap.h1Count.meta?.firstH1 && (
                                    <div className="truncate mt-0.5" title={snap.h1Count.meta.firstH1}>
                                        First: “{snap.h1Count.meta.firstH1}”
                                    </div>
                                )}
                            </>
                        ) : (
                            <>—</>
                        )}
                    </div>
                </div>
                <div className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">Images Missing Alt</div>
                        <ImageOff className="h-4 w-4 text-warning-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {typeof snap.missingAlt?.value === "number" ? (
                            <>
                                {snap.missingAlt.value}
                                {snap.missingAlt.value > 0 && snap.missingAlt.meta?.samples && snap.missingAlt.meta.samples.length > 0 && (
                                    <div className="mt-0.5">
                                        <Badge variant="outline" className="text-[10px]" title={snap.missingAlt.meta.samples.join(", ")}>{(() => { try { return `sample: ${new URL(snap.missingAlt!.meta!.samples![0]!, window.location.href).pathname}`; } catch { return "sample available"; } })()}</Badge>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>—</>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
