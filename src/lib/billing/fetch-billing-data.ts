import { getLogger } from '@/lib/logging/app-logger';
import type { Firestore } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

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
            interface SubscriptionDoc {
                status?: string;
                tier?: string;
                currentPeriodEnd?: { toDate?: () => Date } | Date | null;
                trialEnd?: { toDate?: () => Date } | Date | null;
                cancelAt?: { toDate?: () => Date } | Date | null;
            }
            const raw: unknown = subSnap.data();
            const d: SubscriptionDoc = (raw && typeof raw === 'object') ? raw as SubscriptionDoc : {};
            const toMaybeDate = (value: SubscriptionDoc[keyof SubscriptionDoc]): Date | null | undefined => {
                if (!value) return value === null ? null : undefined;
                if (value instanceof Date) return value;
                if (typeof value === 'object' && 'toDate' in value) {
                    const fn = (value as { toDate?: () => Date }).toDate;
                    if (typeof fn === 'function') {
                        try {
                            const res = fn.call(value);
                            return res instanceof Date ? res : undefined;
                        } catch {
                            return undefined;
                        }
                    }
                }
                return undefined;
            };
            subscription = {
                userId,
                status: typeof d.status === 'string' ? d.status : 'free',
                tier: typeof d.tier === 'string' ? d.tier : 'free',
                currentPeriodEnd: toMaybeDate(d.currentPeriodEnd) || undefined,
                trialEnd: toMaybeDate(d.trialEnd) || null,
                cancelAt: toMaybeDate(d.cancelAt) || null,
            };
        }
        // invoices scoped by userId only (team support later)
        const invQ = query(collection(firestore, 'financeInvoices'), where('userId', '==', userId), orderBy('period', 'desc'), limit(invoiceLimit));
        const invSnap = await getDocs(invQ);
        const invoices: BillingInvoice[] = invSnap.docs.map(d => {
            interface InvoiceDoc {
                period?: string;
                amount?: number | string;
                currency?: string;
                status?: string;
                issuedAt?: unknown;
                paidAt?: unknown;
                userId?: string;
                teamId?: string;
            }
            const rawInv: unknown = d.data();
            const data: InvoiceDoc = (rawInv && typeof rawInv === 'object') ? rawInv as InvoiceDoc : {};
            const invoice: BillingInvoice = {
                id: d.id,
                period: typeof data.period === 'string' ? data.period : '1970-01',
                amount: Number(data.amount) || 0,
                currency: typeof data.currency === 'string' ? data.currency : undefined,
                status: typeof data.status === 'string' ? data.status : 'unknown',
                issuedAt: data.issuedAt,
                paidAt: data.paidAt,
                userId: typeof data.userId === 'string' ? data.userId : userId,
                teamId: typeof data.teamId === 'string' ? data.teamId : undefined
            };
            return invoice;
        });
        // compute effective monthly = sum of last paid invoice(s) in most recent period (not persisted)
        const latestPeriod = invoices.length ? invoices[0].period : undefined;
        const effectiveMonthly = latestPeriod ? invoices.filter(i => i.period === latestPeriod && i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0) : 0;
        const nextInvoice = invoices.find(i => i.status !== 'paid') || null;
        logger.info('billing-ui.load.success', { userId, invoiceCount: invoices.length, tier: subscription?.tier || 'free' });
        return { subscription, invoices, nextInvoice, effectiveMonthly, loading: false };
    } catch (e: unknown) {
        let msg: string;
        if (e && typeof e === 'object' && 'message' in e) {
            const maybe = (e as { message?: unknown }).message;
            msg = typeof maybe === 'string' ? maybe : String(maybe);
        } else {
            msg = String(e);
        }
        logger.error('billing-ui.load.error', { userId, error: msg });
        return { subscription: null, invoices: [], nextInvoice: null, effectiveMonthly: 0, loading: false, error: msg };
    }
}
