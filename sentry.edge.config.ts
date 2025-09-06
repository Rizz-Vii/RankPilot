// Sentry Edge Configuration (guarded)
import { browserTracingIntegration, init } from "@sentry/nextjs";

const disableSentry = process.env.DISABLE_SENTRY === 'true' || !process.env.SENTRY_DSN;

if (!disableSentry) {
    init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
        integrations: [browserTracingIntegration()],
        tracePropagationTargets: ["localhost", /^https:\/\/.*\/api/],
    });
}

export default {};
