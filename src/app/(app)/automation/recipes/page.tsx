"use client";
import { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { createAutomationRecipe, listAutomationRecipes, updateAutomationRecipe, AutomationRecipe, defaultRecipeTemplate, listRecentAutomationRuns, countPendingEmails } from '@/lib/automation/recipes';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useHydration } from '@/components/HydrationContext';
import { useToast } from '@/hooks/use-toast';

const ACTIONS: { id: string; label: string; desc: string }[] = [
  { id: 'runNeuroSEOAnalysis', label: 'Run NeuroSEO Analysis', desc: 'Executes a fresh analysis with placeholder inputs' },
  { id: 'sendDigestEmail', label: 'Send Digest Email', desc: 'Enqueue generic digest email' },
  { id: 'generateContentRewrite', label: 'Generate Content Rewrite', desc: 'Create rewrite variants for up to 3 URLs' },
  { id: 'salesRefreshMetrics', label: 'Sales: Refresh Metrics Snapshot', desc: 'Store pipeline + win-rate snapshot' },
  { id: 'salesForecastSnapshot', label: 'Sales: Forecast Snapshot', desc: 'Persist lightweight forecast (pipeline * 0.8)' },
  { id: 'salesPipelineDigest', label: 'Sales: Pipeline Digest Email', desc: 'Email current pipeline / win-rate' },
  { id: 'financeRevenueSnapshot', label: 'Finance: Revenue Snapshot', desc: 'Store monthly revenue KPIs' },
  { id: 'financeInvoiceAgingDigest', label: 'Finance: Invoice Aging Digest', desc: 'Email counts by aging bucket' },
];

export default function AutomationRecipesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const hydrated = useHydration();
  const [recipes, setRecipes] = useState<AutomationRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [interval, setInterval] = useState(1440);
  const [selectedActions, setSelectedActions] = useState<string[]>(['runNeuroSEOAnalysis']);
  const [analysisUrls, setAnalysisUrls] = useState<string>('https://example.com');
  const [analysisKeywords, setAnalysisKeywords] = useState<string>('example');
  const [digestTo, setDigestTo] = useState<string>('digest@example.com');
  const [digestSubject, setDigestSubject] = useState<string>('NeuroSEO Digest');
  const [salesDigestTo, setSalesDigestTo] = useState<string>('sales-digest@example.com');
  const [financeAgingTo, setFinanceAgingTo] = useState<string>('finance-aging@example.com');
  const [range, setRange] = useState<'30d' | '90d' | 'ytd'>('30d');
  const [cronExpr, setCronExpr] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [runLogs, setRunLogs] = useState<Record<string, import('@/lib/automation/recipes').AutomationRunLog[]>>({});
  const [pendingEmails, setPendingEmails] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
  const list = await listAutomationRecipes(user.uid, (user as any)?.teamId);
        setRecipes(list);
        // Fetch run logs & pending emails for each recipe sequentially (small N expected)
        const logsMap: Record<string, import('@/lib/automation/recipes').AutomationRunLog[]> = {};
        const emailMap: Record<string, number> = {};
        for (const r of list) {
          try {
            logsMap[r.id!] = await listRecentAutomationRuns(r.id!, 5);
            emailMap[r.id!] = await countPendingEmails(r.id!);
          } catch { /* swallow */ }
        }
        setRunLogs(logsMap);
        setPendingEmails(emailMap);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const create = async () => {
    if (!user) return;
    try {
      setCreating(true);
      setValidationError('');
      if (cronExpr && interval) {
        setValidationError('Use either interval OR cron, not both.');
        return;
      }
  const tpl = defaultRecipeTemplate(user.uid, (user as any)?.teamId);
      tpl.name = newName || 'Automation Recipe';
      if (cronExpr.trim()) {
        tpl.schedule = { cron: cronExpr.trim() } as import('@/lib/automation/recipes').AutomationRecipe['schedule'];
      } else {
        tpl.schedule.intervalMinutes = interval;
      }
      tpl.actions = selectedActions as import('@/lib/automation/recipes').AutomationActionType[];
      tpl.actionConfigs = {
        runNeuroSEOAnalysis: {
          urls: analysisUrls.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,5),
          keywords: analysisKeywords.split(',').map(k=>k.trim()).filter(Boolean).slice(0,10)
        },
        sendDigestEmail: {
          to: digestTo,
          subject: digestSubject,
          urls: analysisUrls.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,5),
          keywords: analysisKeywords.split(',').map(k=>k.trim()).filter(Boolean).slice(0,10)
        },
        generateContentRewrite: {
          urls: analysisUrls.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,3),
          keywords: analysisKeywords.split(',').map(k=>k.trim()).filter(Boolean).slice(0,5)
  },
  salesRefreshMetrics: { range },
  salesForecastSnapshot: {},
  salesPipelineDigest: { to: salesDigestTo, range },
  financeRevenueSnapshot: {},
  financeInvoiceAgingDigest: { to: financeAgingTo },
      };
      const created = await createAutomationRecipe(tpl);
      setRecipes(r => [created, ...r]);
      setNewName('');
      toast({ title: 'Recipe created', description: created.name });
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: 'Create failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const toggleActive = async (r: AutomationRecipe) => {
    try {
      const updated = await updateAutomationRecipe(r.id!, { active: !r.active });
      setRecipes(list => list.map(x => x.id === r.id ? updated : x));
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: 'Update failed', description: err.message || 'Unknown error', variant: 'destructive' });
    }
  };

  const hydrationDisabled = !hydrated || loading || creating;

  return (
    <FeatureGate requiredTier="agency" feature="automation_recipes" showUpgrade>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation Recipes</h1>
          <p className="text-muted-foreground">Schedule recurring AI-driven operations.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create Recipe</CardTitle>
            <CardDescription>Define interval & select actions</CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Weekly NeuroSEO Digest" disabled={hydrationDisabled} />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Interval (minutes)</Label>
                  <Input type="number" min={5} value={interval} onChange={e => setInterval(Number(e.target.value))} disabled={hydrationDisabled || !!cronExpr.trim()} />
                  <p className="text-xs text-muted-foreground">1440 = daily, 10080 = weekly. Disabled if cron is set.</p>
                </div>
                <div className="space-y-2">
                  <Label>Cron Expression (optional)</Label>
                  <Input placeholder="m h * * * or @daily" value={cronExpr} onChange={e => setCronExpr(e.target.value)} disabled={hydrationDisabled} />
                  <p className="text-xs text-muted-foreground">Supports m h * * * plus @daily / @hourly. Use instead of interval.</p>
                </div>
                {validationError && <p className="text-xs text-destructive">{validationError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {ACTIONS.map(a => {
                    const checked = selectedActions.includes(a.id);
                    return (
                      <label key={a.id} className="flex items-start space-x-2 rounded border p-3 cursor-pointer hover:bg-muted/30">
                        <input type="checkbox" checked={checked} disabled={hydrationDisabled} onChange={() => setSelectedActions(prev => checked ? prev.filter(x => x !== a.id) : [...prev, a.id])} />
                        <span className="text-sm"><span className="font-medium">{a.label}</span><br/><span className="text-xs text-muted-foreground">{a.desc}</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {selectedActions.includes('runNeuroSEOAnalysis') && (
                <div className="space-y-2">
                  <Label>Analysis URLs (one per line)</Label>
                  <Textarea value={analysisUrls} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setAnalysisUrls(e.target.value)} rows={3} disabled={hydrationDisabled} />
                  <Label className="mt-2">Analysis Keywords (comma separated)</Label>
                  <Input value={analysisKeywords} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setAnalysisKeywords(e.target.value)} disabled={hydrationDisabled} />
                </div>
              )}
              {selectedActions.includes('sendDigestEmail') && (
                <div className="space-y-2">
                  <Label>Digest Recipient</Label>
                  <Input value={digestTo} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setDigestTo(e.target.value)} disabled={hydrationDisabled} />
                  <Label className="mt-2">Digest Subject</Label>
                  <Input value={digestSubject} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setDigestSubject(e.target.value)} disabled={hydrationDisabled} />
                </div>
              )}
              {selectedActions.includes('generateContentRewrite') && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Will generate rewrite variants for up to 3 URLs (placeholder content) using provided keywords.</p>
                </div>
              )}
              {(selectedActions.includes('salesRefreshMetrics') || selectedActions.includes('salesPipelineDigest')) && (
                <div className="space-y-2">
                  <Label>Sales Range</Label>
                  <select className="border rounded px-2 py-1 text-sm" value={range} disabled={hydrationDisabled} onChange={e => setRange(e.target.value as '30d'|'90d'|'ytd')}>
                    <option value="30d">Last 30d</option>
                    <option value="90d">Last 90d</option>
                    <option value="ytd">Year to Date</option>
                  </select>
                </div>
              )}
              {selectedActions.includes('salesPipelineDigest') && (
                <div className="space-y-2">
                  <Label>Sales Digest Recipient</Label>
                  <Input value={salesDigestTo} onChange={e=>setSalesDigestTo(e.target.value)} disabled={hydrationDisabled} />
                </div>
              )}
              {selectedActions.includes('financeInvoiceAgingDigest') && (
                <div className="space-y-2">
                  <Label>Finance Aging Digest Recipient</Label>
                  <Input value={financeAgingTo} onChange={e=>setFinanceAgingTo(e.target.value)} disabled={hydrationDisabled} />
                </div>
              )}
              <Button onClick={create} disabled={hydrationDisabled}>Create</Button>
            </CardContent>
        </Card>
        <Separator />
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Existing Recipes</h2>
          {recipes.length === 0 && <p className="text-sm text-muted-foreground">No recipes yet.</p>}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map(r => {
              const logs = runLogs[r.id!] || [];
              const pending = pendingEmails[r.id!] || 0;
              return (
                <Card key={r.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{r.name}</span>
                      <Switch checked={r.active} disabled={hydrationDisabled} onCheckedChange={() => toggleActive(r)} />
                    </CardTitle>
                    <CardDescription className="text-xs">{r.schedule.cron ? `Cron: ${r.schedule.cron}` : r.schedule.intervalMinutes ? `${r.schedule.intervalMinutes}m interval` : r.schedule.atHourUTC !== undefined ? `Daily @ ${r.schedule.atHourUTC}:00 UTC` : 'Custom'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2 flex-1">
                    <div>Actions: {r.actions.join(', ')}</div>
                    <div>Last Run: {r.lastRun ? r.lastRun.toLocaleString() : '—'}</div>
                    <div>Next Run: {r.nextRun ? r.nextRun.toLocaleString() : '—'}</div>
                    <div>Pending Emails: {pending}</div>
                    {logs.length > 0 && (
                      <div className="border-t pt-2 space-y-1">
                        <div className="font-medium text-muted-foreground/70">Recent Runs</div>
                        {logs.map(l => (
                          <div key={l.id} className="flex flex-col border rounded p-1 bg-muted/30">
                            <div className="flex justify-between"><span>{new Date(l.startedAt).toLocaleTimeString()}</span><span className={l.status==='ok' ? 'text-success-foreground' : l.status==='partial' ? 'text-warning-foreground' : 'text-destructive-foreground'}>{l.status}</span></div>
                            <div className="truncate">{l.actions.map((a)=>`${a.type}:${a.status}`).join(' | ')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
