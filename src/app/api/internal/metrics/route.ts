import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { getLogger } from '@/lib/logging/app-logger';

const logger = getLogger('internal-metrics');
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const neuro = getNeuroseoMetricsSnapshot();
    const unified = getUnifiedMetricsSnapshot();
    return NextResponse.json({ neuro, unified });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('metrics.error', { message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
