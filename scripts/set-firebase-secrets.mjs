#!/usr/bin/env node
/**
 * scripts/set-firebase-secrets.mjs
 *
 * Reads .env.local and .env.production, maps required variables, and sets
 * Firebase Functions secrets so both Functions and Hosting SSR can read them.
 *
 * It does NOT print secret values. Requires Firebase CLI auth to the project.
 */
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const projectDefault = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'rankpilot-h3jpc';
const projectArgIdx = process.argv.indexOf('--project');
const project = projectArgIdx !== -1 ? (process.argv[projectArgIdx + 1] || projectDefault) : projectDefault;

const root = process.cwd();
const envLocalPath = path.join(root, '.env.local');
const envProdPath = path.join(root, '.env.production');

function parseEnv(filePath) {
    const map = {};
    if (!fs.existsSync(filePath)) return map;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const i = line.indexOf('=');
        const k = line.slice(0, i).trim();
        let v = line.slice(i + 1);
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        map[k] = v;
    }
    return map;
}

const envLocal = parseEnv(envLocalPath);
const envProd = parseEnv(envProdPath);
const get = (...keys) => {
    for (const k of keys) {
        if (k in envLocal && envLocal[k] !== '') return envLocal[k];
        if (k in envProd && envProd[k] !== '') return envProd[k];
    }
    return undefined;
};

// Map required secrets
const desired = {
    // Firebase client (use NEXT_PUBLIC_* to satisfy Hosting + Next.js conventions)
    NEXT_PUBLIC_FIREBASE_API_KEY: get('NEXT_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: get('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: get('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: get('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'),
    NEXT_PUBLIC_FIREBASE_APP_ID: get('NEXT_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID'),

    // Firebase Admin
    FIREBASE_ADMIN_PROJECT_ID: get('FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
    FIREBASE_ADMIN_PRIVATE_KEY: get('FIREBASE_ADMIN_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY'),
    FIREBASE_ADMIN_CLIENT_EMAIL: get('FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_CLIENT_EMAIL'),

    // AI
    USE_REAL_AI: 'true',
    GOOGLE_AI_API_KEY: get('GOOGLE_AI_API_KEY', 'GOOGLE_API_KEY'),
    GOOGLE_API_KEY: get('GOOGLE_API_KEY'),
    GEMINI_API_KEY: get('GEMINI_API_KEY'),
    OPENAI_API_KEY: get('OPENAI_API_KEY'),
    FIRECRAWL_API_KEY: get('FIRECRAWL_API_KEY'),

    // Sentry
    SENTRY_DSN: get('SENTRY_DSN'),

    // Auth/testing (optional)
    TEST_USER_EMAIL: get('TEST_USER_EMAIL'),
    TEST_USER_PASSWORD: get('TEST_USER_PASSWORD'),
    TEST_ADMIN_EMAIL: get('TEST_ADMIN_EMAIL'),
    TEST_ADMIN_PASSWORD: get('TEST_ADMIN_PASSWORD'),

    // reCAPTCHA
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: get('NEXT_PUBLIC_RECAPTCHA_SITE_KEY'),
    RECAPTCHA_SECRET_KEY: get('RECAPTCHA_SECRET_KEY'),

    // Stripe
    STRIPE_SECRET_KEY: get('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: get('STRIPE_WEBHOOK_SECRET'),

    // SMTP/contact
    SMTP_HOST: get('SMTP_HOST'),
    SMTP_PORT: get('SMTP_PORT'),
    SMTP_USER: get('SMTP_USER'),
    SMTP_PASS: get('SMTP_PASS'),
    CONTACT_FROM_EMAIL: get('CONTACT_FROM_EMAIL'),
    CONTACT_RECEIVER_EMAIL: get('CONTACT_RECEIVER_EMAIL'),

    // Twilio / Voice
    TWILIO_ACCOUNT_SID: get('TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: get('TWILIO_AUTH_TOKEN'),
    TWILIO_FROM_NUMBER: get('TWILIO_FROM_NUMBER'),
    // Not a secret strictly, but set as runtime config for SSR/server routes
    PUBLIC_BASE_URL: get('PUBLIC_BASE_URL'),
    // Dev/test helper for webhook signature bypass (non-prod only)
    TWILIO_TEST_MODE: get('TWILIO_TEST_MODE'),

    // Misc
    CRAWL_PROBE_TOKEN: get('CRAWL_PROBE_TOKEN'),
};

// Provide safe defaults for optional CI/test secrets if not present to satisfy SSR secret existence
if (!desired.TEST_USER_EMAIL) desired.TEST_USER_EMAIL = 'test.user@example.com';
if (!desired.TEST_USER_PASSWORD) desired.TEST_USER_PASSWORD = 'TestPassw0rd!';
if (!desired.TEST_ADMIN_EMAIL) desired.TEST_ADMIN_EMAIL = 'test.admin@example.com';
if (!desired.TEST_ADMIN_PASSWORD) desired.TEST_ADMIN_PASSWORD = 'AdminPassw0rd!';

// Generate a probe token if missing to avoid deploy failures; 32 hex chars
if (!desired.CRAWL_PROBE_TOKEN) desired.CRAWL_PROBE_TOKEN = crypto.randomBytes(16).toString('hex');

// Verify firebase binary
const firebaseBinCandidate = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'firebase.cmd' : 'firebase');
const firebaseBin = fs.existsSync(firebaseBinCandidate) ? firebaseBinCandidate : 'firebase';

function mask(v) { if (!v) return ''; const s = String(v); return s.length <= 6 ? '*'.repeat(s.length) : s.slice(0, 3) + '...' + s.slice(-3); }

function isPlausible(name, val) {
    if (val == null || val === '') return false;
    if (name === 'FIREBASE_ADMIN_PRIVATE_KEY') {
        const v = String(val);
        return v.includes('BEGIN PRIVATE KEY') || v.length > 100;
    }
    if (name === 'FIREBASE_ADMIN_CLIENT_EMAIL') {
        const v = String(val);
        return /@/.test(v);
    }
    if (name === 'FIREBASE_ADMIN_PROJECT_ID') {
        const v = String(val);
        return v.length >= 3 && !/\s/.test(v);
    }
    return true;
}

const keys = Object.keys(desired);
const summary = { project, attempted: 0, set: 0, skippedMissing: 0, failed: 0, errors: [] };
// Functions use Application Default Credentials; skip admin secrets to avoid unnecessary failures
const OPTIONAL_SKIP = new Set([
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
]);

for (const name of keys) {
    if (OPTIONAL_SKIP.has(name)) {
        summary.skippedMissing++;
        console.log(`Skip ${name}: optional for Cloud Functions (ADC used).`);
        continue;
    }
    let val = desired[name];
    if (!isPlausible(name, val)) {
        summary.skippedMissing++;
        console.log(`Skip ${name}: not provided or failed validation.`);
        continue;
    }
    // Skip public keys as they shouldn't be secrets
    if (name.startsWith('NEXT_PUBLIC_')) {
        summary.skippedMissing++;
        console.log(`Skip ${name}: public key, not a secret.`);
        continue;
    }
    // Ensure multiline private keys preserved (envLocal already contains \n escapes or real newlines)
    if (name.includes('PRIVATE_KEY')) {
        // If the value looks like a quoted-with-\n string, keep as-is; otherwise ensure it's raw
        val = val.replace(/\\n/g, '\n');
    }
    summary.attempted++;
    // Always set as Functions secret
    const args = ['functions:secrets:set', name, '--project', project];
    const res = spawnSync(firebaseBin, args, { input: val + '\n', encoding: 'utf8' });
    const msgText = ((res.stderr || res.stdout) || '').toString();
    // Some CLI variants print warnings to stderr with exit code 0/1; treat non-fatal warnings as success
    const nonFatalWarning = /not managed by Cloud Functions for Firebase/i.test(msgText) || /already exists/i.test(msgText);
    if (res.status === 0 || nonFatalWarning) {
        summary.set++;
        console.log(`Set ${name}: ${mask(val)}`);
    } else {
        summary.failed++;
        summary.errors.push({ name, code: res.status, msg: msgText.slice(0, 400) });
        console.error(`Failed ${name}: ${msgText.split('\n')[0] || res.status}`);
    }
}

console.log('\nSummary:', JSON.stringify({ ...summary, errors: summary.errors.map(e => ({ name: e.name, code: e.code })) }, null, 2));
if (summary.failed > 0) {
    console.error('\nNote: If failures mention auth, run "npx firebase login" or set FIREBASE_TOKEN, then re-run this script with --project', project);
    process.exit(1);
}
