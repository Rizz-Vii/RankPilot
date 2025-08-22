#!/usr/bin/env ts-node
// Simple guard test (MKT-01) – validates stripping & metric increment (indirectly via snapshot diff)
import { stripForbiddenDerivedFields } from '@/lib/guards/forbidden-derived-fields';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';

const before = getUnifiedMetricsSnapshot().governance?.forbiddenFieldStrips || 0;
type Doc = { id: string; roi?: unknown; ctr?: unknown; clicks?: number; ltv?: unknown };
const doc: Doc = { id: 'x1', roi: 1.23, ctr: 0.5, clicks: 10, ltv: 999 };
const res = stripForbiddenDerivedFields(doc);
const after = getUnifiedMetricsSnapshot().governance?.forbiddenFieldStrips || 0;

if (!(['roi', 'ctr', 'ltv'].every(f => !(f in res.doc)))) {
    console.error('Guard failed to remove forbidden fields', res);
    process.exit(1);
}
if (after - before < 1) {
    console.error('Metric not incremented for forbidden field strips');
    process.exit(1);
}
console.log('Forbidden field guard test PASS', { stripped: res.stripped, metricDelta: after - before });
