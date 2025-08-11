// Server-only execution utilities for automation recipes
import { Timestamp, addDoc, collection, doc, getDocs, query, updateDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AutomationRunResult, AutomationActionType, computeNextRun, listAutomationRecipes, updateAutomationRecipe } from './recipes';
import { fetchRewriteSourceContents } from './content-fetch';

// Execute due automation recipes (server context)
export async function runDueAutomationRecipes(userId: string, teamId?: string) {
    const recipes = await listAutomationRecipes(userId, teamId);
    const now = new Date();
    const due = recipes.filter(r => r.active && r.nextRun && r.nextRun <= now);
    const results: AutomationRunResult[] = [];
    for (const recipe of due) {
        const started = new Date();
        const actionsResults: AutomationRunResult['actions'] = [];
        for (const action of recipe.actions) {
            try {
                const cfg = recipe.actionConfigs?.[action];
                if (action === 'runNeuroSEOAnalysis') {
                    const { NeuroSEOSuite } = await import('@/lib/neuroseo');
                    const urls: string[] = Array.isArray(cfg?.urls) && cfg.urls.length ? cfg.urls : ['https://example.com'];
                    const keywords: string[] = Array.isArray(cfg?.keywords) && cfg.keywords.length ? cfg.keywords : ['example'];
                    await new NeuroSEOSuite().runAnalysis({ urls, targetKeywords: keywords, analysisType: 'comprehensive', userPlan: 'agency', userId });
                    actionsResults.push({ type: action, status: 'ok' });
                } else if (action === 'sendDigestEmail') {
                    const to: string = cfg?.to || 'digest@example.com';
                    const subject = cfg?.subject || 'NeuroSEO Digest';
                    const body = `Automated NeuroSEO digest generated at ${new Date().toISOString()}\nURLs: ${(cfg?.urls || ['https://example.com']).join(', ')}\nKeywords: ${(cfg?.keywords || ['example']).join(', ')}`;
                    try { await addDoc(collection(db, 'emailQueue'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, to, subject, body, status: 'pending', createdAt: Timestamp.fromDate(new Date()) }); actionsResults.push({ type: action, status: 'ok', message: 'Digest enqueued' }); } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Queue failed' }); }
                } else if (action === 'generateContentRewrite') {
                    try {
                        const { RewriteGenEngine } = await import('@/lib/neuroseo/rewrite-gen');
                        const engine = new RewriteGenEngine();
                        const urls: string[] = Array.isArray(cfg?.urls) && cfg.urls.length ? cfg.urls.slice(0, 3) : ['https://example.com'];
                        const sourceMap = await fetchRewriteSourceContents(urls, { max: 3, deterministicFallback: true });
                        const batchId = await addDoc(collection(db, 'rewriteBatches'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, createdAt: Timestamp.fromDate(new Date()), urlCount: urls.length, status: 'processing' });
                        for (const url of urls) {
                            const originalContent = sourceMap[url] || `Placeholder content for ${url}`;
                            const analysis = await engine.generateRewrites({
                                originalContent,
                                targetKeywords: (cfg?.keywords || ['example']).slice(0, 5),
                                tone: 'professional', audience: 'general', contentType: 'article',
                                goals: [{ type: 'readability', target: 60, priority: 'medium', description: 'Improve readability' }],
                                constraints: [{ type: 'preserve_facts', value: true, importance: 'high' }],
                                seoRequirements: { primaryKeyword: (cfg?.keywords?.[0]) || 'example', secondaryKeywords: (cfg?.keywords || []).slice(1, 4), targetLength: { min: 300, max: 1200 }, readabilityScore: 50, headingStructure: true, metaOptimization: false, internalLinks: 2, externalLinks: 2 }
                            });
                            await addDoc(collection(db, 'rewriteVariants'), { batchId: batchId.id, url, userId, teamId: recipe.teamId || null, recipeId: recipe.id!, analysis });
                        }
                        await updateDoc(doc(db, 'rewriteBatches', batchId.id), { status: 'complete', updatedAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Rewrite batch generated' });
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Rewrite failed' }); }
                } else if (action === 'salesRefreshMetrics') {
                    try {
                        const range: '30d' | '90d' | 'ytd' = cfg?.range || '30d';
                        const dealsQ = query(collection(db, 'salesDeals'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const dealsSnap = await getDocs(dealsQ);
                        const deals = dealsSnap.docs.map(d => d.data() as any);
                        if (!deals.length) actionsResults.push({ type: action, status: 'skipped', message: 'No deals' });
                        else {
                            const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + (b.amount || 0), 0);
                            const closedWon = deals.filter(d => d.status === 'ClosedWon').length;
                            await addDoc(collection(db, 'salesMetricsSnapshots'), { userId, teamId: recipe.teamId || null, range, pipeline, closedWon, totalDeals: deals.length, createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Metrics snapshot stored' });
                        }
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Metrics failed' }); }
                } else if (action === 'salesForecastSnapshot') {
                    try {
                        const dealsQ = query(collection(db, 'salesDeals'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const dealsSnap = await getDocs(dealsQ);
                        const deals = dealsSnap.docs.map(d => d.data() as any);
                        const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + (b.amount || 0), 0);
                        const period = new Date().toISOString().slice(0, 10);
                        await addDoc(collection(db, 'salesForecastSnapshots'), { userId, teamId: recipe.teamId || null, period, forecast: Math.round(pipeline * 0.8), actual: null, createdAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Forecast snapshot added' });
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Forecast failed' }); }
                } else if (action === 'salesPipelineDigest') {
                    try {
                        const to: string = cfg?.to || 'sales-digest@example.com';
                        const range: '30d' | '90d' | 'ytd' = cfg?.range || '30d';
                        const dealsQ = query(collection(db, 'salesDeals'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const dealsSnap = await getDocs(dealsQ);
                        const deals = dealsSnap.docs.map(d => d.data() as any);
                        if (!deals.length) actionsResults.push({ type: action, status: 'skipped', message: 'No deals' });
                        else {
                            const pipeline = deals.filter(d => d.status !== 'ClosedLost').reduce((a, b) => a + (b.amount || 0), 0);
                            const closedWon = deals.filter(d => d.status === 'ClosedWon').length;
                            const winRate = deals.length ? (closedWon / deals.length) * 100 : 0;
                            const body = `Sales Pipeline Digest (range=${range})\nPipeline: ${pipeline}\nClosed Won: ${closedWon}\nWin Rate: ${winRate.toFixed(1)}%`;
                            await addDoc(collection(db, 'emailQueue'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, to, subject: 'Sales Pipeline Digest', body, status: 'pending', createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Pipeline digest enqueued' });
                        }
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Pipeline digest failed' }); }
                } else if (action === 'financeRevenueSnapshot') {
                    try {
                        const invQ = query(collection(db, 'financeInvoices'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const invSnap = await getDocs(invQ);
                        const invoices = invSnap.docs.map(d => d.data() as any);
                        if (!invoices.length) actionsResults.push({ type: action, status: 'skipped', message: 'No invoices' });
                        else {
                            const periods = Array.from(new Set(invoices.map(i => i.period))).sort();
                            const last = periods.at(-1)!; const current = invoices.filter(i => i.period === last);
                            const paid = current.filter(i => i.status === 'paid');
                            const mrr = paid.reduce((s, i) => s + (i.amount || 0), 0);
                            const onTime = paid.filter(i => { const paidAt = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paidAt && due && paidAt.getTime() <= due.getTime(); });
                            const onTimePct = paid.length ? (onTime.length / paid.length) * 100 : 0;
                            const outstanding = current.filter(i => i.status !== 'paid').length;
                            await addDoc(collection(db, 'financeRevenueSnapshots'), { userId, teamId: recipe.teamId || null, period: last, mrr, onTimePct: Number(onTimePct.toFixed(1)), outstanding, createdAt: Timestamp.fromDate(new Date()) });
                            actionsResults.push({ type: action, status: 'ok', message: 'Revenue snapshot stored' });
                        }
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Revenue snapshot failed' }); }
                } else if (action === 'financeInvoiceAgingDigest') {
                    try {
                        const to: string = cfg?.to || 'finance-aging@example.com';
                        const invQ = query(collection(db, 'financeInvoices'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const invSnap = await getDocs(invQ);
                        const invoices = invSnap.docs.map(d => d.data() as any);
                        const nowTs = Date.now();
                        const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>;
                        invoices.filter(i => i.status !== 'paid').forEach(i => { const due = i.dueAt?.toDate?.()?.getTime?.(); if (!due) return; const days = Math.floor((nowTs - due) / 86400000); if (days <= 30) buckets['0-30']++; else if (days <= 60) buckets['31-60']++; else if (days <= 90) buckets['61-90']++; else buckets['90+']++; });
                        const body = `Invoice Aging Digest\n0-30: ${buckets['0-30']}\n31-60: ${buckets['31-60']}\n61-90: ${buckets['61-90']}\n90+: ${buckets['90+']}`;
                        await addDoc(collection(db, 'emailQueue'), { userId, teamId: recipe.teamId || null, recipeId: recipe.id!, to, subject: 'Invoice Aging Digest', body, status: 'pending', createdAt: Timestamp.fromDate(new Date()) });
                        await addDoc(collection(db, 'financeInvoiceAgingSummaries'), { userId, teamId: recipe.teamId || null, buckets, createdAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Invoice aging digest enqueued' });
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Aging digest failed' }); }
                } else if (action === 'financeAccountingSeedSampleJournals') {
                    try {
                        const { seedSampleJournalEntries } = await import('@/lib/services/accounting-ledger');
                        await seedSampleJournalEntries(userId, recipe.teamId || null, { months: 1 });
                        actionsResults.push({ type: action, status: 'ok', message: 'Sample journals seeded' });
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Seed failed' }); }
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
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'PnL failed' }); }
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
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Balance sheet failed' }); }
                } else if (action === 'financeAccountingReconcile') {
                    try {
                        // Stub reconciliation: counts unpaid invoices vs revenue snapshots
                        const invQ = query(collection(db, 'financeInvoices'), where(recipe.teamId ? 'teamId' : 'userId', '==', recipe.teamId || userId));
                        const invSnap = await getDocs(invQ);
                        const unpaid = invSnap.docs.filter(d => (d.data() as any).status !== 'paid').length;
                        await addDoc(collection(db, 'accountingReportSnapshots'), { userId, teamId: recipe.teamId || null, type: 'reconciliation', period: new Date().toISOString().slice(0, 7), figures: { unpaid }, createdAt: Timestamp.fromDate(new Date()) });
                        actionsResults.push({ type: action, status: 'ok', message: 'Reconciliation snapshot stored' });
                    } catch (e: any) { actionsResults.push({ type: action, status: 'error', message: e.message || 'Reconcile failed' }); }
                } else {
                    actionsResults.push({ type: action as AutomationActionType, status: 'error', message: 'Unknown action' });
                }
            } catch (e: any) {
                actionsResults.push({ type: action as AutomationActionType, status: 'error', message: e.message || 'Action failed' });
            }
        }
        const finished = new Date();
        const nextRun = computeNextRun(now, recipe);
        await updateAutomationRecipe(recipe.id!, { lastRun: started, nextRun });
        results.push({ recipeId: recipe.id!, startedAt: started, finishedAt: finished, actions: actionsResults });
    }
    return results;
}
