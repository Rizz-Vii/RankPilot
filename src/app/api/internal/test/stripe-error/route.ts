import { recordStripeWebhookError } from '@/lib/neuroseo/metrics-registry';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function POST() { recordStripeWebhookError(); return NextResponse.json({ ok: true, injected: true }); }
export async function GET() { recordStripeWebhookError(); return NextResponse.json({ ok: true, injected: true }); }
