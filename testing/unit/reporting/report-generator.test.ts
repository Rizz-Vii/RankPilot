import { strict as assert } from 'assert';
import { generateReport } from '../../../src/lib/reporting/report-generator';

(async function run() {
    const bullets = Array.from({ length: 30 }, (_, i) => `Point ${i + 1}: ${'x'.repeat(50)}`);
    const { summary, truncated } = await generateReport({ title: 'Weekly KPI', bullets, maxBytes: 256 });
    const byteLen = new TextEncoder().encode(summary).length;
    assert.ok(byteLen <= 256);
    assert.equal(typeof truncated, 'boolean');
    console.log('report-generator.test PASS');
})();
