import { getNeuroseoMetricsSnapshot, persistMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() { const snapshot = getNeuroseoMetricsSnapshot(); return NextResponse.json({ snapshot }); }
export async function POST(_req: NextRequest) { const result = persistMetricsSnapshot(); return NextResponse.json(result, { status: result.ok ? 200 : 500 }); }
