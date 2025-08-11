import { NextRequest, NextResponse } from 'next/server';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import { getLogger } from '@/lib/logging/app-logger';

const logger = getLogger('internal-metrics');
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
    try {
        const neuro = getNeuroseoMetricsSnapshot();
        return NextResponse.json({ neuro });
    } catch (e: any) {
        logger.error('metrics.error', { message: e?.message });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
