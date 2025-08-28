import { enforceProvenance } from '@/lib/middleware/provenance';
import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deprecated duplicate. Use /api/stripe/webhook
export async function POST() {
  return NextResponse.json(
    enforceProvenance({ error: 'gone', use: '/api/stripe/webhook' }, { path: 'stripe-webhook', note: 'deprecated' }),
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    enforceProvenance({ error: 'gone', use: '/api/stripe/webhook' }, { path: 'stripe-webhook', note: 'deprecated' }),
    { status: 410 }
  );
}
