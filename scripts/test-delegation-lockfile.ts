#!/usr/bin/env ts-node
/**
 * Test script for delegation lockfile mechanism
 * Tests concurrent run blocking and lock expiry
 */

import { createLock, isLocked, getLock, releaseLock, cleanupLock } from './delegation/queue-utils';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | Promise<boolean>): void {
    try {
        const result = fn();
        if (result instanceof Promise) {
            result.then(passed => {
                results.push({ name, passed, message: passed ? 'PASS' : 'FAIL' });
            }).catch(err => {
                results.push({ name, passed: false, message: `ERROR: ${err.message}` });
            });
        } else {
            results.push({ name, passed: result, message: result ? 'PASS' : 'FAIL' });
        }
    } catch (err: any) {
        results.push({ name, passed: false, message: `ERROR: ${err.message}` });
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🔒 Testing delegation lockfile mechanism...\n');

    // Cleanup any existing locks
    cleanupLock();

    // Test 1: Basic lock creation
    test('Basic lock creation', () => {
        const locked = createLock('TEST-001', 1); // 1 minute expiry
        return locked && isLocked();
    });

    // Test 2: Lock prevents concurrent creation
    test('Lock prevents concurrent creation', () => {
        const secondLock = createLock('TEST-002', 1);
        return !secondLock; // Should fail because first lock exists
    });

    // Test 3: Lock data retrieval
    test('Lock data retrieval', () => {
        const lock = getLock();
        return lock !== null && lock.taskId === 'TEST-001';
    });

    // Test 4: Lock release
    test('Lock release', () => {
        const released = releaseLock();
        return released && !isLocked();
    });

    // Test 5: Lock expiry (create short-lived lock)
    test('Lock expiry', async () => {
        // Create lock with very short expiry (0.1 minutes = 6 seconds)
        const locked = createLock('TEST-EXPIRY', 0.1);
        if (!locked) return false;
        
        // Wait for expiry
        await sleep(7000); // 7 seconds
        
        // Should be expired and cleaned up
        return !isLocked();
    });

    // Test 6: Concurrent process simulation
    test('Concurrent process blocking', () => {
        // Create a lock
        const locked = createLock('TEST-CONCURRENT', 5);
        if (!locked) return false;

        // Try to run delegation process (should be blocked)
        const result = spawnSync('ts-node', ['-P', 'scripts/tsconfig.json', 'scripts/delegation/process-delegation-queue.ts'], {
            stdio: 'pipe',
            timeout: 10000,
            env: { ...process.env, DRY_RUN: '1' }
        });

        // Should exit with error code 1 due to lock
        const blocked = result.status === 1;
        const output = result.stderr?.toString() || '';
        const hasLockMessage = output.includes('Another delegation process is already running');
        
        // Clean up
        releaseLock();
        
        return blocked && hasLockMessage;
    });

    // Wait for async tests to complete
    await sleep(8000);

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
        console.log('\n❌ Some tests failed. Check lockfile implementation.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed! Lockfile mechanism working correctly.');
        process.exit(0);
    }
}

// Cleanup on exit
process.on('exit', () => cleanupLock());
process.on('SIGINT', () => {
    cleanupLock();
    process.exit();
});

runTests().catch(err => {
    console.error('Test runner error:', err);
    cleanupLock();
    process.exit(1);
});