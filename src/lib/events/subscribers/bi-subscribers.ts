import { getLogger } from '@/lib/logging/app-logger';
import { on } from '../event-bus';

const logger = getLogger('events.bi');

let registered = false;
const unsubscribers: Array<() => void> = [];
const counts: Record<string, number> = {};

export function ensureBiEventSubscribers() {
    if (registered) return;
    registered = true;
    unsubscribers.push(
        on('bi.snapshot.requested', ({ payload }) => {
            counts['bi.snapshot.requested'] = (counts['bi.snapshot.requested'] || 0) + 1;
            logger.info('bi.snapshot.requested', { source: payload?.source, route: payload?.attrs?.route });
        })
    );
    unsubscribers.push(
        on('bi.export.requested', ({ payload }) => {
            counts['bi.export.requested'] = (counts['bi.export.requested'] || 0) + 1;
            const kind = (payload?.attrs && typeof payload.attrs === 'object' ? (payload.attrs as Record<string, unknown>).kind : undefined) as string | undefined;
            const format = (payload?.attrs && typeof payload.attrs === 'object' ? (payload.attrs as Record<string, unknown>).format : undefined) as string | undefined;
            logger.info('bi.export.requested', { source: payload?.source, kind, format });
        })
    );
}

// Test-only helper for assertions
export function __biCountsTestOnly(): Record<string, number> {
    return { ...counts };
}
