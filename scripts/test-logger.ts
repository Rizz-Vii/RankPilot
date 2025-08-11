#!/usr/bin/env tsx
/**
 * LOG-01 logger contract smoke test
 * Verifies: ISO timestamp, level, audit flag, degraded flag serialization.
 * Usage: npm run test:logger
 */
import { getLogger } from '../src/lib/logging/app-logger';

function isIso(s: string) { return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(s); }

(async () => {
    const logger = getLogger('logger-test').withTrace('logger-test');
    const lines: string[] = [];
    const orig = console.info;
    const origWarn = console.warn;
    const origErr = console.error;
    // capture
    (console as any).info = (l: string) => { lines.push(l); };
    (console as any).warn = (l: string) => { lines.push(l); };
    (console as any).error = (l: string) => { lines.push(l); };

    logger.info('regular.event', { a: 1 });
    logger.audit('audit.event', { entity: 'user', id: 'u1' });
    logger.degraded('fallback.applied', { feature: 'stripe-webhook' });
    logger.error('error.event', { reason: 'test' });

    // restore
    console.info = orig; console.warn = origWarn; console.error = origErr;

    const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return null; } });
    const failures: string[] = [];
    if (parsed.length < 4) failures.push('Expected >=4 log lines');
    parsed.forEach((p, idx) => {
        if (!p) failures.push(`Line ${idx} not JSON`);
        else {
            if (!isIso(p.timestamp)) failures.push(`Line ${idx} timestamp not ISO`);
            if (!p.level) failures.push(`Line ${idx} missing level`);
            if (p.message === 'audit.event' && p.audit !== true) failures.push('Audit flag missing');
            if (p.message === 'fallback.applied' && p.degraded !== true) failures.push('Degraded flag missing');
        }
    });
    if (failures.length) {
        console.error('LOGGER TEST FAIL', { failures });
        process.exit(1);
    } else {
        console.log('LOGGER TEST PASS', { count: parsed.length });
    }
})();
