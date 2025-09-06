import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getLogger } from '../../../../lib/logging/app-logger';
import * as tools from '../../../../lib/voice/agent-tools';

const logger = getLogger('api.agent.tools');

export async function POST(req: NextRequest) {
    const probe = req.headers.get('x-probe-token');
    const auth = req.headers.get('authorization');

    // allow probes through in CI
    if (probe && probe === process.env.CRAWL_PROBE_TOKEN) {
        return NextResponse.json({ ok: true, probe: true });
    }

    // simple auth guard - real routes should use proper auth middleware
    if (!auth) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const payload = await req.json();
    const tool = payload.tool;
    logger.info('agent.tool.call', { tool });

    try {
        switch (tool) {
            case 'getAvailability':
                return NextResponse.json(await tools.getAvailability(payload.payload));
            case 'holdSlot':
                return NextResponse.json(await tools.holdSlot(payload.payload));
            case 'createAppointment':
                return NextResponse.json(await tools.createAppointment(payload.payload));
            case 'sendConfirmation':
                return NextResponse.json(await tools.sendConfirmation(payload.payload));
            default:
                return NextResponse.json({ error: 'unknown_tool' }, { status: 400 });
        }
    } catch (err) {
        logger.error('agent.tool.error', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: 'tool_failed' }, { status: 500 });
    }
}
