import { mapForecastSnapshot, mapMarketingCampaignDoc, mapSalesDeal, type ForecastSnapshotFirestore, type MarketingCampaignFirestore, type SalesDealFirestore } from '@/types/firestore-docs';
import { strict as assert } from 'assert';

// Minimal Timestamp-like stub providing toDate; cast to unknown Timestamp where needed
class TsStub { constructor(private d: Date) { } toDate() { return this.d; } }

describe('Firestore Mapping Helpers', () => {
    it('maps marketing campaign with defaults + date', () => {
        const now = new Date();
        const raw: MarketingCampaignFirestore = { period: '2025-08', impressions: undefined, clicks: 5, leads: 0, spend: 10, revenue: 25, createdAt: new TsStub(now) as unknown as Date };
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
        const raw: SalesDealFirestore = { amount: undefined, stage: undefined, createdAt: new TsStub(new Date()) as unknown as Date };
        const mapped = mapSalesDeal(raw);
        assert.equal(mapped.stage, 'Unknown');
        assert.equal(mapped.amount, 0);
    });

    it('maps forecast snapshot numeric defaults', () => {
        const raw: ForecastSnapshotFirestore = { period: '2025-W33', forecast: undefined, actual: undefined };
        const mapped = mapForecastSnapshot(raw);
        assert.equal(mapped.period, '2025-W33');
        assert.equal(mapped.forecast, 0);
        assert.equal(mapped.actual, 0);
    });
});
