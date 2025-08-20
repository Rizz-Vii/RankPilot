import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
// Dynamic imports used to minimize cold route bundle size
// (Ensure these modules are only loaded when needed)
import { fetchRewriteSourceContents } from '@/lib/automation/content-fetch';

// Execute specific automation recipe immediately (subset of actions) honoring actionConfigs
// Minimal document shapes (avoid derived ratios; keep flexible)
interface AutomationRecipeDoc {
    userId: string;
    teamId?: string | null;
    actions?: string[];
    actionConfigs?: Record<string, any>; // keep loose; downstream guards applied
    nextRun?: Date | string | null;
}

interface DealDoc { status?: string; amount?: number; }
interface InvoiceDoc { period?: string; status?: string; amount?: number; paidAt?: any; dueAt?: any; }
interface JournalLine { account?: string; side?: 'debit' | 'credit'; amount?: number; }
interface JournalEntryDoc { period?: string; lines?: JournalLine[]; }

type ActionResult = { action: string; status: 'ok' | 'error' | 'skipped'; message?: string };

function errMsg(e: unknown, fallback = 'error'): string {
    if (e && typeof e === 'object' && 'message' in e) {
        try {
            return String((e as any).message);
        } catch {
            return fallback;
        }
    }
    return fallback;
}

export const POST = withProvenance(async function POST(req: Request): Promise<NextResponse> {
    try {
        const body = (await req.json().catch(() => ({}))) as { recipeId?: string | undefined };
        const { recipeId } = body;
        if (!recipeId) return NextResponse.json(enforceProvenance({ success: false, error: 'recipeId required', provenance: 'synthetic' }, { path: 'automation/run-now', note: 'validation' }), { status: 400 });
        const ref = adminDb.collection('automationRecipes').doc(recipeId);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json(enforceProvenance({ success: false, error: 'Not found', provenance: 'synthetic' }, { path: 'automation/run-now', note: 'not_found' }), { status: 404 });
        const data = snap.data() as AutomationRecipeDoc;
        const { NeuroSEOSuite } = await import('@/lib/neuroseo');
        const suite = new NeuroSEOSuite();
        const actions: string[] = Array.isArray(data.actions) ? data.actions : [];
        const actionResults: ActionResult[] = [];
        const started = new Date();
        for (const action of actions) {
            const cfg = data.actionConfigs?.[action];
            if (action === 'runNeuroSEOAnalysis') {
                const urls: string[] = Array.isArray(cfg?.urls) && cfg.urls.length ? cfg.urls : ['https://example.com'];
                const keywords: string[] = Array.isArray(cfg?.keywords) && cfg.keywords.length ? cfg.keywords : ['example'];
                await suite.runAnalysis({ urls, targetKeywords: keywords, analysisType: 'comprehensive', userPlan: 'agency', userId: data.userId });
                actionResults.push({ action, status: 'ok' });
            } else if (action === 'sendDigestEmail') {
                const to: string = cfg?.to || 'digest@example.com';
                const subject = cfg?.subject || 'NeuroSEO Digest';
                const body = `Automated NeuroSEO digest run-now at ${new Date().toISOString()}\nURLs: ${(cfg?.urls || ['https://example.com']).join(', ')}\nKeywords: ${(cfg?.keywords || ['example']).join(', ')}`;
                try { await adminDb.collection('emailQueue').add({ userId: data.userId, teamId: data.teamId || null, recipeId, to, subject, body, status: 'pending', createdAt: new Date() }); actionResults.push({ action, status: 'ok', message: 'Digest enqueued' }); } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Queue failed') }); }
            } else if (action === 'generateContentRewrite') {
                try {
                    const { RewriteGenEngine } = await import('@/lib/neuroseo/rewrite-gen');
                    const engine = new RewriteGenEngine();
                    const urls: string[] = Array.isArray(cfg?.urls) && cfg.urls.length ? cfg.urls.slice(0, 3) : ['https://example.com'];
                    const sourceMap = await fetchRewriteSourceContents(urls, { max: 3, deterministicFallback: true });
                    const batchRef = await adminDb.collection('rewriteBatches').add({ userId: data.userId, teamId: data.teamId || null, recipeId, createdAt: new Date(), urlCount: urls.length, status: 'processing' });
                    for (const url of urls) {
                        const originalContent = sourceMap[url] || `Placeholder content for ${url}`;
                        const analysis = await engine.generateRewrites({
                            originalContent,
                            targetKeywords: (cfg?.keywords || ['example']).slice(0, 5),
                            tone: 'professional',
                            audience: 'general',
                            contentType: 'article',
                            goals: [{ type: 'readability', target: 60, priority: 'medium', description: 'Improve readability' }],
                            constraints: [{ type: 'preserve_facts', value: true, importance: 'high' }],
                            seoRequirements: {
                                primaryKeyword: (cfg?.keywords?.[0]) || 'example',
                                secondaryKeywords: (cfg?.keywords || []).slice(1, 4),
                                targetLength: { min: 300, max: 1200 },
                                readabilityScore: 50,
                                headingStructure: true,
                                metaOptimization: false,
                                internalLinks: 2,
                                externalLinks: 2,
                            }
                        });
                        await adminDb.collection('rewriteVariants').add({ batchId: batchRef.id, url, userId: data.userId, teamId: data.teamId || null, recipeId, createdAt: new Date(), analysis });
                    }
                    await batchRef.update({ status: 'complete', updatedAt: new Date() });
                    actionResults.push({ action, status: 'ok', message: 'Rewrite batch generated' });
                } catch (e: unknown) {
                    actionResults.push({ action, status: 'error', message: errMsg(e, 'Rewrite failed') });
                }
            } else if (action === 'salesRefreshMetrics') {
                try {
                    const range: '30d' | '90d' | 'ytd' = cfg?.range || '30d';
                    const dealsSnap = await adminDb.collection('salesDeals').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    const deals = dealsSnap.docs.map(d => d.data() as DealDoc);
                    if (!deals.length) actionResults.push({ action, status: 'skipped', message: 'No deals' });
                    else {
                        const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + (b.amount || 0), 0);
                        const closedWon = deals.filter(d => d.status === 'ClosedWon').length;
                        await adminDb.collection('salesMetricsSnapshots').add({ userId: data.userId, teamId: data.teamId || null, range, pipeline, closedWon, totalDeals: deals.length, createdAt: new Date() });
                        actionResults.push({ action, status: 'ok', message: 'Metrics snapshot stored' });
                    }
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Metrics failed') }); }
            } else if (action === 'salesForecastSnapshot') {
                try {
                    const dealsSnap = await adminDb.collection('salesDeals').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    const deals = dealsSnap.docs.map(d => d.data() as DealDoc);
                    const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + (b.amount || 0), 0);
                    const period = new Date().toISOString().slice(0, 10);
                    await adminDb.collection('salesForecastSnapshots').add({ userId: data.userId, teamId: data.teamId || null, period, forecast: Math.round(pipeline * 0.8), actual: null, createdAt: new Date() });
                    actionResults.push({ action, status: 'ok', message: 'Forecast snapshot added' });
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Forecast failed') }); }
            } else if (action === 'salesPipelineDigest') {
                try {
                    const to: string = cfg?.to || 'sales-digest@example.com';
                    const range: '30d' | '90d' | 'ytd' = cfg?.range || '30d';
                    const dealsSnap = await adminDb.collection('salesDeals').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    const deals = dealsSnap.docs.map(d => d.data() as DealDoc);
                    if (!deals.length) actionResults.push({ action, status: 'skipped', message: 'No deals' });
                    else {
                        const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + (b.amount || 0), 0);
                        const closedWon = deals.filter(d => d.status === 'ClosedWon').length;
                        const winRate = deals.length ? (closedWon / deals.length) * 100 : 0;
                        const body = `Sales Pipeline Digest (range=${range})\nPipeline: ${pipeline}\nClosed Won: ${closedWon}\nWin Rate: ${winRate.toFixed(1)}%`;
                        await adminDb.collection('emailQueue').add({ userId: data.userId, teamId: data.teamId || null, recipeId, to, subject: 'Sales Pipeline Digest', body, status: 'pending', createdAt: new Date() });
                        actionResults.push({ action, status: 'ok', message: 'Pipeline digest enqueued' });
                    }
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Pipeline digest failed') }); }
            } else if (action === 'financeRevenueSnapshot') {
                try {
                    const invSnap = await adminDb.collection('financeInvoices').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    const invoices = invSnap.docs.map(d => d.data() as InvoiceDoc);
                    if (!invoices.length) actionResults.push({ action, status: 'skipped', message: 'No invoices' });
                    else {
                        const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
                        const last = periods.at(-1)!;
                        const current = invoices.filter(i => i.period === last);
                        const paid = current.filter(i => i.status === 'paid');
                        const mrr = paid.reduce((s, i) => s + (i.amount || 0), 0);
                        const onTime = paid.filter(i => { const paidAt = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paidAt && due && paidAt.getTime() <= due.getTime(); });
                        const onTimePct = paid.length ? (onTime.length / paid.length) * 100 : 0;
                        const outstanding = current.filter(i => i.status !== 'paid').length;
                        await adminDb.collection('financeRevenueSnapshots').add({ userId: data.userId, teamId: data.teamId || null, period: last, mrr, onTimePct: Number(onTimePct.toFixed(1)), outstanding, createdAt: new Date() });
                        actionResults.push({ action, status: 'ok', message: 'Revenue snapshot stored' });
                    }
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Revenue snapshot failed') }); }
            } else if (action === 'financeInvoiceAgingDigest') {
                try {
                    const to: string = cfg?.to || 'finance-aging@example.com';
                    const invSnap = await adminDb.collection('financeInvoices').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    const invoices = invSnap.docs.map(d => d.data() as InvoiceDoc);
                    const nowTs = Date.now();
                    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
                    invoices.filter(i => i.status !== 'paid').forEach(i => {
                        const due = i.dueAt?.toDate?.()?.getTime?.();
                        if (!due) return; const days = Math.floor((nowTs - due) / 86400000);
                        if (days <= 30) buckets['0-30']++; else if (days <= 60) buckets['31-60']++; else if (days <= 90) buckets['61-90']++; else buckets['90+']++;
                    });
                    const body = `Invoice Aging Digest\n0-30: ${buckets['0-30']}\n31-60: ${buckets['31-60']}\n61-90: ${buckets['61-90']}\n90+: ${buckets['90+']}`;
                    await adminDb.collection('emailQueue').add({ userId: data.userId, teamId: data.teamId || null, recipeId, to, subject: 'Invoice Aging Digest', body, status: 'pending', createdAt: new Date() });
                    await adminDb.collection('financeInvoiceAgingSummaries').add({ userId: data.userId, teamId: data.teamId || null, buckets, createdAt: new Date() });
                    actionResults.push({ action, status: 'ok', message: 'Invoice aging digest enqueued' });
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Aging digest failed') }); }
            } else if (action === 'financeAccountingSeedSampleJournals') {
                try {
                    // Seed three core balanced journal entries (revenue, COGS, salaries)
                    const now = new Date();
                    const period = now.toISOString().slice(0, 7);
                    const baseRevenue = 50000;
                    // Revenue recognition
                    await adminDb.collection('accountingJournalEntries').add({ userId: data.userId, teamId: data.teamId || null, date: now.toISOString().slice(0, 10), period, lines: [{ account: 'ASSET_AR', side: 'debit', amount: baseRevenue }, { account: 'REV_SUBS', side: 'credit', amount: baseRevenue }], source: 'seed', createdAt: new Date(), updatedAt: new Date() });
                    // Hosting COGS
                    const cogs = Math.round(baseRevenue * 0.12);
                    await adminDb.collection('accountingJournalEntries').add({ userId: data.userId, teamId: data.teamId || null, date: now.toISOString().slice(0, 10), period, lines: [{ account: 'COGS_HOSTING', side: 'debit', amount: cogs }, { account: 'LIAB_AP', side: 'credit', amount: cogs }], source: 'seed', createdAt: new Date(), updatedAt: new Date() });
                    // Salaries OPEX
                    const sal = Math.round(baseRevenue * 0.30);
                    await adminDb.collection('accountingJournalEntries').add({ userId: data.userId, teamId: data.teamId || null, date: now.toISOString().slice(0, 10), period, lines: [{ account: 'OPEX_SAL', side: 'debit', amount: sal }, { account: 'ASSET_CASH', side: 'credit', amount: sal }], source: 'seed', createdAt: new Date(), updatedAt: new Date() });
                    actionResults.push({ action, status: 'ok', message: 'Sample journals seeded' });
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Seed failed') }); }
            } else if (action === 'financeAccountingGeneratePnL') {
                try {
                    const period = new Date().toISOString().slice(0, 7);
                    const jeSnap = await adminDb.collection('accountingJournalEntries').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    if (jeSnap.empty) { actionResults.push({ action, status: 'skipped', message: 'No journal entries' }); }
                    else {
                        let revenue = 0, cogs = 0, opex = 0;
                        jeSnap.docs.filter(d => (d.data() as JournalEntryDoc).period === period).forEach(d => {
                            ((d.data() as JournalEntryDoc).lines || []).forEach((l: JournalLine) => {
                                const side = l.side; const amt = l.amount || 0; const acct = l.account || '';
                                const add = (normal: 'debit' | 'credit') => side === normal ? amt : -amt;
                                if (acct.startsWith('REV_')) revenue += add('credit');
                                else if (acct.startsWith('COGS_')) cogs += Math.abs(add('debit'));
                                else if (acct.startsWith('OPEX_')) opex += Math.abs(add('debit'));
                            });
                        });
                        const grossProfit = revenue - cogs; const netIncome = grossProfit - opex;
                        await adminDb.collection('accountingReportSnapshots').add({ userId: data.userId, teamId: data.teamId || null, type: 'pnl', period, figures: { revenue, cogs, grossProfit, opex, netIncome }, createdAt: new Date() });
                        actionResults.push({ action, status: 'ok', message: 'P&L snapshot stored' });
                    }
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'PnL failed') }); }
            } else if (action === 'financeAccountingGenerateBalanceSheet') {
                try {
                    const period = new Date().toISOString().slice(0, 7);
                    const jeSnap = await adminDb.collection('accountingJournalEntries').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    if (jeSnap.empty) { actionResults.push({ action, status: 'skipped', message: 'No journal entries' }); }
                    else {
                        let assets = 0, liabilities = 0, equity = 0;
                        jeSnap.docs.filter(d => {
                            const p = (d.data() as JournalEntryDoc).period;
                            return !!p && p <= period;
                        }).forEach(d => {
                            ((d.data() as JournalEntryDoc).lines || []).forEach((l: JournalLine) => {
                                const side = l.side; const amt = l.amount || 0; const acct = l.account || '';
                                const signed = (normal: 'debit' | 'credit') => side === normal ? amt : -amt;
                                if (acct.startsWith('ASSET_')) assets += signed('debit');
                                else if (acct.startsWith('LIAB_')) liabilities += signed('credit');
                                else if (acct.startsWith('EQUITY_')) equity += signed('credit');
                            });
                        });
                        await adminDb.collection('accountingReportSnapshots').add({ userId: data.userId, teamId: data.teamId || null, type: 'balance_sheet', period, figures: { assets, liabilities, equity }, createdAt: new Date() });
                        actionResults.push({ action, status: 'ok', message: 'Balance Sheet snapshot stored' });
                    }
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Balance sheet failed') }); }
            } else if (action === 'financeAccountingReconcile') {
                try {
                    const invSnap = await adminDb.collection('financeInvoices').where(data.teamId ? 'teamId' : 'userId', '==', data.teamId || data.userId).get();
                    const unpaid = invSnap.docs.filter(d => ((d.data() as InvoiceDoc).status) !== 'paid').length;
                    await adminDb.collection('accountingReportSnapshots').add({ userId: data.userId, teamId: data.teamId || null, type: 'reconciliation', period: new Date().toISOString().slice(0, 7), figures: { unpaid }, createdAt: new Date() });
                    actionResults.push({ action, status: 'ok', message: 'Reconciliation snapshot stored' });
                } catch (e: unknown) { actionResults.push({ action, status: 'error', message: errMsg(e, 'Reconcile failed') }); }
            } else {
                actionResults.push({ action, status: 'skipped' });
            }
        }
        const finished = new Date();
        await ref.update({ lastRun: started, nextRun: data.nextRun || null, updatedAt: new Date() });
        try { await adminDb.collection('automationRuns').add({ recipeId, userId: data.userId, teamId: data.teamId || null, startedAt: started, finishedAt: finished, actions: actionResults, status: actionResults.some(a => a.status === 'error') ? 'partial' : 'ok', createdAt: new Date() }); } catch { }
        return NextResponse.json(enforceProvenance({ success: true, recipeId, actions: actionResults, provenance: 'live' }, { path: 'automation/run-now' }));
    } catch (e: unknown) {
        return NextResponse.json(enforceProvenance({ success: false, error: errMsg(e, 'Run now failed'), provenance: 'synthetic' }, { path: 'automation/run-now', note: 'exception' }), { status: 500 });
    }
}, { path: 'automation/run-now' });
