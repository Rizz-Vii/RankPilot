import { strict as assert } from 'assert';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import { upsertFinanceInvoice } from '../src/lib/billing/invoice-upsert';

if (!getApps().length) initializeApp();
const db = getFirestore();

type StripeInvoice = {
    id: string; customer: string; created: number; amount_due: number; amount_paid: number; currency: string; status: string; lines: { data: unknown[] }; metadata: Record<string, unknown>; period_end: number; status_transitions: Record<string, unknown>;
};
function mk(partial: Partial<StripeInvoice>): StripeInvoice {
    const now = Math.floor(Date.now() / 1000);
    const base: StripeInvoice = { id: 'in_order_1', customer: 'cus_order_1', created: now, amount_due: 1000, amount_paid: 0, currency: 'usd', status: 'draft', lines: { data: [] }, metadata: {}, period_end: now, status_transitions: {} };
    return { ...base, ...partial };
}

describe('invoice webhook ordering', () => {
    before(async () => {
        await db.collection('users').doc('user_order').set({ stripeCustomerId: 'cus_order_1', createdAt: new Date(), updatedAt: new Date() });
    });
    it('applies status transitions draft -> open -> paid', async () => {
        await upsertFinanceInvoice(mk({ status: 'draft' }) as unknown as Stripe.Invoice, { allowUnpaid: true });
        let doc = await db.collection('financeInvoices').doc('in_order_1').get();
        assert.equal(doc.data()!.status, 'draft');
        await upsertFinanceInvoice(mk({ status: 'open' }) as unknown as Stripe.Invoice, { allowUnpaid: true });
        doc = await db.collection('financeInvoices').doc('in_order_1').get();
        assert.equal(doc.data()!.status, 'open');
        await upsertFinanceInvoice(mk({ status: 'paid', amount_paid: 1000, status_transitions: { paid_at: Math.floor(Date.now() / 1000) } }) as unknown as Stripe.Invoice, { allowUnpaid: true });
        doc = await db.collection('financeInvoices').doc('in_order_1').get();
        assert.equal(doc.data()!.status, 'paid');
        assert.equal(doc.data()!.amount, 10); // 1000 / 100
    });
});
