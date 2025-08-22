import { NextResponse } from 'next/server';

// API route to persist (dev) agent enable preference via cookie.
// Only active in development; in production it returns 403 unless env override present.
export async function POST() {
    if (process.env.NODE_ENV !== 'development' && !process.env.RANKPILOT_AGENTS_DEV_OVERRIDE) {
        return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, {
        headers: {
            // cookie rp_agents=1 enables client-side detection in adapter (expires quick: 1 day)
            'Set-Cookie': `rp_agents=1; Path=/; Max-Age=86400; SameSite=Lax`,
        }
    });
}

export async function DELETE() {
    if (process.env.NODE_ENV !== 'development' && !process.env.RANKPILOT_AGENTS_DEV_OVERRIDE) {
        return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, {
        headers: {
            'Set-Cookie': `rp_agents=; Path=/; Max-Age=0; SameSite=Lax`,
        }
    });
}
