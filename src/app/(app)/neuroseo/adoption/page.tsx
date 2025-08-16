"use client";
import { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from '@/components/tool-page-header';
import { composeToolHeaderBadges } from '@/lib/tool-badge-utils';
import { useProvenance } from '@/hooks/useProvenance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

interface HealthPayload { kpis?: any; alerts?: any[]; metrics?: any; }

export default function AdoptionDashboard() {
  const { provenance } = useProvenance();
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/health');
      const j = await r.json();
      setData(j);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);
  const crawlerPct = data?.kpis?.crawlerAggregateAdoptionPct ?? null;
  const smPct = data?.kpis?.semanticMapAggregateAdoptionPct ?? null;
  const classify = (v: number | null) => v == null ? '' : (v < 50 ? 'critical' : v < 80 ? 'warn' : 'ok');
  const statCard = (label: string, pct: number | null, help: string) => (
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{label}</CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-medium">{pct!=null? pct.toFixed(2)+"%" : loading? 'Loading…':'—'}</span></div><Progress value={pct||0} className={pct!=null? classify(pct)==='critical'? 'bg-red-200': classify(pct)==='warn'? 'bg-amber-200':'bg-green-200':''} /><p className="text-xs text-muted-foreground">{help}</p></CardContent></Card>
  );
  return (
    <FeatureGate feature="semantic_map" requiredTier="starter" showUpgrade>
      <main className="container mx-auto py-6 space-y-6">
        <ToolPageHeader title="Adoption KPIs" description="Monitoring aggregate read adoption for NeuralCrawler™ & SemanticMap™." badges={composeToolHeaderBadges('adoption-kpis', provenance)} showBreadcrumb />
        <div className="grid gap-4 md:grid-cols-2">
          {statCard('Crawler Aggregate Adoption', crawlerPct, 'Target ≥80%. Aggregate vs legacy neural crawler reads.')}
          {statCard('SemanticMap Aggregate Adoption', smPct, 'Target ≥80%. Aggregate vs legacy semantic map reads.')}
        </div>
      </main>
    </FeatureGate>
  );
}
