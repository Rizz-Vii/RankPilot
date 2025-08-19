// src/app/(app)/insights/page.tsx
"use client";

// Prefer real AI flow; fallback to stub util if needed
import { generateInsights as generateInsightsFlow } from "@/ai/flows/generate-insights";
import { canAccessFeature } from "@/lib/access-control";
import type { GenerateInsightsOutput } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Lightbulb, RefreshCw, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ToolPageHeader } from "@/components/tool-page-header";
import styles from "./insights.module.css";

// Activity & preview interfaces (narrow, avoids unknown property accesses)
interface ActivityDetails { keywords?: string[] | string; url?: string; urls?: string[]; [k: string]: any }
interface UserActivity { type: string; tool: string; details: ActivityDetails; resultsSummary?: string }
interface PreviewActivity { tool: string; type: string; [k: string]: unknown }

export default function InsightsPage() {
  const { user, activities, loading: authLoading, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  type Insight = GenerateInsightsOutput["insights"][number];
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamSupported, setStreamSupported] = useState(true);
  // Streaming enhancement state
  const [activityPreview, setActivityPreview] = useState<PreviewActivity[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [streamedActivities, setStreamedActivities] = useState(0);
  const [streamedInsights, setStreamedInsights] = useState(0);
  const [expectedInsights, setExpectedInsights] = useState<number | null>(null);
  const [showStreamPanel, setShowStreamPanel] = useState(true);

  // Tier-based max insights & cache TTL
  const tier = (profile?.subscriptionTier || profile?.role || 'free').toLowerCase();
  const tierLimits: Record<string, number> = { free: 3, starter: 5, agency: 8, enterprise: 12, admin: 12 };
  const maxInsights = tierLimits[tier] ?? 3;
  const cacheKey = `insights-cache-${user?.uid}`;
  const cacheTTLms = 10 * 60 * 1000; // 10 min

  const simplifiedActivities = useMemo<UserActivity[]>(() => activities.map((a: any) => ({
    type: String(a?.type || ''),
    tool: String(a?.tool || ''),
    details: ((): ActivityDetails => { const d = a?.details; return d && typeof d === 'object' ? d as ActivityDetails : {}; })(),
    resultsSummary: a?.resultsSummary ? String(a.resultsSummary) : undefined,
  })), [activities]);

  const derivedKeywords = useMemo(() => {
    const kwSet = new Set<string>();
    simplifiedActivities.forEach(a => {
      if (a.details?.keywords) {
        (Array.isArray(a.details.keywords) ? a.details.keywords : [a.details.keywords]).forEach((k: string) => kwSet.add(String(k).toLowerCase()));
      }
      if (a.resultsSummary) {
        const matches = String(a.resultsSummary).match(/#[a-z0-9-]+/gi) || [];
        matches.forEach(m => kwSet.add(m.replace('#','')));
      }
    });
    const list = Array.from(kwSet).slice(0, 15);
    return list.length ? list : ['seo','content','optimization'];
  }, [simplifiedActivities]);

  const derivedUrls = useMemo(() => {
    const urlSet = new Set<string>();
    simplifiedActivities.forEach(a => {
      if (a.details?.url) urlSet.add(a.details.url);
      if (Array.isArray(a.details?.urls)) (a.details.urls as string[]).forEach(u => urlSet.add(u));
    });
    const list = Array.from(urlSet).slice(0, 5);
    return list.length ? list : ['https://example.com'];
  }, [simplifiedActivities]);

  // cache helpers moved into fetchInsights to avoid stale dependency warnings for
  // react-hooks/exhaustive-deps (they referenced component-scope values like user,
  // cacheKey, maxInsights and would force fetchInsights to change every render).

  const saveCache = (data: GenerateInsightsOutput) => {
    try {
      if (!user) return;
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {}
  };

  const fetchInsights = useCallback(async (opts: { force?: boolean } = {}) => {
    const loadFromCacheLocal = () => {
      try {
        if (!user) return false;
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > cacheTTLms) return false;
        setInsights(parsed.data.insights.slice(0, maxInsights));
        setLastGenerated(new Date(parsed.timestamp));
        return true;
      } catch { return false; }
    };
    const saveCacheLocal = (data: GenerateInsightsOutput) => {
      try {
        if (!user) return;
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
      } catch {}
    };
    if (authLoading || !user) { setIsLoading(false); return; }
    setError(null);
    if (!opts.force && loadFromCacheLocal()) { setIsLoading(false); return; }
    if (simplifiedActivities.length === 0) { setInsights([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      let result: GenerateInsightsOutput | null = null;
      try {
        const aiResult = await generateInsightsFlow({ activities: simplifiedActivities });
        // Normalize to expected GenerateInsightsOutput shape (if flow returns partial)
        const raw: any = aiResult as any;
        const normalizedInsights: GenerateInsightsOutput['insights'] = Array.isArray(raw?.insights) ? raw.insights.map((i: any) => ({
          id: String(i.id || Math.random().toString(36).slice(2)),
          title: String(i.title || 'Untitled Insight'),
          description: String(i.description || ''),
          category: String(i.category || 'general'),
          priority: String(i.priority || 'low'),
          estimatedImpact: typeof i.estimatedImpact === 'number' ? i.estimatedImpact : 0,
          actionItems: Array.isArray(i.actionItems) ? i.actionItems.map((x: any) => String(x)) : [],
          metrics: typeof i.metrics === 'object' && i.metrics ? i.metrics : undefined,
          actionLink: typeof i.actionLink === 'string' ? i.actionLink : undefined,
          actionText: typeof i.actionText === 'string' ? i.actionText : undefined,
        })) : [];
        const normalized: GenerateInsightsOutput = {
          insights: normalizedInsights,
          summary: typeof raw?.summary === 'string' ? raw.summary : `Generated ${normalizedInsights.length} insights`,
          score: typeof raw?.score === 'number' ? raw.score : 0,
        };
        result = normalized;
      } catch (e) {
        console.warn('AI flow failed', e);
      }
      if (!result) {
        setInsights([]);
        setLastGenerated(new Date());
        return;
      }
      saveCacheLocal(result);
      setInsights(result.insights.slice(0, maxInsights));
      setLastGenerated(new Date());
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Failed to generate insights');
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, simplifiedActivities, maxInsights, cacheTTLms, generateInsightsFlow]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const priorityColors: Record<string, string> = {
    high: "bg-destructive",
    medium: "bg-warning",
    low: "bg-success",
  };

  const relativeGenerated = useMemo(() => {
    if (!lastGenerated) return null;
    const diff = Date.now() - lastGenerated.getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60); if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs/24); return `${days}d ago`;
  }, [lastGenerated]);

  const handleRefresh = async () => { setRefreshing(true); await fetchInsights({ force: true }); setRefreshing(false); };
  const abortRef = (typeof window !== 'undefined') ? (window as any)._insightsAbortRef || { current: null as AbortController | null } : { current: null as AbortController | null };
  if (typeof window !== 'undefined') (window as any)._insightsAbortRef = abortRef;

  const startStream = async () => {
    if (!user) return;
    if (abortRef.current) { abortRef.current.abort(); }
    setStreaming(true); setError(null); setInsights([]);
  setActivityPreview([]); setTotalActivities(0); setStreamedActivities(0); setStreamedInsights(0); setExpectedInsights(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/insights/stream', { headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal });
      if (!resp.ok || !resp.body) { throw new Error('Stream init failed'); }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
  const newInsights: Insight[] = [];
      const push = () => setInsights([...newInsights].slice(0, maxInsights));
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const raw of parts) {
          if (!raw.startsWith('data:')) continue;
            const dataStr = raw.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') { break; }
            try {
              const evt: any = JSON.parse(dataStr);
              if (evt?.type === 'init') {
                setTotalActivities(typeof evt.activityCount === 'number' ? evt.activityCount : 0);
              } else if (evt?.type === 'activity_batch' && Array.isArray(evt.batch)) {
                setStreamedActivities(prev => prev + evt.batch.length);
                setActivityPreview(prev => [...prev, ...(evt.batch as PreviewActivity[])].slice(0, 8));
              } else if (evt?.type === 'insight' && evt.insight) {
                newInsights.push(evt.insight as Insight); push();
                setStreamedInsights(prev => prev + 1);
              } else if (evt?.type === 'final') {
                if (typeof evt.total === 'number') setExpectedInsights(evt.total);
              } else if (evt?.type === 'error') { setError(typeof evt.message === 'string' ? evt.message : 'Stream error'); }
            } catch { /* ignore parse */ }
        }
      }
    } catch (e) {
      const err: any = e; if (err?.name !== 'AbortError') { setError(err?.message || 'Streaming failed'); setStreamSupported(false); }
    } finally { setStreaming(false); }
  };
  const stopStream = () => { if (abortRef.current) abortRef.current.abort(); setStreaming(false); };

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const streamProgressPct = useMemo(() => {
    if (!streaming && !streamedActivities && !streamedInsights) return 0;
    const ingestFrac = totalActivities ? Math.min(1, streamedActivities / totalActivities) : 0;
    const insightFrac = expectedInsights ? Math.min(1, streamedInsights / expectedInsights) : (streamedInsights ? 0.5 : 0);
    const combined = (ingestFrac * 0.4) + (insightFrac * 0.6);
    return Math.min(100, Math.round(combined * 100));
  }, [streaming, streamedActivities, totalActivities, streamedInsights, expectedInsights]);

  return (
    <main className="container mx-auto py-6 max-w-4xl" data-testid="insights-page">
      <ToolPageHeader
        title="Actionable Insights"
        description="AI-generated recommendations based on your recent activity."
        badges={[{ label: "AI", variant: "outline", className: "text-primary border-primary/40" }]}
        showBreadcrumb
      />

  <div className="flex items-center justify-between mb-4" aria-live="polite">
        <div className="text-xs text-muted-foreground">
          {relativeGenerated ? `Last generated ${relativeGenerated}` : isLoading ? 'Generating…' : 'Ready'}
          {` • Showing up to ${maxInsights} insights (tier: ${tier})`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={isLoading || refreshing} onClick={() => void handleRefresh()} data-testid="refresh-insights">
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </Button>
          {streamSupported && (
    <Button size="sm" variant={streaming ? 'destructive' : 'secondary'} aria-pressed={streaming} onClick={streaming ? stopStream : () => void startStream()} data-testid="stream-toggle">
  <Radio className={`h-4 w-4 mr-1 ${streaming ? 'animate-pulse text-destructive-foreground motion-safe:animate-pulse' : ''}`} aria-hidden="true" />
              {streaming ? 'Stop Stream' : 'Live Stream'}
            </Button>
          )}
        </div>
      </div>

      {streaming && (
        <div className="mb-6" data-testid="stream-progress" aria-live="polite" aria-busy={streaming}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium tracking-wide" role="status" aria-live="polite">LIVE</span>
              <span className="text-xs text-muted-foreground" id="stream-status">Generating insights… {streamProgressPct}% complete</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setShowStreamPanel(v => !v)} data-testid="toggle-stream-panel">
              {showStreamPanel ? 'Hide' : 'Show'}
            </Button>
          </div>
          <div className="h-2 w-full rounded bg-muted overflow-hidden mb-3" role="progressbar" aria-label="Streaming insight generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={streamProgressPct} aria-describedby="stream-status">
            <div className={`h-full transition-all motion-safe:duration-700 ${styles.animatedBar}`} style={{ width: `${streamProgressPct}%` }} />
          </div>
          {showStreamPanel && (
            <div className="space-y-3 p-3 rounded-md border border-border/60 bg-background/60 backdrop-blur-sm transition-all ${styles.collapsibleShadow}">
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded bg-muted/40 px-2 py-1 flex flex-col" data-testid="stat-activities">
                  <span className="text-muted-foreground uppercase tracking-wide">Activities</span>
                  <span className="font-medium tabular-nums">{streamedActivities}/{totalActivities || '—'}</span>
                </div>
                <div className="rounded bg-muted/40 px-2 py-1 flex flex-col" data-testid="stat-insights">
                  <span className="text-muted-foreground uppercase tracking-wide">Insights</span>
                  <span className="font-medium tabular-nums">{streamedInsights}{expectedInsights !== null ? `/${expectedInsights}` : ''}</span>
                </div>
                <div className="rounded bg-muted/40 px-2 py-1 flex flex-col" data-testid="stat-phase">
                  <span className="text-muted-foreground uppercase tracking-wide">Phase</span>
                  <span className="font-medium">{streamedActivities < totalActivities ? 'Ingesting' : 'Generating'}</span>
                </div>
              </div>
              {activityPreview.length > 0 && (
                <div className="rounded border border-border/40 p-3 bg-background/50" data-testid="activity-preview">
                  <p className="text-[11px] font-medium mb-2 text-muted-foreground flex items-center justify-between">
                    <span>Recent Activity Context</span>
                    <span className="text-[10px]">{activityPreview.length} shown</span>
                  </p>
                  <ul className="space-y-1 max-h-28 overflow-auto text-[11px] pr-1">
                    {activityPreview.map((a,i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/70 flex-shrink-0" />
                        <span className="truncate"><strong>{a.tool}</strong>: {a.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive font-headline flex items-center gap-2">
              <AlertTriangle /> Error Generating Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!error && !isLoading && insights.length === 0 && (
        <Card data-testid="insights-empty">
          <CardContent className="p-10 text-center space-y-4">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-headline mb-1">No Insights Yet</h3>
              <p className="font-body text-muted-foreground text-sm max-w-md mx-auto">
                Run a keyword analysis, content brief, or competitor scan. We need at least one activity to build context.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm" variant="secondary"><Link href="/keyword-tool">Keyword Tool</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/content-brief">Content Brief</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link href="/competitors">Competitors</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && !isLoading && insights.length > 0 && (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {insights.map((insight, idx) => (
            <motion.div key={insight.id} variants={itemVariants} data-testid={`insight-${idx}`}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline">
                      {insight.title}
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className={`h-3 w-3 rounded-full ${priorityColors[insight.priority.toLowerCase()] || 'bg-muted'}`}
                          ></div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{insight.priority} Priority • Impact {insight.estimatedImpact}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription>
                    <Badge variant="outline" className="mr-2">
                      {insight.category}
                    </Badge>
                    Impact:{" "}
                    <Badge variant="secondary">{insight.estimatedImpact}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-body text-muted-foreground">
                    {insight.description}
                  </p>
                  {insight.actionItems && insight.actionItems.length > 0 && (
                    <ul className="mt-4 space-y-1 text-xs list-disc pl-4" data-testid={`insight-${idx}-actions`}>
                      {insight.actionItems.map(ai => <li key={ai}>{ai}</li>)}
                    </ul>
                  )}
                  {insight.metrics && (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]" data-testid={`insight-${idx}-metrics`}>
                      {Object.entries(insight.metrics).map(([k,v]) => (
                        <div key={k} className="flex justify-between rounded bg-muted/50 px-2 py-1">
                          <span className="uppercase tracking-wide text-muted-foreground">{k}</span>
                          <span className="font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                {insight.actionLink && insight.actionText && (
                  <CardFooter>
                    <Button asChild>
                      <Link href={insight.actionLink}>
                        {insight.actionText}{" "}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
      {isLoading && (
        <div className="space-y-3" data-testid="insights-skeletons" aria-label="Loading insights">
          {Array.from({ length: 4 }).map((_,i) => (
            <Skeleton key={i} shimmer className="h-32 w-full" />
          ))}
        </div>
      )}
    </main>
  );
}
