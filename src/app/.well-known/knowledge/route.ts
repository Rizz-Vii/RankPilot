import { adminDb } from "@/lib/firebase-admin";
import { neuroSEOOrchestrator } from "@/lib/neuroseo/enhanced-orchestrator";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Returns latest compact knowledge cards in JSON-LD for LLM KB ingestion.
export async function GET() {
  try {
    // Fetch recent analyses (limit 10) for public summary. In dev/mock, fallback to synthetic demo.
    let docs: Array<{ id: string; data: Record<string, unknown> | undefined }> =
      [];
    try {
      const snap = await adminDb
        .collection("neuroSeoAnalyses")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      if (snap && !snap.empty) {
        docs = snap.docs.map((d) => ({
          id: d.id,
          data: d.data() as Record<string, unknown> | undefined,
        }));
      }
    } catch {
      docs = [];
    }

    const items: Array<Record<string, unknown>> = [];
    if (docs.length) {
      for (const d of docs) {
        const data = d.data;
        const urlsUnknown = (data &&
          (data as { urls?: unknown }).urls) as unknown;
        const urls: string[] = Array.isArray(urlsUnknown)
          ? urlsUnknown.filter((u): u is string => typeof u === "string")
          : [];
        if (!urls.length) continue;

        const overallScore =
          data &&
          typeof (data as { overallScore?: unknown }).overallScore === "number"
            ? (data as { overallScore: number }).overallScore
            : 0;
        const tkUnknown =
          data && (data as { topKeywords?: unknown }).topKeywords;
        const topKeywords: Array<{
          keyword: string;
          position?: number;
          volume?: number;
        }> = Array.isArray(tkUnknown)
          ? (tkUnknown as Array<Record<string, unknown>>)
              .slice(0, 6)
              .map((k) => ({
                keyword:
                  k && typeof k.keyword === "string"
                    ? (k.keyword as string)
                    : "",
                position:
                  typeof k.position === "number"
                    ? (k.position as number)
                    : undefined,
                volume:
                  typeof k.volume === "number"
                    ? (k.volume as number)
                    : undefined,
              }))
              .filter((k) => k.keyword.length > 0)
          : [];
        const provenance =
          data &&
          typeof (data as { __provenance?: unknown }).__provenance === "string"
            ? (data as { __provenance: string }).__provenance
            : "live";
        const createdAt = (() => {
          const v = data && (data as { createdAt?: unknown }).createdAt;
          if (
            v &&
            typeof v === "object" &&
            "toDate" in (v as Record<string, unknown>) &&
            typeof (v as { toDate?: unknown }).toDate === "function"
          ) {
            try {
              return (v as { toDate: () => Date }).toDate();
            } catch {
              /* ignore */
            }
          }
          return new Date();
        })();

        items.push(
          toJsonLdCard({
            urls,
            overallScore,
            topKeywords,
            provenance,
            createdAt,
          })
        );
      }
    } else {
      // Fallback: run a quick analysis on rankpilot.ai homepage to emit at least one card
      const report = await neuroSEOOrchestrator.runAnalysis({
        urls: ["https://rankpilot.ai"],
        analysisType: "quick",
        userId: "public",
      });
      const topKeywords = Array.isArray(
        (
          report as unknown as {
            keywords?: Array<{
              keyword?: unknown;
              position?: unknown;
              volume?: unknown;
            }>;
          }
        ).keywords
      )
        ? (
            report as unknown as {
              keywords: Array<{
                keyword?: unknown;
                position?: unknown;
                volume?: unknown;
              }>;
            }
          ).keywords
            .slice(0, 6)
            .map((k) => ({
              keyword: typeof k.keyword === "string" ? k.keyword : "",
            }))
            .filter((k) => k.keyword)
        : [];
      const sources = Array.isArray(
        (
          report as unknown as {
            sources?: Array<{
              url?: unknown;
              firstH1?: unknown;
              externalAnchors?: unknown;
              missingAltSamples?: unknown;
            }>;
          }
        ).sources
      )
        ? (
            report as unknown as {
              sources: Array<{
                url?: unknown;
                firstH1?: unknown;
                externalAnchors?: unknown;
                missingAltSamples?: unknown;
              }>;
            }
          ).sources
        : [];
      items.push(
        toJsonLdCard({
          urls: report.urls,
          overallScore: report.overallScore,
          topKeywords,
          provenance: "live",
          createdAt: new Date(report.timestamp),
          sources: sources as Array<{
            url: string;
            firstH1?: string;
            externalAnchors: Array<{ href: string; text: string }>;
            missingAltSamples: string[];
          }>,
        })
      );
    }

    const body = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items,
      },
      null,
      2
    );

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/ld+json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new NextResponse(JSON.stringify({ error: msg }), { status: 500 });
  }
}

type CardInput = {
  urls: string[];
  overallScore: number;
  topKeywords: Array<{ keyword: string; position?: number; volume?: number }>;
  provenance: string;
  createdAt: Date;
  sources?: Array<{
    url: string;
    firstH1?: string;
    externalAnchors: Array<{ href: string; text: string }>;
    missingAltSamples: string[];
  }>;
};

function toJsonLdCard(input: CardInput) {
  const mainUrl = input.urls[0];
  const anchors = (input.sources || [])
    .flatMap((s) => s.externalAnchors || [])
    .slice(0, 8);
  return {
    "@type": "Dataset",
    name: `NeuroSEO analysis for ${new URL(mainUrl).hostname}`,
    description: "Measured on-page SEO and semantic signals with provenance.",
    url: mainUrl,
    dateCreated: input.createdAt.toISOString(),
    creator: {
      "@type": "Organization",
      name: "RankPilot",
      url: "https://rankpilot.ai",
    },
    isAccessibleForFree: true,
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `https://rankpilot.ai/.well-known/knowledge`,
    },
    variableMeasured: ["overallScore", "topKeywords", "anchors"],
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "overallScore",
        value: input.overallScore,
      },
      { "@type": "PropertyValue", name: "provenance", value: input.provenance },
      {
        "@type": "PropertyValue",
        name: "topKeywords",
        value: input.topKeywords.map((k) => k.keyword).join(", "),
      },
    ],
    citation: anchors
      .map((a) => ({
        "@type": "CreativeWork",
        url: a.href,
        name: a.text || a.href,
      }))
      .slice(0, 8),
  } as Record<string, unknown>;
}
