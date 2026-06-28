"use client";

/**
 * AnalysisResults — unified renderer for a SiteIntelligenceReport.
 *
 * This is the visible payoff of the provenance invariant: every finding shows a badge declaring
 * whether its data is 'measured', 'estimated', or 'simulated', and the report header shows the
 * overall (worst-case) provenance. One component renders SEO Audit, NeuroSEO, and Competitive
 * Intelligence results identically because they all flow through the unified AnalysisItem shape.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type AnalysisItem,
  type Provenance,
  type SiteIntelligenceReport,
  provenanceLabel,
} from "@/lib/site-intelligence/types";

function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const { label, tone } = provenanceLabel(provenance);
  const toneClasses =
    tone === "positive"
      ? "bg-green-100 text-green-800 border-green-200"
      : tone === "caution"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-orange-100 text-orange-800 border-orange-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${toneClasses}`}
      title={`Data provenance: ${provenance}`}
    >
      {label}
    </span>
  );
}

const STATUS_DOT: Record<AnalysisItem["status"], string> = {
  pass: "bg-green-500",
  warning: "bg-amber-500",
  fail: "bg-red-500",
  info: "bg-blue-500",
};

function AnalysisItemRow({ item }: { item: AnalysisItem }) {
  return (
    <li className="flex flex-col gap-1 border-b py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[item.status]}`}
            aria-hidden
          />
          <span className="font-medium">{item.title}</span>
          <span className="text-muted-foreground text-xs uppercase">
            {item.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {typeof item.score === "number" && (
            <span className="text-sm tabular-nums">{item.score}</span>
          )}
          <ProvenanceBadge provenance={item.provenance} />
        </div>
      </div>
      {item.description && (
        <p className="text-muted-foreground text-sm">{item.description}</p>
      )}
      {item.recommendation && (
        <p className="text-sm">
          <span className="font-medium">Recommendation: </span>
          {item.recommendation}
        </p>
      )}
    </li>
  );
}

export function AnalysisResults({
  report,
}: {
  report: SiteIntelligenceReport;
}) {
  const overall = provenanceLabel(report.metadata.provenance);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>
            Site Intelligence — score {report.overallScore}/100
          </CardTitle>
          <ProvenanceBadge provenance={report.metadata.provenance} />
        </div>
        <CardDescription>
          {report.summary}
          {report.metadata.provenance !== "measured" && (
            <span className="text-muted-foreground mt-1 block text-xs">
              Overall data is {overall.label.toLowerCase()} — at least one finding is not from a
              verified source.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {report.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No findings returned.</p>
        ) : (
          <ul className="flex flex-col">
            {report.items.map((item) => (
              <AnalysisItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default AnalysisResults;
