"use client";
// Enterprise Marketing - Social Presence
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { Button } from '@/components/ui/button';
import { ActionCard } from '@/components/shared/ActionCard';
import { SkeletonOverlay } from '@/components/shared/SkeletonOverlay';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { schedulePost, optimizeCopy, connectSocialAccount, listSocialAccounts, fetchPlatformTrends } from '@/lib/ai/marketing-automation';
import { useAuth } from '@/context/AuthContext';
import { useMarketingCampaignMetrics } from '@/hooks/useMarketingCampaignMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { useProvenance } from '@/hooks/useProvenance';

interface PostDialogProps { open:boolean; onClose:()=>void; onSchedule:(c:string,channel:string,when:Date)=>Promise<void>; loading:boolean; }
function PostDialog({ open, onClose, onSchedule, loading }: PostDialogProps){
  const [content, setContent] = useState('Announcing our new AI-driven optimization suite.');
  const [channel, setChannel] = useState('linkedin');
  const [time, setTime] = useState<string>('');
  if(!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-xl border bg-card p-6 space-y-4 shadow-xl relative">
      <SkeletonOverlay active={loading} label="Scheduling" />
      <header className="space-y-1"><h3 className="font-semibold text-lg">Schedule Post</h3><p className="text-xs text-muted-foreground">Create AI-instrumented social post across channels.</p></header>
      <div className="space-y-2">
        <label className="text-xs font-medium flex flex-col gap-1">Channel<select className="bg-background border rounded-md h-9 px-2 text-sm" value={channel} onChange={e=> setChannel(e.target.value)}>
          <option value="linkedin">LinkedIn</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="x">X</option>
        </select></label>
        <label className="text-xs font-medium flex flex-col gap-1">Scheduled Time (optional)<Input type="datetime-local" value={time} onChange={e=> setTime(e.target.value)} /></label>
        <Textarea rows={6} value={content} onChange={e=> setContent(e.target.value)} className="text-xs" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button size="sm" onClick={()=> onSchedule(content, channel, time? new Date(time): new Date())} disabled={loading}>{loading? 'Scheduling…':'Schedule'}</Button>
      </div>
    </div>
  </div>;
}

interface OptimizeDialogProps { open:boolean; original:string; channel:string; onClose:()=>void; }
function OptimizeDialog({ open, original, channel, onClose }: OptimizeDialogProps){
  const [variant,setVariant] = useState<string>('');
  useEffect(()=> { if(open){ const r = optimizeCopy(original, channel); setVariant(r.variant); } }, [open, original, channel]);
  if(!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-xl border bg-card p-6 space-y-4 shadow-xl relative">
      <header className="space-y-1"><h3 className="font-semibold text-lg">Optimized Copy</h3><p className="text-xs text-muted-foreground">AI-enhanced based on platform heuristics.</p></header>
      <Textarea value={variant} onChange={e=> setVariant(e.target.value)} rows={8} className="text-xs" />
      <div className="flex justify-end"><Button size="sm" onClick={onClose}>Close</Button></div>
    </div>
  </div>;
}

interface SocialAccount { id:string; platform:string; handle:string }
interface AccountsPanelProps { accounts:SocialAccount[]; onConnect:(p:string,h:string)=>Promise<void>; connecting:boolean; }
function AccountsPanel({ accounts, onConnect, connecting }: AccountsPanelProps){
  const [platform,setPlatform] = useState('linkedin'); const [handle,setHandle] = useState('');
  return <div className="rounded-xl border p-4 space-y-3">
    <div className="flex items-center justify-between"><h3 className="text-sm font-medium">Connected Accounts</h3><span className="text-xs text-muted-foreground">{accounts.length}</span></div>
    <ul className="space-y-1 max-h-32 overflow-auto text-xs">
  {accounts.map(a=> <li key={a.id} className="flex items-center justify-between rounded bg-background/60 px-2 py-1 border text-[11px]"><span>{a.platform}:{a.handle}</span><span className="text-success-foreground">●</span></li>)}
      {!accounts.length && <li className="text-muted-foreground text-[11px]">No accounts connected</li>}
    </ul>
    <div className="flex gap-2 items-end">
      <select className="bg-background border rounded-md h-8 px-2 text-xs" value={platform} onChange={e=> setPlatform(e.target.value)}>
        <option value="linkedin">LinkedIn</option>
        <option value="instagram">Instagram</option>
        <option value="facebook">Facebook</option>
        <option value="x">X</option>
      </select>
      <Input placeholder="@handle" value={handle} onChange={e=> setHandle(e.target.value)} className="h-8 text-xs" />
      <Button size="sm" disabled={!handle || connecting} onClick={()=> onConnect(platform, handle)}>{connecting? 'Connecting…':'Connect'}</Button>
    </div>
  </div>;
}


export default function SocialPresencePage() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const mock = getMockMetrics('marketing');
  type CampaignMetrics = typeof live;
  const data: CampaignMetrics | { kpis: typeof mock.kpis; quotas: typeof mock.quotas; rows: any[]; loading:boolean } = (live.kpis.length ? live : { kpis: mock.kpis, quotas: mock.quotas, rows: [], loading:false });
  useEffect(() => { trackDashboardView('marketing'); }, []);
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.uid || 'dev-user';
  const teamId = (user as any)?.teamId;
  const [postOpen,setPostOpen]=useState(false);
  const [optOpen,setOptOpen]=useState(false);
  const [optChannel,setOptChannel]=useState('linkedin');
  const [optOriginal,setOptOriginal]=useState('We are launching a new feature.');
  const [busy,setBusy]=useState<string|null>(null);
  const [accounts,setAccounts]=useState<SocialAccount[]>([]);
  const [connecting,setConnecting]=useState(false);
  interface PlatformTrends { platform:string; hashtags:string[]; updatedAt:Date }
  const [trends,setTrends]=useState<PlatformTrends|null>(null);
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { if(live.loading) return; if(live.kpis.length) markLive(); else markFallback(); }, [live.loading, live.kpis, markLive, markFallback]);
  useEffect(()=> { (async ()=> { const list = await listSocialAccounts(userId, teamId); setAccounts(list); })(); }, [userId, teamId]);

  async function handleSchedule(content:string, channel:string, when:Date){
    try{ setBusy('schedule');
      live.addOptimistic({ id:'temp-'+Date.now(), period: new Date().toISOString().slice(0,7), name: content.slice(0,40), channel, impressions:0, clicks:0, leads:0, __provenance:'optimistic' } as any);
      await schedulePost({ content, channel, scheduledAt: when, userId, teamId }); toast({ title:'Post scheduled', description:`${channel} post queued.` }); setPostOpen(false);}catch(e){ const err = e as any; toast({ title:'Schedule failed', description:err?.message||'Unknown error', variant:'destructive'});} finally{ setBusy(null);} }
  function handleOptimize(){ setOptOpen(true); }
  async function handleConnect(p:string,h:string){ try{ setConnecting(true); const res= await connectSocialAccount(p as any, h, userId, teamId); toast({ title:'Account connected', description:`${res.platform}:${res.handle}`}); const list= await listSocialAccounts(userId, teamId); setAccounts(list);}catch(e){ const err = e as any; toast({ title:'Connect failed', description:err?.message||'Unknown error', variant:'destructive' }); } finally{ setConnecting(false); } }
  async function handleAnalyze(){ try{ setBusy('analyze'); const t = await fetchPlatformTrends('linkedin'); setTrends(t); toast({ title:'Trends fetched', description:t.hashtags.slice(0,3).join(' ') }); } catch(e){ const err = e as any; toast({ title:'Trend fetch failed', description:err?.message||'Unknown error', variant:'destructive' }); } finally{ setBusy(null); } }
  return (
    <FeatureGate feature="marketing_social_presence" requiredTier="enterprise" showUpgrade>
      <div className="space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Social Presence</h1>
          <p className="text-muted-foreground max-w-3xl">Multi-channel scheduling, engagement velocity & AI content optimization (pipeline forthcoming).</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
  <ProvenanceLegend />
        <AccountsPanel accounts={accounts} onConnect={handleConnect} connecting={connecting} />
        <section className="grid gap-4 md:grid-cols-4">
          {data.kpis.map(k => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={(k.intent ?? 'neutral') as 'neutral' | 'success' | 'warning' | 'danger' | 'accent'} />
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
  {'quotas' in data && data.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map(q => (
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Social Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard title="Schedule Post" desc="Queue cross-channel post." action={()=> setPostOpen(true)} label={busy==='schedule'? 'Scheduling…':'Schedule'} disabled={!!busy} />
            <ActionCard title="Optimize Copy" desc="AI adjust for channel tone." action={handleOptimize} label="Optimize" disabled={!!busy} />
            <ActionCard title="Analyze Trends" desc="Fetch latest engagement trend." action={handleAnalyze} label={busy==='analyze'? 'Analyzing…':'Analyze'} disabled={!!busy} />
          </div>
          {trends && <div className="text-xs rounded-md border p-3 bg-background/40 flex flex-wrap gap-2" aria-live="polite">{trends.hashtags.map(h=> <span key={h} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{h}</span>)}</div>}
        </section>
        <PostDialog open={postOpen} onClose={()=> setPostOpen(false)} onSchedule={handleSchedule} loading={busy==='schedule'} />
        <OptimizeDialog open={optOpen} original={optOriginal} channel={optChannel} onClose={()=> setOptOpen(false)} />
      </div>
    </FeatureGate>
  );
}
