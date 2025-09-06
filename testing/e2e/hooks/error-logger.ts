/**
 * Simple timestamped error logger for E2E runs
 */
import fs from 'fs';
import path from 'path';

const RESULTS_DIR = path.resolve(process.cwd(), 'test-results');
const LOG_FILE = path.join(RESULTS_DIR, 'e2e-errors.log');

function ensureDir() {
    try {
        if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
    } catch {
        // ignore
    }
}

export function logE2EError(message: string, meta?: Record<string, unknown>) {
    try {
        ensureDir();
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            message,
            ...((meta && Object.keys(meta).length) ? { meta } : {}),
        });
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch {
        // best-effort only
    }
}

export function logSection(title: string) {
    logE2EError(`--- ${title} ---`);
}

export function getLogFilePath() {
    return LOG_FILE;
}

export function getResultsDir() {
    return RESULTS_DIR;
}

export default { logE2EError, logSection, getLogFilePath, getResultsDir };
