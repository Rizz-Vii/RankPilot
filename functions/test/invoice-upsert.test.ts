import { strict as assert } from 'assert';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { upsertFinanceInvoice } from '../src/lib/billing/invoice-upsert';

if (!getApps().length) initializeApp();
const db = getFirestore();

// Minimal mock Stripe.Invoice shape for test
type StripeInvoice = {
    id: string;
    customer: string;
    created: number;
    amount_due: number;
    amount_paid: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | string;
    lines: { data: unknown[] };
    metadata: Record<string, unknown>;
    period_end: number;
    status_transitions: Record<string, unknown>;
};

function makeInvoice(partial: Partial<StripeInvoice>): StripeInvoice {
    const base: StripeInvoice = {
        id: 'in_test_1',
        customer: 'cus_test_1',
        created: Math.floor(Date.now() / 1000),
        amount_due: 5000,
        amount_paid: 0,
        currency: 'usd',
        status: 'draft',
        lines: { data: [] },
        metadata: {},
        period_end: Math.floor(Date.now() / 1000),
        status_transitions: {},
    };
    return { ...base, ...partial };
}

describe('invoice upsert (financeInvoices)', () => {
    before(async () => {
        // seed user with stripeCustomerId
        await db.collection('users').doc('user_test').set({ stripeCustomerId: 'cus_test_1', createdAt: new Date(), updatedAt: new Date() });
    });

    it('persists draft/finalized and updates on payment', async () => {
        const draft = makeInvoice({ status: 'draft' });
        await upsertFinanceInvoice(draft, { allowUnpaid: true });
        let doc = await db.collection('financeInvoices').doc(draft.id).get();
        assert.ok(doc.exists, 'draft invoice persisted');
        assert.equal(doc.data()!.status, 'draft');

        const finalized = makeInvoice({ id: draft.id, status: 'open' });
        await upsertFinanceInvoice(finalized, { allowUnpaid: true });
        doc = await db.collection('financeInvoices').doc(draft.id).get();
        assert.equal(doc.data()!.status, 'open');

        const paid = makeInvoice({ id: draft.id, status: 'paid', amount_paid: 5000, status_transitions: { paid_at: Math.floor(Date.now() / 1000) } });
        await upsertFinanceInvoice(paid, { allowUnpaid: true });
        doc = await db.collection('financeInvoices').doc(draft.id).get();
        assert.equal(doc.data()!.status, 'paid');
        assert.equal(doc.data()!.amount, 50); // 5000 / 100
    });
});
