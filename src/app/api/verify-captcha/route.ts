import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RecaptchaVerifyResponse {
  success?: boolean;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const token = body?.token as string | undefined;
    if (!token) {
      return NextResponse.json({ error: 'token_required' }, { status: 400 });
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    const params = new URLSearchParams({ secret, response: token });
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });

    if (!resp.ok) {
      return NextResponse.json({ error: 'captcha_provider_error' }, { status: resp.status });
    }

    const data = (await resp.json()) as RecaptchaVerifyResponse;
    if (!data?.success) {
      return NextResponse.json(
        { error: 'captcha_verification_failed', details: data?.['error-codes'] ?? null },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'invalid_request', message }, { status: 400 });
  }
}
