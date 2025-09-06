#!/usr/bin/env node
'use strict';

/**
 * Firebase Hosting Deploy Wrapper (channel deploy)
 * - Adds optional verbose logging via VERBOSE=1
 * - Emits a clean JSON line for CI consumers
 * - Also writes artifacts/firebase-deploy.json with parsed details
 */

const { spawn } = require('child_process');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const VERBOSE = process.env.VERBOSE === '1' || process.env.DEBUG === '1';
const originalConsole = { ...console };

// In non-verbose mode, suppress noisy logs but keep our own progress messages
if (!VERBOSE) {
    console.log = () => { };
    console.warn = () => { };
    console.info = () => { };
    console.error = () => { };
}

function ts() {
    return new Date().toISOString();
}

function findUrls(text) {
    const urls = new Set();
    const re = /(https?:\/\/[^\s"']+\.(?:web\.app|firebaseapp\.com)[^\s"']*)/gi;
    let m;
    while ((m = re.exec(text))) urls.add(m[1]);
    return Array.from(urls);
}

async function deployToFirebase() {
    const channel = process.env.FIREBASE_CHANNEL || 'performance-testing';
    const expires = process.env.FIREBASE_EXPIRES || '30d';
    const project = process.env.FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';

    originalConsole.log(`[${ts()}] 🔧 Starting Firebase Hosting channel deploy`);
    originalConsole.log(`  • project: ${project}`);
    originalConsole.log(`  • channel: ${channel}`);
    originalConsole.log(`  • expires: ${expires}`);

    const args = [
        'firebase-tools@latest',
        'hosting:channel:deploy',
        channel,
        '--expires',
        expires,
        '--project',
        project,
        '--json',
    ];

    return new Promise((resolve, reject) => {
        const child = spawn('npx', args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_ENV: 'production',
                FIREBASE_DEPLOY: 'true',
            },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdout += chunk;
            if (VERBOSE) originalConsole.log(chunk.trim());
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderr += chunk;
            if (VERBOSE) originalConsole.error(chunk.trim());
        });

        child.on('close', (code) => {
            const urls = findUrls(stdout + '\n' + stderr);
            if (code === 0) {
                try {
                    // Try to find a JSON line in stdout
                    const lines = stdout.split('\n').map((l) => l.trim());
                    const jsonLine = lines.find((l) => l.startsWith('{') && l.includes('"status"'));
                    const parsed = jsonLine ? JSON.parse(jsonLine) : { status: 'success' };

                    // Persist artifact
                    const outDir = join(process.cwd(), 'artifacts');
                    try { mkdirSync(outDir, { recursive: true }); } catch { }
                    const artifact = { ...parsed, urls };
                    writeFileSync(join(outDir, 'firebase-deploy.json'), JSON.stringify(artifact, null, 2));

                    originalConsole.log(`[${ts()}] ✅ Deploy finished (exit ${code})`);
                    if (urls.length) originalConsole.log(`  • URLs:\n    - ${urls.join('\n    - ')}`);
                    // Emit a single compact JSON line for CI consumers
                    originalConsole.log(JSON.stringify(artifact));
                    resolve(artifact);
                } catch {
                    originalConsole.warn(`[${ts()}] ⚠️ JSON parse failed, falling back to raw output`);
                    originalConsole.log(stdout);
                    resolve({ status: 'success', urls });
                }
            } else {
                originalConsole.error(`[${ts()}] ❌ Deploy failed (exit ${code})`);
                if (stderr) originalConsole.error(stderr);
                reject(new Error(`Firebase deploy failed with exit code ${code}`));
            }
        });

        child.on('error', (error) => {
            originalConsole.error(`[${ts()}] 🚫 Failed to start Firebase CLI: ${error.message}`);
            reject(error);
        });
    });
}

// Run deployment
deployToFirebase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
