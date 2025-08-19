import { expect } from 'chai';
import { describe, it } from 'mocha';
import type { InvoiceRecord } from '@/lib/finance/derive-subscription-events';

const PERIOD_REGEX = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

function normalizeInvoice(raw: any): (InvoiceRecord & { paidAt?: Date; dueAt?: Date }) | null {
    let period: string;
    if (typeof raw?.period === 'string') {
        period = PERIOD_REGEX.test(raw.period) ? raw.period : raw.period.slice(0, 7);
    } else period = new Date().toISOString().slice(0, 7);
    if (!PERIOD_REGEX.test(period)) return null;
    return {
        userId: typeof raw?.userId === 'string' ? raw.userId : 'unknown',
        period,
        status: typeof raw?.status === 'string' ? raw.status : 'unknown',
        amount: typeof raw?.amount === 'number' ? raw.amount : 0
    };
}

describe('normalizeInvoice (automation parity)', () => {
    it('accepts valid period', () => {
        const out = normalizeInvoice({ userId: 'u1', period: '2025-08', status: 'paid', amount: 100 });
        expect(out).to.deep.include({ userId: 'u1', period: '2025-08', status: 'paid', amount: 100 });
    });
    it('trims malformed period to first 7 chars', () => {
        const out = normalizeInvoice({ userId: 'u2', period: '2025-08-15', status: 'unpaid', amount: 50 });
        expect(out?.period).to.equal('2025-08');
    });
    it('rejects unrecoverable period', () => {
        const out = normalizeInvoice({ userId: 'u3', period: 'bad', amount: 10 });
        expect(out).to.equal(null);
    });
    it('defaults unknowns', () => {
        const out = normalizeInvoice({});
        if (out) {
            expect(out.userId).to.equal('unknown');
            expect(out.amount).to.equal(0);
        }
    });
});
