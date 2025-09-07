"use client";
// Enterprise Marketing - Marketing Content Generation
import { LazyDataTable } from "@/components/metrics/LazyDataTable";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { TrendSparkline } from "@/components/metrics/TrendSparkline";
import { ActionCard } from "@/components/shared/ActionCard";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMarketingCampaignMetrics } from "@/hooks/useMarketingCampaignMetrics";
import { useMockDomainMetrics } from "@/hooks/useMockDomainMetrics";
import { useProvenance } from "@/hooks/useProvenance";
import {
  adjustTone,
  generateContentAsset,
  generateVariants,
} from "@/lib/ai/marketing-automation";
import { trackDashboardView } from "@/lib/domain/dashboardAnalytics";
import { useEffect, useState } from "react";

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (type: string, topic: string) => Promise<void>;
  loading: boolean;
}
function GenerateDialog({
  open,
  onClose,
  onGenerate,
  loading,
}: GenerateDialogProps) {
  const [type, setType] = useState("blog");
  const [topic, setTopic] = useState("AI marketing automation");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 space-y-4 shadow-xl">
        <header className="space-y-1">
          <h3 className="font-semibold text-lg">Generate Asset</h3>
          <p className="text-xs text-muted-foreground">
            Create multi-paragraph asset for campaigns.
          </p>
        </header>
        <div className="grid gap-3">
          <label className="text-xs font-medium flex flex-col gap-1">
            Type
            <select
              className="h-9 border rounded-md bg-background px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="blog">Blog</option>
              <option value="email">Email</option>
              <option value="ad">Ad Copy</option>
              <option value="landing">Landing</option>
            </select>
          </label>
          <label className="text-xs font-medium flex flex-col gap-1">
            Topic
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void onGenerate(type, topic);
            }}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface VariantDialogProps {
  open: boolean;
  base: string;
  onClose: () => void;
}
function VariantDialog({ open, base, onClose }: VariantDialogProps) {
  const [variants, setVariants] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      setVariants(generateVariants(base, 4));
    }
  }, [open, base]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 space-y-4 shadow-xl">
        <header className="space-y-1">
          <h3 className="font-semibold text-lg">Variants</h3>
          <p className="text-xs text-muted-foreground">
            Generated A/B options.
          </p>
        </header>
        <ul className="space-y-2 text-xs max-h-64 overflow-auto">
          {variants.map((v) => (
            <li key={v} className="p-2 rounded border bg-background/50">
              {v}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ToneDialogProps {
  open: boolean;
  content: string;
  onClose: () => void;
}
function ToneDialog({ open, content, onClose }: ToneDialogProps) {
  const [tone, setTone] = useState("formal");
  const [adjusted, setAdjusted] = useState("");
  useEffect(() => {
    if (open) {
      setAdjusted(adjustTone(content, tone));
    }
  }, [open, content, tone]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 space-y-4 shadow-xl">
        <header className="space-y-1">
          <h3 className="font-semibold text-lg">Tone Adjust</h3>
          <p className="text-xs text-muted-foreground">
            Refined tone output preview.
          </p>
        </header>
        <div className="flex items-center gap-2 text-xs">
          <span>Style:</span>
          <select
            className="h-8 border rounded px-2"
            value={tone}
            onChange={(e) => {
              setTone(e.target.value);
              setAdjusted(adjustTone(content, e.target.value));
            }}
          >
            <option value="formal">Formal</option>
            <option value="friendly">Friendly</option>
            <option value="bold">Bold</option>
            <option value="concise">Concise</option>
          </select>
        </div>
        <Textarea
          rows={10}
          value={adjusted}
          onChange={(e) => setAdjusted(e.target.value)}
          className="text-xs"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MarketingContentGenerationPage() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const { data: mock } = useMockDomainMetrics("marketing", true);
  interface MarketingMetric {
    key: string;
    label: string;
    value: number;
    delta: number;
    trend: number[];
    intent?: string;
  }
  interface MarketingRow {
    id: string;
    period: string;
    name?: string;
    channel?: string;
    impressions?: number;
    clicks?: number;
    leads?: number;
    spend?: number;
    revenue?: number;
    __provenance?: string;
    [k: string]: unknown;
  }
  interface MarketingLive {
    kpis: MarketingMetric[];
    rows: MarketingRow[];
    loading: boolean;
    addOptimistic: (row: MarketingRow) => void;
  }
  const data: MarketingLive = (
    live.kpis.length
      ? live
      : {
          kpis: mock?.kpis || [],
          rows: [],
          loading: false,
          addOptimistic: live.addOptimistic,
        }
  ) as MarketingLive;
  useEffect(() => {
    trackDashboardView("marketing");
  }, []);
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.uid || "dev-user";
  const teamId: string | undefined = (() => {
    const possible = (user as unknown as { teamId?: unknown })?.teamId;
    return typeof possible === "string" ? possible : undefined;
  })();
  const [genOpen, setGenOpen] = useState(false);
  const [varOpen, setVarOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastContent, setLastContent] = useState(
    "Our team achieved major milestone."
  );
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();

  // Provenance classification: if live KPIs loaded mark live else fallback
  useEffect(() => {
    if (live.loading) return;
    if (live.kpis.length) markLive();
    else markFallback();
  }, [live.loading, live.kpis, markLive, markFallback]);

  async function handleGenerate(type: string, topic: string) {
    try {
      setBusy("generate");
      live.addOptimistic({
        id: `tmp-${Date.now()}`,
        period: new Date().toISOString().slice(0, 7),
        name: `${type}:${topic.slice(0, 40)}`,
        channel: "content",
        impressions: 0,
        clicks: 0,
        leads: 0,
        spend: 0,
        revenue: 0,
        __provenance: "optimistic",
      });
      const res = await generateContentAsset(type, topic, userId, teamId);
      toast({ title: "Asset generated", description: res.id });
      setLastContent(topic + " " + res.body.slice(0, 80) + "...");
      setGenOpen(false);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Unknown error";
      toast({
        title: "Generation failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }
  function openVariants() {
    setVarOpen(true);
  }
  function openTone() {
    setToneOpen(true);
  }
  return (
    <FeatureGate
      feature="marketing_content_generation"
      requiredTier="enterprise"
      showUpgrade
    >
      <div className="space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Marketing Content Generation
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Multi-format asset generation with upcoming tone guardrails &
            compliance checks.
          </p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
        <ProvenanceLegend />
        <section className="grid gap-4 md:grid-cols-4">
          {data.kpis.map((k) => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={Number(k.value).toLocaleString()}
              delta={k.delta}
              deltaLabel="vs last period"
              trend={<TrendSparkline data={k.trend} />}
              intent={
                (k.intent ?? "neutral") as
                  | "neutral"
                  | "success"
                  | "warning"
                  | "danger"
                  | "accent"
              }
            />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Campaigns
          </h2>
          <LazyDataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "channel", header: "Channel" },
              { key: "impressions", header: "Impr." },
              { key: "ctr", header: "CTR %" },
              { key: "leads", header: "Leads" },
              { key: "roi", header: "ROI %" },
            ]}
            rows={live.rows}
            loading={live.loading}
            empty="No campaign data"
          />
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Content Actions
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard
              title="Generate Asset"
              desc="Create new copy or visual."
              action={() => setGenOpen(true)}
              label={busy === "generate" ? "Generating…" : "Generate"}
              disabled={!!busy}
            />
            <ActionCard
              title="Variant Testing"
              desc="Produce A/B variants."
              action={openVariants}
              label="Create"
              disabled={!!busy}
            />
            <ActionCard
              title="Tone Adjust"
              desc="Refine tone & style."
              action={openTone}
              label="Adjust"
              disabled={!!busy}
            />
          </div>
        </section>
        <GenerateDialog
          open={genOpen}
          onClose={() => setGenOpen(false)}
          onGenerate={handleGenerate}
          loading={busy === "generate"}
        />
        <VariantDialog
          open={varOpen}
          base={lastContent}
          onClose={() => setVarOpen(false)}
        />
        <ToneDialog
          open={toneOpen}
          content={lastContent}
          onClose={() => setToneOpen(false)}
        />
      </div>
    </FeatureGate>
  );
}
