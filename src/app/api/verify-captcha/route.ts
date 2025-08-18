import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json(); if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 });
        const secret = process.env.RECAPTCHA_SECRET_KEY; if (!secret) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
        const resp = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`, { method: 'POST' });
        const data = await resp.json(); if (!data.success) return NextResponse.json({ error: 'captcha_verification_failed' }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (e: unknown) { return NextResponse.json({ error: 'invalid_request', message: (e as any)?.message }, { status: 400 }); }
}
