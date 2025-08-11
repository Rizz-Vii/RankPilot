import { expect } from 'chai';
import { sanitizeMarketingCampaignDoc } from '../../../src/lib/firebase/marketing-write-guard';

describe('MKT-01 sanitizeMarketingCampaignDoc', () => {
    it('strips derived fields (ctr, roi) while preserving raw fields', () => {
        const raw = {
            name: 'Summer Push',
            channel: 'paid',
            spend: 1200,
            clicks: 3000,
            impressions: 50000,
            ctr: 0.06,
            roi: 3.4,
            period: '2025-08'
        };
        const cleaned = sanitizeMarketingCampaignDoc(raw);
        expect(cleaned).to.not.have.property('ctr');
        expect(cleaned).to.not.have.property('roi');
        expect(cleaned).to.include({ name: 'Summer Push', channel: 'paid', spend: 1200 });
    });

    it('normalizes numeric-like strings and leaves numbers unchanged', () => {
        const raw = { impressions: '1000', clicks: '250', spend: '89.5', roi: 4, period: '2025-08-11T12:00:00Z' } as any;
        const cleaned = sanitizeMarketingCampaignDoc(raw);
        expect(cleaned.impressions).to.equal(1000);
        expect(cleaned.clicks).to.equal(250);
        expect(cleaned.spend).to.equal(89.5);
        expect(cleaned).to.not.have.property('roi');
        expect(cleaned.period).to.match(/^\d{4}-\d{2}$/);
    });

    it('falls back to 0 for unparsable numeric fields', () => {
        const raw = { impressions: 'abc', clicks: 'xyz', spend: 'NaN', ctr: 0.5 } as any;
        const cleaned = sanitizeMarketingCampaignDoc(raw);
        expect(cleaned.impressions).to.equal(0);
        expect(cleaned.clicks).to.equal(0);
        expect(cleaned.spend).to.equal(0);
    });
});
