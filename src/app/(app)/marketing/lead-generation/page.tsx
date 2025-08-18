"use client";
// Enterprise Marketing - Lead Generation
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { useToast } from '@/hooks/use-toast';
import { importLeads, scoreLeads, routeLeads } from '@/lib/ai/marketing-automation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ActionCard } from '@/components/shared/ActionCard';
import { SkeletonOverlay } from '@/components/shared/SkeletonOverlay';
import { useMarketingCampaignMetrics } from '@/hooks/useMarketingCampaignMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { useProvenance } from '@/hooks/useProvenance';

interface ImportDialogProps { open: boolean; onClose: ()=>void; onImport:(raw:string)=>Promise<void>; loading:boolean; }
function ImportDialog({ open, onClose, onImport, loading }: ImportDialogProps){
  const [raw,setRaw] = useState('Acme Corp\nGlobex\nInitech');
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 space-y-4 shadow-xl relative">
        <SkeletonOverlay active={loading} label="Importing" />
        <header className="space-y-1"><h3 className="font-semibold text-lg">Import Leads</h3><p className="text-xs text-muted-foreground">Paste newline separated company or contact names (max 500).</p></header>
        <Textarea value={raw} onChange={e=> setRaw(e.target.value)} rows={8} className="text-xs" />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={()=> onImport(raw)} disabled={loading}>{loading? 'Importing…':'Import'}</Button>
        </div>
      </div>
    </div>
  );
}

export default function LeadGenerationPage() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const mock = getMockMetrics('marketing');
  interface MarketingMetric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: string }
  interface MarketingLive { kpis: MarketingMetric[]; rows: any[]; loading: boolean; addOptimistic?: (row: any)=>void }
  const data: MarketingLive = (live.kpis.length ? live : { kpis: mock.kpis, rows: [], loading:false, addOptimistic: live.addOptimistic }) as MarketingLive;
  useEffect(() => { trackDashboardView('marketing'); }, []);
  const { toast } = useToast();
  // Auth scoping placeholder – assume hook exists globally. Fallback to anon if not present.
  const userId = 'dev-user';
  const teamId = undefined;
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { if(live.loading) return; if(live.kpis.length) markLive(); else markFallback(); }, [live.loading, live.kpis, markLive, markFallback]);

  async function handleImport(raw: string){
    try{
      setBusy('import');
      const countPromise = importLeads(raw, userId, teamId);
      // optimistic synthetic row (approx leads count estimated by lines)
      const est = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).length;
      if(est){
        live.addOptimistic({ id: `tmp-${Date.now()}`, period: new Date().toISOString().slice(0,7), name: `Lead Import (${est})`, channel:'lead-gen', impressions:0, clicks:0, leads: est, spend:0, revenue:0, __provenance:'optimistic' } as any);
      }
      await countPromise;
      toast({ title:'Leads imported', description:'Your leads were added and will appear in metrics shortly.' });
      setImportOpen(false);
    }catch(e:unknown){ toast({ title:'Import failed', description:(e instanceof Error ? e.message : String(e)) || 'Unknown error', variant:'destructive' }); }
    finally{ setBusy(null); }
  }
  async function handleScore(){
    try{ setBusy('score');
      live.addOptimistic({ id: `tmp-${Date.now()}`, period: new Date().toISOString().slice(0,7), name: 'Lead Score', channel:'lead-gen', impressions:0, clicks:0, leads:0, spend:0, revenue:0, __provenance:'optimistic' } as any);
      const res = await scoreLeads(userId, teamId); toast({ title:'Scoring complete', description:`Updated ${res.updated} leads.` }); }
    catch(e:unknown){ toast({ title:'Scoring failed', description:(e instanceof Error ? e.message : String(e)) || 'Unknown error', variant:'destructive' }); }
    finally{ setBusy(null); }
  }
  async function handleRoute(){
    try{ setBusy('route');
      live.addOptimistic({ id: `tmp-${Date.now()}`, period: new Date().toISOString().slice(0,7), name: 'Lead Route', channel:'lead-gen', impressions:0, clicks:0, leads:0, spend:0, revenue:0, __provenance:'optimistic' } as any);
      const res = await routeLeads(userId, teamId); toast({ title:'Routing complete', description:`Routed ${res.routed} leads.` }); }
    catch(e:unknown){ toast({ title:'Routing failed', description:(e instanceof Error ? e.message : String(e)) || 'Unknown error', variant:'destructive' }); }
    finally{ setBusy(null); }
  }
  return (
    <FeatureGate feature="marketing_lead_generation" requiredTier="enterprise" showUpgrade>
      <div className="space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Lead Generation</h1>
          <p className="text-muted-foreground max-w-3xl">Capture, enrichment & qualification flows with AI automation.</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
  <ProvenanceLegend />
        <section className="grid gap-4 md:grid-cols-4">
          {data.kpis.map((k) => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={k.value.toLocaleString()}
              delta={k.delta}
              deltaLabel="vs last period"
              trend={<TrendSparkline data={k.trend} />}
              intent={(k.intent ?? 'neutral') as 'neutral'|'success'|'warning'|'danger'|'accent'}
            />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Campaigns</h2>
          <LazyDataTable
            columns={[{ key:'name', header:'Name' }, { key:'channel', header:'Channel' }, { key:'impressions', header:'Impr.' }, { key:'ctr', header:'CTR %' }, { key:'leads', header:'Leads' }, { key:'roi', header:'ROI %' }]}
            rows={live.rows}
            loading={live.loading}
            empty="No campaign data"
          />
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lead Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard title="Import List" desc="Bulk import + enrich leads." action={()=> setImportOpen(true)} label={busy==='import'? 'Working…':'Import'} disabled={!!busy} />
            <ActionCard title="Score Leads" desc="Run AI scoring model." action={handleScore} label={busy==='score'? 'Scoring…':'Score'} disabled={!!busy} />
            <ActionCard title="Route Leads" desc="Distribute to sales teams." action={handleRoute} label={busy==='route'? 'Routing…':'Route'} disabled={!!busy} />
          </div>
        </section>
        <ImportDialog open={importOpen} onClose={()=> setImportOpen(false)} onImport={handleImport} loading={busy==='import'} />
      </div>
    </FeatureGate>
  );
}
