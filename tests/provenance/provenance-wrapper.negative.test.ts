// Self-contained test for provenance wrapper on error path
import { withProvenance } from '../../src/lib/middleware/provenance';

(async function run() {
    const handler = withProvenance(async () => {
        throw new Error('boom');
    }, { path: 'test/withProv', note: 'error-path' });
    const res = await handler();
    const prov = (res as unknown as { __provenance?: string }).__provenance;
    if (prov !== 'synthetic' && prov !== 'unknown') {
        console.error('Expected synthetic/unknown provenance on error path, got', prov);
        process.exit(1);
    }
    console.log('provenance.wrapper negative tests: PASS');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
