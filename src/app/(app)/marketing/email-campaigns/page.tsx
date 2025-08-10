"use client";
// Enterprise Marketing - Email Campaigns
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { Button } from '@/components/ui/button';
import { ActionCard } from '@/components/shared/ActionCard';
import { SkeletonOverlay } from '@/components/shared/SkeletonOverlay';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createEmailCampaign, suggestSendTime, generateSubjectVariants } from '@/lib/ai/marketing-automation';
import { useAuth } from '@/context/AuthContext';
import { useMarketingCampaignMetrics } from '@/hooks/useMarketingCampaignMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

interface CampaignDialogProps { open:boolean; onClose:()=>void; onCreate:(subject:string,audience:number,body:string,when?:Date)=>Promise<void>; loading:boolean; }
function CampaignDialog({ open, onClose, onCreate, loading }: CampaignDialogProps){
  const [subject,setSubject]=useState('Unlock new SEO growth insights');
  const [audience,setAudience]=useState(5000);
  const [body,setBody]=useState('We are excited to share new growth levers...');
  const [time,setTime]=useState('');
  if(!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-xl border bg-card p-6 space-y-4 shadow-xl relative">
      <SkeletonOverlay active={loading} label="Creating" />
      <header className="space-y-1"><h3 className="font-semibold text-lg">Create Email Campaign</h3><p className="text-xs text-muted-foreground">Define audience & schedule.</p></header>
      <div className="grid gap-3 text-xs">
        <label className="flex flex-col gap-1 font-medium">Subject<Input value={subject} onChange={e=> setSubject(e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Audience Size<Input type="number" value={audience} onChange={e=> setAudience(Number(e.target.value)||0)} /></label>
        <label className="flex flex-col gap-1 font-medium">Send At (optional)<Input type="datetime-local" value={time} onChange={e=> setTime(e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium">Body<Textarea rows={8} value={body} onChange={e=> setBody(e.target.value)} className="text-xs" /></label>
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button><Button size="sm" onClick={()=> onCreate(subject,audience,body,time? new Date(time): undefined)} disabled={loading}>{loading? 'Creating…':'Create'}</Button></div>
    </div>
  </div>;
}

interface VariantDialogProps { open:boolean; base:string; onClose:()=>void; }
function VariantDialog({ open, base, onClose }: VariantDialogProps){
  const [variants,setVariants]=useState<string[]>([]);
  useEffect(()=> { if(open){ setVariants(generateSubjectVariants(base)); } }, [open, base]);
  if(!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-xl border bg-card p-6 space-y-4 shadow-xl relative">
      <header className="space-y-1"><h3 className="font-semibold text-lg">Subject Variants</h3><p className="text-xs text-muted-foreground">Generated AI subject suggestions.</p></header>
      <ul className="space-y-2 text-xs max-h-72 overflow-auto">{variants.map(v=> <li key={v} className="p-2 rounded border bg-background/50">{v}</li>)}</ul>
      <div className="flex justify-end"><Button size="sm" onClick={onClose}>Close</Button></div>
    </div>
  </div>;
}


export default function EmailCampaignsPage() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const mock = getMockMetrics('marketing');
  const data = (live.kpis.length ? live : { kpis: mock.kpis, rows: [], loading: false }) as any;
  useEffect(() => { trackDashboardView('marketing'); }, []);
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.uid || 'dev-user';
  const teamId = (user as any)?.teamId;
  const [campOpen,setCampOpen]=useState(false);
  const [varOpen,setVarOpen]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);
  const [lastSubject,setLastSubject]=useState('Unlock new SEO growth insights');
  const [sendTime,setSendTime]=useState<string|null>(null);

  async function handleCreate(subject:string,audience:number,body:string,when?:Date){
    try{ setBusy('create'); live.addOptimistic({ id:'temp-'+Date.now(), name: subject.slice(0,60), channel:'email', impressions:0, clicks:0, leads:0, roi:0 }); const res= await createEmailCampaign({ subject, audience, userId, teamId, sendAt: when }); toast({ title:'Campaign created', description:`Impr: ${res.impressions} Leads:${res.leads}`}); setLastSubject(subject); setCampOpen(false);}catch(e:any){ toast({ title:'Create failed', description:e.message||'Unknown error', variant:'destructive'});} finally{ setBusy(null);} }
  async function handleOptimize(){ try{ setBusy('opt'); const rec = await suggestSendTime(userId, teamId); setSendTime(`${rec.hour}:00`); toast({ title:'Optimal time', description:`Recommend ${rec.hour}:00`}); }catch(e:any){ toast({ title:'Optimization failed', description:e.message||'Unknown error', variant:'destructive'});} finally{ setBusy(null);} }
  function openVariants(){ setVarOpen(true); }
  return (
    <FeatureGate feature="marketing_email_campaigns" requiredTier="enterprise" showUpgrade>
      <div className="space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Email Campaigns</h1>
          <p className="text-muted-foreground max-w-3xl">Sequence generation, deliverability & engagement optimization (AI optimizer upcoming).</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
        <section className="grid gap-4 md:grid-cols-4">
          {data.kpis.map((k:any) => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
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
        {data.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map((q: any) => (
                <div key={q.key} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{q.label}</span>
                    <span className="text-xs text-muted-foreground">{q.used}/{q.limit}</span>
                  </div>
                  <QuotaBar used={q.used} limit={q.limit} />
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Campaign Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard title="Create Campaign" desc="Start new multi-touch sequence." action={()=> setCampOpen(true)} label={busy==='create'? 'Creating…':'Start'} disabled={!!busy} />
            <ActionCard title="Optimize Send Time" desc="Run AI timing model." action={handleOptimize} label={busy==='opt'? 'Optimizing…':'Optimize'} disabled={!!busy} />
            <ActionCard title="Generate Content" desc="Produce variant subject lines." action={openVariants} label="Generate" disabled={!!busy} />
          </div>
          {sendTime && <p className="text-[11px] text-muted-foreground">Suggested send window: {sendTime}</p>}
        </section>
        <CampaignDialog open={campOpen} onClose={()=> setCampOpen(false)} onCreate={handleCreate} loading={busy==='create'} />
        <VariantDialog open={varOpen} base={lastSubject} onClose={()=> setVarOpen(false)} />
      </div>
    </FeatureGate>
  );
}
