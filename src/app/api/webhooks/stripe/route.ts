import { enforceProvenance } from '@/lib/middleware/provenance';
import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deprecated duplicate. Use /api/stripe/webhook
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    enforceProvenance({ error: 'gone', use: '/api/stripe/webhook' }, { path: 'webhooks/stripe', note: 'deprecated' }),
    { status: 410 }
  );
}
