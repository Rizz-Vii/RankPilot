import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, Firestore } from 'firebase/firestore';
import { getLogger } from '@/lib/logging/app-logger';

export interface BillingSubscription {
    userId: string;
    status: string;
    tier: string;
    currentPeriodEnd?: Date;
    trialEnd?: Date | null;
    cancelAt?: Date | null;
}

export interface BillingInvoice {
    id: string;
    period: string; // YYYY-MM
    amount: number; // stored raw integer or float (no derived ratios)
    currency?: string;
    status: string; // paid | open | failed
    issuedAt?: unknown;
    paidAt?: unknown;
    userId: string;
    teamId?: string;
}

export interface BillingDataResult {
    subscription: BillingSubscription | null;
    invoices: BillingInvoice[];
    nextInvoice?: BillingInvoice | null;
    effectiveMonthly: number; // computed, not persisted
    loading: boolean;
    error?: string;
}

/**
 * Fetch billing subscription and recent invoices (scoped by userId or team membership not yet implemented client-side).
 * No derived ratios are written; only computed in-memory (effectiveMonthly).
 */
export async function fetchBillingData(firestore: Firestore, userId: string, opts: { invoiceLimit?: number } = {}): Promise<BillingDataResult> {
    const logger = getLogger('billing-ui');
    const invoiceLimit = opts.invoiceLimit ?? 24;
    logger.debug('billing-ui.load.start', { userId, invoiceLimit });
    try {
        const subSnap = await getDoc(doc(firestore, 'subscriptions', userId));
        let subscription: BillingSubscription | null = null;
        if (subSnap.exists()) {
            const d = subSnap.data() as Record<string, any>;
            subscription = {
                userId,
                status: typeof d.status === 'string' ? d.status : 'free',
                tier: typeof d.tier === 'string' ? d.tier : 'free',
                currentPeriodEnd: d.currentPeriodEnd?.toDate?.() || undefined,
                trialEnd: d.trialEnd?.toDate?.() || null,
                cancelAt: d.cancelAt?.toDate?.() || null,
            };
        }
        // invoices scoped by userId only (team support later)
        const invQ = query(collection(firestore, 'financeInvoices'), where('userId', '==', userId), orderBy('period', 'desc'), limit(invoiceLimit));
        const invSnap = await getDocs(invQ);
        const invoices: BillingInvoice[] = invSnap.docs.map(d => {
            const data = d.data() as Record<string, any>;
            return {
                id: d.id,
                period: typeof data.period === 'string' ? data.period : '1970-01',
                amount: Number(data.amount) || 0,
                currency: typeof data.currency === 'string' ? data.currency : undefined,
                status: typeof data.status === 'string' ? data.status : 'unknown',
                issuedAt: data.issuedAt,
                paidAt: data.paidAt,
                userId: typeof data.userId === 'string' ? data.userId : userId,
                teamId: typeof data.teamId === 'string' ? data.teamId : undefined
            } as BillingInvoice;
        });
        // compute effective monthly = sum of last paid invoice(s) in most recent period (not persisted)
        const latestPeriod = invoices.length ? invoices[0].period : undefined;
        const effectiveMonthly = latestPeriod ? invoices.filter(i => i.period === latestPeriod && i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0) : 0;
        const nextInvoice = invoices.find(i => i.status !== 'paid') || null;
        logger.info('billing-ui.load.success', { userId, invoiceCount: invoices.length, tier: subscription?.tier || 'free' });
        return { subscription, invoices, nextInvoice, effectiveMonthly, loading: false };
    } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
        logger.error('billing-ui.load.error', { userId, error: msg });
        return { subscription: null, invoices: [], nextInvoice: null, effectiveMonthly: 0, loading: false, error: msg };
    }
}
