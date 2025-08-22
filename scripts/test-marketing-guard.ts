import { sanitizeMarketingCampaignDoc } from '../src/lib/firebase/marketing-write-guard';

function assert(cond: unknown, msg: string) { if (!Boolean(cond)) { console.error('Assertion failed:', msg); process.exitCode = 1; } }

function testStripDerived() {
    const raw = { name: 'X', ctr: 0.5, roi: 3, spend: 10, period: '2025-08' };
    const cleaned = sanitizeMarketingCampaignDoc(raw);
    assert(!('ctr' in cleaned), 'ctr should be stripped');
    assert(!('roi' in cleaned), 'roi should be stripped');
    assert(cleaned.name === 'X', 'name preserved');
}

function testNumericNormalize() {
    const raw = { impressions: '100', clicks: '25', spend: '7.5', roi: 2, period: '2025-08-09T00:00:00Z' };
    const cleaned = sanitizeMarketingCampaignDoc(raw);
    assert(cleaned.impressions === 100, 'impressions numeric');
    assert(cleaned.clicks === 25, 'clicks numeric');
    assert(cleaned.spend === 7.5, 'spend numeric');
    assert(!('roi' in cleaned), 'roi stripped');
}

function testInvalidNumeric() {
    const raw = { impressions: 'abc', clicks: '??', spend: 'nan', period: '2025-08' };
    const cleaned = sanitizeMarketingCampaignDoc(raw);
    assert(cleaned.impressions === 0, 'impressions fallback 0');
    assert(cleaned.clicks === 0, 'clicks fallback 0');
    assert(cleaned.spend === 0, 'spend fallback 0');
}

function testPeriodNormalization() {
    // valid already
    const a = sanitizeMarketingCampaignDoc({ name: 'A', period: '2025-08' });
    assert(a.period === '2025-08', 'keeps valid');
    // convertible date
    const b = sanitizeMarketingCampaignDoc({ name: 'B', period: '2025-08-11T10:00:00Z' });
    assert(b.period === '2025-08', 'converted date -> month');
    let threw = false; try { sanitizeMarketingCampaignDoc({ name: 'C', period: 'not-a-date' }); } catch { threw = true; }
    assert(threw, 'invalid period throws');
}

function run() {
    testStripDerived();
    testNumericNormalize();
    testInvalidNumeric();
    testPeriodNormalization();
    if (process.exitCode) {
        console.error('MKT-01 tests FAILED');
        process.exit(process.exitCode);
    } else {
        console.log('MKT-01 marketing guard tests passed');
    }
}

run();
