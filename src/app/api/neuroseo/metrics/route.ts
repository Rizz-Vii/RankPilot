import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() { try { const neuro = getNeuroseoMetricsSnapshot(); return NextResponse.json({ neuro }); } catch { return NextResponse.json({ error: 'internal_error' }, { status: 500 }); } }
