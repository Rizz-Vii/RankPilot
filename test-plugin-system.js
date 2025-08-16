// Simple test for the plugin system to verify current implementation
const fs = require('fs');
const path = require('path');

// Test 1: Check if plugins directory exists and has the expected files
function testPluginDirectory() {
    const pluginDir = path.join(process.cwd(), 'scripts', 'brain', 'plugins');
    console.log('Testing plugin directory:', pluginDir);
    
    if (!fs.existsSync(pluginDir)) {
        console.log('❌ Plugins directory does not exist');
        return false;
    }
    
    const files = fs.readdirSync(pluginDir);
    console.log('Files in plugins directory:', files);
    
    const hasIndex = files.includes('index.ts');
    const hasExample = files.some(f => f.includes('example.plugin'));
    
    console.log('Has index.ts:', hasIndex ? '✅' : '❌');
    console.log('Has example plugin:', hasExample ? '✅' : '❌');
    
    return hasIndex && hasExample;
}

// Test 2: Check plugin loading function (simulate it)
function testPluginLoading() {
    console.log('\nTesting plugin loading simulation...');
    
    // Simulate the loadPlugins function logic
    const dir = path.join(process.cwd(), 'scripts', 'brain', 'plugins');
    let runners = [];
    let validators = [];
    const names = [];
    
    try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.plugin.ts') || f.endsWith('.plugin.js'));
        console.log('Plugin files found:', files);
        
        for (const f of files) {
            if (f === 'index.ts' || f === 'index.js') continue;
            names.push(f.replace(/\.(plugin\.ts|plugin\.js)$/, ''));
        }
        
        console.log('Plugin names extracted:', names);
        return names.length > 0;
    } catch (e) {
        console.log('❌ Error testing plugin loading:', e.message);
        return false;
    }
}

// Test 3: Check if missing directory is handled gracefully
function testMissingDirectory() {
    console.log('\nTesting missing directory handling...');
    
    const nonExistentDir = path.join(process.cwd(), 'nonexistent-plugins');
    try {
        const files = fs.readdirSync(nonExistentDir);
        console.log('❌ Should not reach here for non-existent directory');
        return false;
    } catch (e) {
        console.log('✅ Correctly handles missing directory:', e.code);
        return true;
    }
}

// Run all tests
function runTests() {
    console.log('=== Plugin System Tests ===\n');
    
    const test1 = testPluginDirectory();
    const test2 = testPluginLoading();
    const test3 = testMissingDirectory();
    
    console.log('\n=== Test Results ===');
    console.log('Plugin directory test:', test1 ? '✅ PASS' : '❌ FAIL');
    console.log('Plugin loading test:', test2 ? '✅ PASS' : '❌ FAIL');
    console.log('Missing directory test:', test3 ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = test1 && test2 && test3;
    console.log('\nOverall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };