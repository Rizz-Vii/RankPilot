#!/usr/bin/env node
'use strict';

/**
 * Firebase Hosting Deploy Wrapper
 * Ensures clean JSON output for GitHub Actions
 */

const { spawn } = require('child_process');

// Suppress console output during deployment
 
const originalConsole = { ...console };
console.log = () => {};
console.warn = () => {};
console.info = () => {};
console.error = () => {};
 

async function deployToFirebase() {
    const args = [
        'firebase-tools@latest',
        'hosting:channel:deploy',
        process.env.FIREBASE_CHANNEL || 'performance-testing',
        '--expires',
        process.env.FIREBASE_EXPIRES || '30d',
        '--project',
        process.env.FIREBASE_PROJECT_ID,
        '--json'
    ];

    return new Promise((resolve, reject) => {
        const child = spawn('npx', args, {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: {
                ...process.env,
                // Ensure clean environment
                NODE_ENV: 'production',
                FIREBASE_DEPLOY: 'true'
            }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                // Extract JSON from stdout
                try {
                    const lines = stdout.split('\n');
                    let jsonLine = '';

                    // Find the JSON response line
                    for (const line of lines) {
                        if (line.trim().startsWith('{') && line.includes('"status"')) {
                            jsonLine = line.trim();
                            break;
                        }
                    }

                    if (jsonLine) {
                        const result = JSON.parse(jsonLine);
                        originalConsole.log(JSON.stringify(result, null, 2));
                        resolve(result);
                    } else {
                        // Fallback: output the full stdout
                        originalConsole.log(stdout);
                        resolve({ status: 'success', message: 'Deployment completed' });
                    }
                } catch (error) {
                    originalConsole.error('Failed to parse JSON response:', error.message);
                    originalConsole.error('Raw output:', stdout);
                    reject(error);
                }
            } else {
                originalConsole.error('Deployment failed with code:', code);
                originalConsole.error('Error output:', stderr);
                reject(new Error(`Firebase deploy failed with exit code ${code}`));
            }
        });

        child.on('error', (error) => {
            originalConsole.error('Failed to start Firebase CLI:', error.message);
            reject(error);
        });
    });
}

// Run deployment
deployToFirebase()
    .then((result) => {
        process.exit(0);
    })
    .catch((error) => {
        originalConsole.error('Deployment error:', error.message);
        process.exit(1);
    });
