#!/usr/bin/env node
/*
 * Governance Test: Provenance Wrapper (PROV-01)
 * Ensures withProvenance injects provenance when missing and preserves existing tags.
 */
// Register ts-node + tsconfig-paths so alias imports in source work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('ts-node').register({ transpileOnly: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('tsconfig-paths').register();
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { withProvenance } from '@/lib/middleware/provenance';

interface SimpleReq { id: string }

async function run() {
    // Baseline snapshot
    const before = getUnifiedMetricsSnapshot();
    const baseInjected = before.governance?.provenanceInjected || 0;

    // Handler WITHOUT provenance
    const handlerNoProv = withProvenance(async (_req: SimpleReq) => {
        return { data: 'ok-no-prov' } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }, { path: 'test/no-prov' });

    const res1 = await handlerNoProv({ id: '1' });
    if (!(res1 as any).__provenance) throw new Error('Expected __provenance on injected result');

    // Handler WITH existing provenance
    const handlerWithProv = withProvenance(async (_req: SimpleReq) => {
        return { data: 'ok-prov', __provenance: 'live' } as const;
    }, { path: 'test/with-prov' });

    const res2 = await handlerWithProv({ id: '2' });
    if ((res2 as any).__provenance !== 'live') throw new Error('Expected existing provenance to be preserved');

    // Error path handler
    const handlerError = withProvenance(async () => {
        throw new Error('boom');
    }, { path: 'test/error' });
    const res3 = await handlerError();
    if (!(res3 as any).__provenance) throw new Error('Expected provenance on error path');

    const after = getUnifiedMetricsSnapshot();
    const injectedDelta = (after.governance?.provenanceInjected || 0) - baseInjected;
    if (injectedDelta < 1) throw new Error('Expected at least one provenance injection to be recorded');

    // Print concise success summary for CI parsing
    console.log(JSON.stringify({ ok: true, injectedDelta }));
}

run().catch(e => { console.error(e); process.exit(1); });
