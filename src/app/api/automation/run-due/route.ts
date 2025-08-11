import { NextResponse } from 'next/server';

// DEPRECATED: Manual trigger removed in favor of Cloud Scheduler (functions.runDueAutomationScheduler).
// Returns 410 Gone to indicate clients should stop calling this endpoint.
export async function POST() {
    return NextResponse.json({
        error: 'Deprecated endpoint. Automated scheduling now handled server-side.',
        action: 'use scheduled function runDueAutomationScheduler'
    }, { status: 410 });
}
