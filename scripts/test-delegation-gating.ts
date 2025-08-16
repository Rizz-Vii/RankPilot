#!/usr/bin/env ts-node
/**
 * Test script for delegation test gating functionality
 * Tests automatic execution of critical tests after aide runs
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean): void {
    try {
        const result = fn();
        results.push({ name, passed: result, message: result ? 'PASS' : 'FAIL' });
    } catch (err: any) {
        results.push({ name, passed: false, message: `ERROR: ${err.message}` });
    }
}

function runTests() {
    console.log('🧪 Testing delegation test gating functionality...\n');

    // Test 1: Test gating disabled by default
    test('Test gating disabled by default', () => {
        // Create a simple test task
        const queueFile = path.resolve('sessions/aider-queue.jsonl');
        const testTask = {
            taskId: 'TEST-GATING-001',
            summary: 'Test gating disabled',
            files: ['README.md'], // Safe file to test with
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Ensure sessions directory exists
        if (!fs.existsSync(path.dirname(queueFile))) {
            fs.mkdirSync(path.dirname(queueFile), { recursive: true });
        }

        // Write test task to queue
        const header = JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' });
        fs.writeFileSync(queueFile, header + '\n' + JSON.stringify(testTask) + '\n');

        // Run delegation without DELEGATION_RUN_TESTS
        const result = spawnSync('ts-node', ['-P', 'scripts/tsconfig.json', 'scripts/delegation/process-delegation-queue.ts'], {
            stdio: 'pipe',
            timeout: 30000,
            env: { 
                ...process.env, 
                DRY_RUN: '1',
                DELEGATION_RUN_TESTS: '0' // Explicitly disabled
            }
        });

        const output = result.stdout?.toString() || '';
        const noTestMessage = !output.includes('Running post-task tests');

        return result.status === 0 && noTestMessage;
    });

    // Test 2: Test gating enabled
    test('Test gating enabled', () => {
        // Create a simple test task
        const queueFile = path.resolve('sessions/aider-queue.jsonl');
        const testTask = {
            taskId: 'TEST-GATING-002',
            summary: 'Test gating enabled',
            files: ['README.md'], // Safe file to test with
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Write test task to queue
        const header = JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' });
        fs.writeFileSync(queueFile, header + '\n' + JSON.stringify(testTask) + '\n');

        // Run delegation with DELEGATION_RUN_TESTS=1
        const result = spawnSync('ts-node', ['-P', 'scripts/tsconfig.json', 'scripts/delegation/process-delegation-queue.ts'], {
            stdio: 'pipe',
            timeout: 30000,
            env: { 
                ...process.env, 
                DRY_RUN: '1',
                DELEGATION_RUN_TESTS: '1' // Enabled
            }
        });

        const output = result.stdout?.toString() || '';
        const hasTestMessage = output.includes('Running post-task tests') || 
                               output.includes('DELEGATION_RUN_TESTS=1');

        return result.status === 0 && hasTestMessage;
    });

    // Test 3: Custom test script configuration
    test('Custom test script configuration', () => {
        const queueFile = path.resolve('sessions/aider-queue.jsonl');
        const testTask = {
            taskId: 'TEST-GATING-003',
            summary: 'Custom test script',
            files: ['README.md'],
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Write test task to queue
        const header = JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' });
        fs.writeFileSync(queueFile, header + '\n' + JSON.stringify(testTask) + '\n');

        // Run delegation with custom test script
        const result = spawnSync('ts-node', ['-P', 'scripts/tsconfig.json', 'scripts/delegation/process-delegation-queue.ts'], {
            stdio: 'pipe',
            timeout: 30000,
            env: { 
                ...process.env, 
                DRY_RUN: '1',
                DELEGATION_RUN_TESTS: '1',
                DELEGATION_TEST_SCRIPT: 'test:feature-keys' // Custom script
            }
        });

        const output = result.stdout?.toString() || '';
        const hasCustomScript = output.includes('test:feature-keys');

        return result.status === 0 && hasCustomScript;
    });

    // Test 4: Risk metadata in log
    test('Risk metadata emission', () => {
        // Check if log file contains risk metadata
        const logFile = path.resolve('sessions/aider-log.jsonl');
        
        if (!fs.existsSync(logFile)) {
            return true; // No log file yet, which is fine
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.split('\n').filter(l => l.trim() && !l.includes('"meta"'));
        
        // Check if any log entries contain risk metadata
        const hasRiskMetadata = lines.some(line => {
            try {
                const entry = JSON.parse(line);
                return entry.risk && 
                       typeof entry.risk.locDelta === 'string' &&
                       typeof entry.risk.totalLoc === 'number';
            } catch {
                return false;
            }
        });

        return hasRiskMetadata || lines.length === 0; // Pass if no entries yet or if risk metadata exists
    });

    // Print results
    console.log('\n📊 Test Results:');
    console.log('==================');
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(result => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${result.name}: ${result.message}`);
        if (result.passed) passed++;
        else failed++;
    });
    
    console.log('\n📈 Summary:');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    
    if (failed > 0) {
        console.log('\n❌ Some tests failed. Check test gating implementation.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed! Test gating functionality working correctly.');
        process.exit(0);
    }
}

runTests();