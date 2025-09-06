import { NextResponse, type NextRequest } from 'next/server';
import { getLogger } from '../../../lib/logging/app-logger';
import { enforceProvenance } from '../../../lib/middleware/provenance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RecaptchaVerifyResponse { success?: boolean; 'error-codes'?: string[] }

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = getLogger('api.verify-captcha');
  try {
    const body = await request.json().catch(() => ({} as unknown));
    const token = (body && typeof body === 'object' && (body as { token?: string }).token) || '';
    if (!token) {
      const resBody = enforceProvenance({ error: 'token_required' }, { path: 'verify-captcha:POST', note: 'missing-token' });
      return NextResponse.json(resBody, { status: 400 });
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY || '';
    if (!secret) {
      const resBody = enforceProvenance({ error: 'server_misconfigured' }, { path: 'verify-captcha:POST', note: 'missing-secret' });
      return NextResponse.json(resBody, { status: 500 });
    }

    const params = new URLSearchParams({ secret, response: token });
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!resp.ok) {
      logger.degraded?.('verify.provider_error', { status: resp.status });
      const resBody = enforceProvenance({ error: 'captcha_provider_error' }, { path: 'verify-captcha:POST', note: `upstream-${resp.status}` });
      return NextResponse.json(resBody, { status: resp.status });
    }

    const data = (await resp.json().catch(() => ({}))) as RecaptchaVerifyResponse;
    if (!data?.success) {
      logger.info('verify.failed', { details: data?.['error-codes'] });
      const resBody = enforceProvenance({ error: 'captcha_verification_failed', details: data?.['error-codes'] }, { path: 'verify-captcha:POST', note: 'failed' });
      return NextResponse.json(resBody, { status: 400 });
    }

    logger.info('verify.ok');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('verify.exception', { error: msg });
    const resBody = enforceProvenance({ error: 'internal_error' }, { path: 'verify-captcha:POST', note: 'exception' });
    return NextResponse.json(resBody, { status: 500 });
  }
}
