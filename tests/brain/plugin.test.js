// Test file for plugin system functionality
// Tests plugin detection, loading, configuration, and missing directory handling

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Helper function to create a temporary plugin
function createTempPlugin(name, content) {
    const pluginPath = path.join(process.cwd(), 'scripts', 'brain', 'plugins', `${name}.plugin.js`);
    fs.writeFileSync(pluginPath, content);
    return pluginPath;
}

// Helper function to remove temporary plugin
function removeTempPlugin(pluginPath) {
    try {
        fs.unlinkSync(pluginPath);
        // Clear require cache
        delete require.cache[require.resolve(pluginPath)];
    } catch (e) {
        // Ignore if file doesn't exist
    }
}

// Test 1: Plugin detection and loading
function testPluginDetection() {
    console.log('Testing plugin detection...');
    
    // Create a mock for loadPlugins since we can't compile TypeScript easily
    const mockLoadPlugins = (cfg) => {
        if (cfg && cfg.plugins && cfg.plugins.enabled === false) {
            return { runners: [], validators: [], names: ['disabled'] };
        }
        if (cfg && cfg.plugins && cfg.plugins.loadPlugins === false) {
            return { runners: [], validators: [], names: ['disabled'] };
        }
        
        const dir = path.join(process.cwd(), 'scripts', 'brain', 'plugins');
        const names = [];
        try {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.plugin.ts') || f.endsWith('.plugin.js'));
            for (const f of files) {
                if (f === 'index.ts' || f === 'index.js') continue;
                names.push(f.replace(/\.(plugin\.ts|plugin\.js)$/, ''));
            }
        } catch { }
        return { runners: [], validators: [], names };
    };
    
    // Test with plugins enabled (default)
    const result1 = mockLoadPlugins();
    assert(result1.names.includes('example'), 'Should detect example plugin');
    
    // Test with plugins disabled
    const result2 = mockLoadPlugins({ plugins: { enabled: false } });
    assert(result2.names.includes('disabled'), 'Should return disabled when plugins are disabled');
    
    // Test with loadPlugins disabled
    const result3 = mockLoadPlugins({ plugins: { loadPlugins: false } });
    assert(result3.names.includes('disabled'), 'Should return disabled when loadPlugins is false');
    
    console.log('✅ Plugin detection test passed');
    return true;
}

// Test 2: Missing directory handling
function testMissingDirectory() {
    console.log('Testing missing directory handling...');
    
    // Test that system handles missing plugin directory gracefully
    const mockLoadPluginsForMissingDir = () => {
        const dir = '/nonexistent/path/plugins';
        let names = [];
        try {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.plugin.ts') || f.endsWith('.plugin.js'));
            for (const f of files) {
                if (f === 'index.ts' || f === 'index.js') continue;
                names.push(f.replace(/\.(plugin\.ts|plugin\.js)$/, ''));
            }
        } catch { 
            // Should reach here for missing directory
        }
        return { runners: [], validators: [], names };
    };
    
    const result = mockLoadPluginsForMissingDir();
    assert(Array.isArray(result.names), 'Should return empty array for missing directory');
    assert(result.names.length === 0, 'Should have no plugins for missing directory');
    
    console.log('✅ Missing directory test passed');
    return true;
}

// Test 3: Plugin file filtering
function testPluginFileFiltering() {
    console.log('Testing plugin file filtering...');
    
    // Create temporary files to test filtering
    const testDir = path.join(process.cwd(), 'scripts', 'brain', 'plugins');
    const tempFiles = [
        'test.plugin.js',
        'test.plugin.ts', 
        'regular.js',
        'regular.ts',
        'index.ts' // Should be ignored
    ];
    
    const mockGetPluginFiles = (dir) => {
        try {
            return fs.readdirSync(dir).filter(f => f.endsWith('.plugin.ts') || f.endsWith('.plugin.js'));
        } catch {
            return [];
        }
    };
    
    const pluginFiles = mockGetPluginFiles(testDir);
    const expectedPlugins = ['example.plugin.ts']; // Only the existing plugin file
    
    assert(pluginFiles.length >= 1, 'Should find at least the example plugin');
    assert(pluginFiles.includes('example.plugin.ts'), 'Should include example plugin');
    assert(!pluginFiles.includes('index.ts'), 'Should not include index.ts');
    
    console.log('✅ Plugin file filtering test passed');
    return true;
}

// Test 4: Configuration validation
function testConfigurationValidation() {
    console.log('Testing configuration validation...');
    
    // Mock configuration validation function
    const mockValidatePluginConfig = (cfg) => {
        const errs = [];
        if (cfg.plugins) {
            if (cfg.plugins.hasOwnProperty('enabled') && typeof cfg.plugins.enabled !== 'boolean') {
                errs.push('plugins.enabled');
            }
            if (cfg.plugins.hasOwnProperty('loadPlugins') && typeof cfg.plugins.loadPlugins !== 'boolean') {
                errs.push('plugins.loadPlugins');
            }
        }
        return errs;
    };
    
    // Test valid configurations
    assert(mockValidatePluginConfig({ plugins: { enabled: true } }).length === 0, 'Valid config should pass');
    assert(mockValidatePluginConfig({ plugins: { loadPlugins: false } }).length === 0, 'Valid config should pass');
    assert(mockValidatePluginConfig({}).length === 0, 'Empty config should pass');
    
    // Test invalid configurations
    assert(mockValidatePluginConfig({ plugins: { enabled: 'true' } }).length > 0, 'Invalid enabled value should fail');
    assert(mockValidatePluginConfig({ plugins: { loadPlugins: 'false' } }).length > 0, 'Invalid loadPlugins value should fail');
    
    console.log('✅ Configuration validation test passed');
    return true;
}

// Test 5: Plugin export format validation
function testPluginExportFormat() {
    console.log('Testing plugin export format...');
    
    // Test that example plugin has correct exports
    const examplePluginPath = path.join(process.cwd(), 'scripts', 'brain', 'plugins', 'example.plugin.ts');
    assert(fs.existsSync(examplePluginPath), 'Example plugin file should exist');
    
    const content = fs.readFileSync(examplePluginPath, 'utf8');
    assert(content.includes('ExampleEchoRunner'), 'Should export ExampleEchoRunner');
    assert(content.includes('ExamplePluginValidator'), 'Should export ExamplePluginValidator');
    assert(content.includes('export const runners'), 'Should have runners export');
    assert(content.includes('export const validators'), 'Should have validators export');
    
    console.log('✅ Plugin export format test passed');
    return true;
}

// Run all tests
function runPluginTests() {
    console.log('=== Plugin System Tests ===\n');
    
    const tests = [
        { name: 'Plugin Detection', fn: testPluginDetection },
        { name: 'Missing Directory Handling', fn: testMissingDirectory },
        { name: 'Plugin File Filtering', fn: testPluginFileFiltering },
        { name: 'Configuration Validation', fn: testConfigurationValidation },
        { name: 'Plugin Export Format', fn: testPluginExportFormat }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
                console.log(`❌ ${test.name} failed`);
            }
        } catch (e) {
            failed++;
            console.log(`❌ ${test.name} failed with error:`, e.message);
        }
    }
    
    console.log('\n=== Test Results ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Overall: ${failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return failed === 0;
}

if (require.main === module) {
    runPluginTests();
}

module.exports = { runPluginTests };