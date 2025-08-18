import { strict as assert } from 'assert';
import { mapMarketingCampaignDoc, mapSalesDeal, mapForecastSnapshot } from '@/types/firestore-docs';

// Minimal Timestamp stub
class TsStub { constructor(private d: Date) { } toDate() { return this.d; } }

describe('Firestore Mapping Helpers', () => {
    it('maps marketing campaign with defaults + date', () => {
        const now = new Date();
        const raw = { period: '2025-08', impressions: undefined, clicks: 5, leads: 0, spend: 10, revenue: 25, createdAt: new TsStub(now) } as any;
        const mapped = mapMarketingCampaignDoc('c1', raw);
        assert.equal(mapped.id, 'c1');
        assert.equal(mapped.period, '2025-08');
        assert.equal(mapped.impressions, 0); // defaulted
        assert.equal(mapped.clicks, 5);
        assert.equal(mapped.spend, 10);
        assert.equal(mapped.revenue, 25);
        assert.ok(mapped.createdAt instanceof Date);
    });

    it('maps sales deal with stage fallback + numeric defaults', () => {
        const raw = { amount: undefined, stage: undefined, createdAt: new TsStub(new Date()) } as any;
        const mapped = mapSalesDeal(raw);
        assert.equal(mapped.stage, 'Unknown');
        assert.equal(mapped.amount, 0);
    });

    it('maps forecast snapshot numeric defaults', () => {
        const raw = { period: '2025-W33', forecast: undefined, actual: undefined } as any;
        const mapped = mapForecastSnapshot(raw);
        assert.equal(mapped.period, '2025-W33');
        assert.equal(mapped.forecast, 0);
        assert.equal(mapped.actual, 0);
    });
});
