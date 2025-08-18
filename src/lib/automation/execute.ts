// Server-only execution utilities for automation recipes
import { Timestamp, addDoc, collection, doc, getDocs, query, updateDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InvoiceRecord } from '@/lib/finance/derive-subscription-events';
import { AutomationRunResult, AutomationActionType, computeNextRun, listAutomationRecipes, updateAutomationRecipe } from './recipes';

// Helpers
const safeMsg = (e: unknown): string => (typeof e === 'string' ? e : (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') ? (e as any).message : 'Unknown error');
function asCfg<T extends keyof ActionConfigMap>(cfg: ActionConfigMap | undefined, key: T): ActionConfigMap[T] | undefined {
    return cfg?.[key] as ActionConfigMap[T] | undefined;
}
import { fetchRewriteSourceContents } from './content-fetch';

// Execute due automation recipes (server context)
// Shape for optional per-action configuration stored on recipe.actionConfigs
interface ActionConfigMap {
    runNeuroSEOAnalysis?: { urls?: string[]; keywords?: string[] };
    sendDigestEmail?: { to?: string; subject?: string; urls?: string[]; keywords?: string[] };
    generateContentRewrite?: { urls?: string[]; keywords?: string[] };
    salesRefreshMetrics?: { range?: '30d' | '90d' | 'ytd' };
    salesForecastSnapshot?: Record<string, unknown>; // no custom fields yet
    salesPipelineDigest?: { to?: string; range?: '30d' | '90d' | 'ytd'; urls?: string[]; keywords?: string[] };
    financeRevenueSnapshot?: Record<string, unknown>;
    financeInvoiceAgingDigest?: { to?: string };
    financeAccountingSeedSampleJournals?: Record<string, unknown>;
    financeAccountingGeneratePnL?: Record<string, unknown>;
    financeAccountingGenerateBalanceSheet?: Record<string, unknown>;
    financeAccountingReconcile?: Record<string, unknown>;
    [k: string]: unknown; // forward compatibility
}

interface AutomationRecipeLike {
    id?: string;
    teamId?: string | null;
    userId: string;
    active?: boolean;
    nextRun?: Date | null;
    actions: AutomationActionType[];
    actionConfigs?: ActionConfigMap;
}

// Lightweight shapes for dynamic Firestore docs (avoid storing derived ratios):
interface SalesDealDoc { status?: string; amount?: number; }

// We unify invoice handling with InvoiceRecord (finance domain) and add optional paidAt/dueAt Date fields for automation analytics.
type NormalizedInvoice = InvoiceRecord & { paidAt?: Date; dueAt?: Date };

// Strict YYYY-MM (01-12) validation; fallback to raw slice or current period for malformed inputs.
const PERIOD_REGEX = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

function normalizeInvoice(raw: unknown): NormalizedInvoice | null {
    const r = raw as any;
    let period: string;
    if (typeof r?.period === 'string') {
        if (PERIOD_REGEX.test(r.period)) period = r.period;
        else period = r.period.slice(0, 7);
    } else {
        period = new Date().toISOString().slice(0, 7);
    }
    if (!PERIOD_REGEX.test(period)) return null; // discard unrecoverable malformed periods
    const status: string = typeof r?.status === 'string' ? r.status : 'unknown';
    const amount: number = typeof r?.amount === 'number' ? r.amount : 0;
    const paidAt: Date | undefined = r?.paidAt?.toDate && typeof r.paidAt.toDate === 'function' ? r.paidAt.toDate() : undefined;
    const dueAt: Date | undefined = r?.dueAt?.toDate && typeof r.dueAt.toDate === 'function' ? r.dueAt.toDate() : undefined;
    return { userId: typeof r?.userId === 'string' ? r.userId : 'unknown', period, status: status as any, amount, paidAt, dueAt };
}

export async function runDueAutomationRecipes(userId: string, teamId?: string) {
    const recipes = await listAutomationRecipes(userId, teamId);
    const now = new Date();
    const due = recipes.filter(r => r.active && r.nextRun && r.nextRun <= now) as AutomationRecipeLike[];
    const results: AutomationRunResult[] = [];
    for (const recipe of due) {
        const started = new Date();
        const actionsResults: AutomationRunResult['actions'] = [];
        for (const action of recipe.actions) {
            try {
                const cfg = asCfg(recipe.actionConfigs, action as keyof ActionConfigMap);
                if (action === 'runNeuroSEOAnalysis') {
                    const { NeuroSEOSuite } = await import('@/lib/neuroseo');
                    const urls: string[] = Array.isArray((cfg as any)?.urls) && (cfg as any).urls.length ? (cfg as any).urls : ['https://example.com'];
                    const keywords: string[] = Array.isArray((cfg as any)?.keywords) && (cfg as any).keywords.length ? (cfg as any).keywords : ['example'];
                    await new NeuroSEOSuite().runAnalysis({ urls, targetKeywords: keywords, analysisType: 'comprehensive', userPlan: 'agency', userId });
                    actionsResults.push({ type: action, status: 'ok' });
                } else if (action === 'sendDigestEmail') {
                    const to: string = (cfg as any)?.to || 'digest@example.com';
                    const subject = (cfg as any)?.subject || 'NeuroSEO Digest';
                    const body = `Automated NeuroSEO digest generated at ${new Date().toISOString()}\nURLs: ${(((cfg as any)?.urls) || ['https://example.com']).join(', ')}\nKeywords: ${(((cfg as any)?.keywords) || ['example']).join(', ')}`;
                    try { await addDoc(collection(db, 'emailQueue'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, to, subject, body, status: 'pending', createdAt: Timestamp.fromDate(new Date()) }); actionsResults.push({ type: action, status: 'ok', message: 'Digest enqueued' }); } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'generateContentRewrite') {
                    try {
                        const { RewriteGenEngine } = await import('@/lib/neuroseo/rewrite-gen');
                        const engine = new RewriteGenEngine();
                        const urls: string[] = Array.isArray((cfg as any)?.urls) && (cfg as any).urls.length ? (cfg as any).urls.slice(0, 3) : ['https://example.com'];
                        const sourceMap = await fetchRewriteSourceContents(urls, { max: 3, deterministicFallback: true });
                        const batchId = await addDoc(collection(db, 'rewriteBatches'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, createdAt: Timestamp.fromDate(new Date()), urlCount: urls.length, status: 'processing' });
                        for (const url of urls) {
                            const originalContent = sourceMap[url] || `Placeholder content for ${url}`;
                            const analysis = await engine.generateRewrites({
                                originalContent,
                                targetKeywords: (((cfg as any)?.keywords) || ['example']).slice(0, 5),
                                tone: 'professional', audience: 'general', contentType: 'article',
                                goals: [{ type: 'readability', target: 60, priority: 'medium', description: 'Improve readability' }],
                                constraints: [{ type: 'preserve_facts', value: true, importance: 'high' }],
                                seoRequirements: { primaryKeyword: (((cfg as any)?.keywords)?.[0]) || 'example', secondaryKeywords: (((cfg as any)?.keywords) || []).slice(1, 4), targetLength: { min: 300, max: 1200 }, readabilityScore: 50, headingStructure: true, metaOptimization: false, internalLinks: 2, externalLinks: 2 }
                            });
                            await addDoc(collection(db, 'rewriteVariants'), { batchId: batchId.id, url, userId, teamId: recipe.teamId || null, recipeId: recipe.id!, analysis });
                        }
                        await updateDoc(doc(db, 'rewriteBatches', batchId.id), { status: 'complete', updatedAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Rewrite batch generated' });
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'salesRefreshMetrics') {
                    try {
                        const range: '30d' | '90d' | 'ytd' = (cfg as any)?.range || '30d';
                        const dealsQ = query(collection(db, 'salesDeals'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const dealsSnap = await getDocs(dealsQ);
                        const deals = dealsSnap.docs.map(d => d.data() as SalesDealDoc);
                        if (!deals.length) actionsResults.push({ type: action, status: 'skipped', message: 'No deals' });
                        else {
                            const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + ((b.amount) || 0), 0);
                            const closedWon = deals.filter(d => d.status === 'ClosedWon').length;
                            await addDoc(collection(db, 'salesMetricsSnapshots'), { userId, teamId: recipe.teamId || null, range, pipeline, closedWon, totalDeals: deals.length, createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Metrics snapshot stored' });
                        }
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'salesForecastSnapshot') {
                    try {
                        const dealsQ = query(collection(db, 'salesDeals'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const dealsSnap = await getDocs(dealsQ);
                        const deals = dealsSnap.docs.map(d => d.data() as SalesDealDoc);
                        const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + ((b.amount) || 0), 0);
                        const period = new Date().toISOString().slice(0, 10);
                        await addDoc(collection(db, 'salesForecastSnapshots'), { userId, teamId: recipe.teamId || null, period, forecast: Math.round(pipeline * 0.8), actual: null, createdAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Forecast snapshot added' });
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'salesPipelineDigest') {
                    try {
                        const to: string = (cfg as any)?.to || 'sales-digest@example.com';
                        const range: '30d' | '90d' | 'ytd' = (cfg as any)?.range || '30d';
                        const dealsQ = query(collection(db, 'salesDeals'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const dealsSnap = await getDocs(dealsQ);
                        const deals = dealsSnap.docs.map(d => d.data() as SalesDealDoc);
                        if (!deals.length) actionsResults.push({ type: action, status: 'skipped', message: 'No deals' });
                        else {
                            const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + ((b.amount) || 0), 0);
                            const closedWon = deals.filter(d => d.status === 'ClosedWon').length;
                            const winRate = deals.length ? (closedWon / deals.length) * 100 : 0;
                            const body = `Sales Pipeline Digest (range=${range})\nPipeline: ${pipeline}\nClosed Won: ${closedWon}\nWin Rate: ${winRate.toFixed(1)}%`;
                            await addDoc(collection(db, 'emailQueue'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, to, subject: 'Sales Pipeline Digest', body, status: 'pending', createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Pipeline digest enqueued' });
                        }
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'financeRevenueSnapshot') {
                    try {
                        const invQ = query(collection(db, 'financeInvoices'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const invSnap = await getDocs(invQ);
                        const invoices = invSnap.docs.map(d => normalizeInvoice(d.data())).filter(Boolean) as NormalizedInvoice[];
                        if (!invoices.length) actionsResults.push({ type: action, status: 'skipped', message: 'No invoices' });
                        else {
                            const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
                            const last = periods.at(-1)!; const current = invoices.filter(i => i.period === last);
                            const paid = current.filter(i => i.status === 'paid');
                            const mrr = paid.reduce((s, i) => s + ((i.amount) || 0), 0);
                            const onTime = paid.filter(i => { const paidAt = i.paidAt; const due = i.dueAt; return paidAt && due && paidAt.getTime() <= due.getTime(); });
                            const onTimePct = paid.length ? (onTime.length / paid.length) * 100 : 0;
                            const outstanding = current.filter(i => i.status !== 'paid').length;
                            await addDoc(collection(db, 'financeRevenueSnapshots'), { userId, teamId: recipe.teamId || null, period: last, mrr, onTimePct: Number(onTimePct.toFixed(1)), outstanding, createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Revenue snapshot stored' });
                        }
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'financeInvoiceAgingDigest') {
                    try {
                        const to: string = (cfg as any)?.to || 'finance-aging@example.com';
                        const invQ = query(collection(db, 'financeInvoices'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const invSnap = await getDocs(invQ);
                        const invoices = invSnap.docs.map(d => normalizeInvoice(d.data())).filter(Boolean) as NormalizedInvoice[];
                        const nowTs = Date.now();
                        const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>;
                        invoices.filter(i => i.status !== 'paid').forEach(i => { const due = i.dueAt?.getTime?.(); if (!due) return; const days = Math.floor((nowTs - due) / 86400000); if (days <= 30) buckets['0-30']++; else if (days <= 60) buckets['31-60']++; else if (days <= 90) buckets['61-90']++; else buckets['90+']++; });
                        const body = `Invoice Aging Digest\n0-30: ${buckets['0-30']}\n31-60: ${buckets['31-60']}\n61-90: ${buckets['61-90']}\n90+: ${buckets['90+']}`;
                        await addDoc(collection(db, 'emailQueue'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, to, subject: 'Invoice Aging Digest', body, status: 'pending', createdAt: Timestamp.fromDate(new Date()) });
                        await addDoc(collection(db, 'financeInvoiceAgingSummaries'), { userId, teamId: recipe.teamId || null, buckets, createdAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Invoice aging digest enqueued' });
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'financeAccountingSeedSampleJournals') {
                    try {
                        const { seedSampleJournalEntries } = await import('@/lib/services/accounting-ledger');
                        await seedSampleJournalEntries(userId, recipe.teamId || null, { months: 1 });
                        actionsResults.push({ type: action, status: 'ok', message: 'Sample journals seeded' });
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'financeAccountingGeneratePnL') {
                    try {
                        const period = new Date().toISOString().slice(0, 7);
                        const { fetchJournalEntries } = await import('@/lib/services/accounting-ledger');
                        const { computePnL } = await import('@/lib/accounting/aggregation');
                        const entries = await fetchJournalEntries(userId, recipe.teamId || null);
                        if (!entries.length) {
                            actionsResults.push({ type: action, status: 'skipped', message: 'No journal entries (seed first)' });
                        } else {
                            const figures = computePnL(period, entries);
                            await addDoc(collection(db, 'accountingReportSnapshots'), { userId, teamId: recipe.teamId || null, type: 'pnl', period, figures, createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'P&L snapshot stored' });
                        }
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'financeAccountingGenerateBalanceSheet') {
                    try {
                        const period = new Date().toISOString().slice(0, 7);
                        const { fetchJournalEntries } = await import('@/lib/services/accounting-ledger');
                        const { computeBalanceSheet } = await import('@/lib/accounting/aggregation');
                        const entries = await fetchJournalEntries(userId, recipe.teamId || null);
                        if (!entries.length) {
                            actionsResults.push({ type: action, status: 'skipped', message: 'No journal entries (seed first)' });
                        } else {
                            const figures = computeBalanceSheet(period, entries);
                            await addDoc(collection(db, 'accountingReportSnapshots'), { userId, teamId: recipe.teamId || null, type: 'balance_sheet', period, figures, createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Balance Sheet snapshot stored' });
                        }
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else if (action === 'financeAccountingReconcile') {
                    try {
                        // Stub reconciliation: counts unpaid invoices vs revenue snapshots
                        const invQ = query(collection(db, 'financeInvoices'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const invSnap = await getDocs(invQ);
                        const unpaid = invSnap.docs.map(d => normalizeInvoice(d.data())).filter(i => i && i.status !== 'paid').length;
                        await addDoc(collection(db, 'accountingReportSnapshots'), { userId, teamId: recipe.teamId || null, type: 'reconciliation', period: new Date().toISOString().slice(0, 7), figures: { unpaid }, createdAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Reconciliation snapshot stored' });
                    } catch (e: unknown) { actionsResults.push({ type: action, status: 'error', message: safeMsg(e) }); }
                } else {
                    actionsResults.push({ type: action as AutomationActionType, status: 'error', message: 'Unknown action' });
                }
            } catch (e: unknown) {
                actionsResults.push({ type: action as AutomationActionType, status: 'error', message: safeMsg(e) });
            }
        }
        const finished = new Date();
        // computeNextRun expects full AutomationRecipe; we rely on recipe retaining required schedule fields at runtime.
        const nextRun = computeNextRun(now, recipe as any);
        await updateAutomationRecipe(recipe.id!, { lastRun: started, nextRun });
        results.push({ recipeId: recipe.id!, startedAt: started, finishedAt: finished, actions: actionsResults });
    }
    return results;
}
