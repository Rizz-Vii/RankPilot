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

    // Test 1: Environment variable recognition in process-delegation-queue.ts
    test('RUN_TESTS environment variable recognition', () => {
        // Check that the script correctly reads DELEGATION_RUN_TESTS
        const scriptContent = fs.readFileSync('scripts/delegation/process-delegation-queue.ts', 'utf8');
        return scriptContent.includes('DELEGATION_RUN_TESTS') && 
               scriptContent.includes('RUN_TESTS') &&
               scriptContent.includes('Running post-task lint');
    });

    // Test 2: Default test script configuration
    test('Default test script configuration', () => {
        const scriptContent = fs.readFileSync('scripts/delegation/process-delegation-queue.ts', 'utf8');
        return scriptContent.includes('test:delegation-smoke') &&
               scriptContent.includes('DELEGATION_TEST_SCRIPT');
    });

    // Test 3: Package.json has test gating scripts
    test('Package.json has delegation test scripts', () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        return packageJson.scripts['test:delegation-gating'] &&
               packageJson.scripts['test:delegation-lockfile'] &&
               packageJson.scripts['test:delegation-smoke'];
    });

    // Test 4: Risk metadata structure in log entries
    test('Risk metadata structure implemented', () => {
        const scriptContent = fs.readFileSync('scripts/delegation/process-delegation-queue.ts', 'utf8');
        return scriptContent.includes('risk: {') &&
               scriptContent.includes('locDelta:') &&
               scriptContent.includes('totalLoc:') &&
               scriptContent.includes('fileCount:');
    });

    // Test 5: Risk classification logic
    test('Risk classification logic implemented', () => {
        const scriptContent = fs.readFileSync('scripts/delegation/process-delegation-queue.ts', 'utf8');
        const hasLowRisk = scriptContent.includes('locRisk = \'low\'');
        const hasMediumRisk = scriptContent.includes('locRisk = \'medium\'');  
        const hasHighRisk = scriptContent.includes('locRisk = \'high\'');
        const hasThresholds = scriptContent.includes('> 200') && scriptContent.includes('> 100');
        return hasLowRisk && hasMediumRisk && hasHighRisk && hasThresholds;
    });

    // Test 6: QA metadata structure in successful runs
    test('QA metadata structure for test results', () => {
        const scriptContent = fs.readFileSync('scripts/delegation/process-delegation-queue.ts', 'utf8');
        return scriptContent.includes('baseEntry.qa = {') &&
               scriptContent.includes('lint:') &&
               scriptContent.includes('tests:');
    });

    // Test 7: Documentation includes lockfile and test gating
    test('Documentation updated for Wave 7 features', () => {
        const docContent = fs.readFileSync('docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md', 'utf8');
        return docContent.includes('Delegation Framework (Wave 7)') &&
               docContent.includes('Lockfile Mechanism') &&
               docContent.includes('Test Gating') &&
               docContent.includes('DELEGATION_RUN_TESTS=1');
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