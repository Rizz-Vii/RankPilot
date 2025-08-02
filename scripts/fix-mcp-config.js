#!/usr/bin/env node

/**
 * 🚀 MCP Configuration Fixer
 * Safely updates mcp.json with environment variables
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const CONFIG_PATH = path.join(process.cwd(), 'mcp.json');

function fixMcpConfiguration() {
    console.log('🔧 MCP Configuration Fixer');
    console.log('===========================');

    try {
        // Read the raw file first to check for issues
        const rawContent = fs.readFileSync(CONFIG_PATH, 'utf8');

        // Clean any potential control characters
        const cleanContent = rawContent.replace(/[\x00-\x1F\x7F]/g, '');

        // Parse the cleaned JSON
        const config = JSON.parse(cleanContent);

        console.log('✅ Successfully parsed mcp.json');

        // Environment variables mapping
        const envMapping = {
            'firecrawl_api_key': process.env.FIRECRAWL_API_KEY || 'fc-your_firecrawl_api_key_here',
            'stripe_api_key': process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_key_here',
            'huggingface_token': process.env.HUGGINGFACE_TOKEN || 'hf_your_token_here',
            'sentry_auth_token': process.env.SENTRY_AUTH_TOKEN || 'your_sentry_token_here',
            'zapier_api_key': process.env.ZAPIER_API_KEY || 'your_zapier_key_here',
            'github_token': process.env.GITHUB_PERSONAL_ACCESS_TOKEN || 'github_pat_your_token_here',
            'openai_api_key': process.env.OPENAI_API_KEY || 'sk-your_openai_key_here'
        };

        // Update server configurations with environment variables
        if (config.mcpServers) {
            Object.keys(config.mcpServers).forEach(serverName => {
                const server = config.mcpServers[serverName];
                if (server.env) {
                    Object.keys(server.env).forEach(envKey => {
                        const mappingKey = envKey.toLowerCase().replace(/_/g, '_');
                        if (envMapping[mappingKey]) {
                            server.env[envKey] = envMapping[mappingKey];
                            console.log(`✅ Updated ${serverName}.${envKey}`);
                        }
                    });
                }
            });
        }

        // Write the updated configuration
        const updatedContent = JSON.stringify(config, null, 4);
        fs.writeFileSync(CONFIG_PATH, updatedContent, 'utf8');

        console.log('\n🎯 MCP Configuration Successfully Updated!');
        console.log('==========================================');

        // Show configured servers
        if (config.mcpServers) {
            console.log('\n📊 Configured MCP Servers:');
            Object.keys(config.mcpServers).forEach(serverName => {
                const server = config.mcpServers[serverName];
                const envCount = server.env ? Object.keys(server.env).length : 0;
                console.log(`  ✅ ${serverName} (${envCount} environment variables)`);
            });
        }

        console.log('\n🚀 Next Steps:');
        console.log('===============');
        console.log('1. Restart VS Code to load new MCP configuration');
        console.log('2. Run: node scripts/validate-mcp-servers.js');
        console.log('3. Test MCP functionality in VS Code');

        return true;

    } catch (_error) {
        console.error('❌ Error fixing MCP configuration:', error.message);

        if (error instanceof SyntaxError) {
            console.log('\n🔍 JSON Syntax Error Details:');
            console.log('Line/Column info:', error.message);
            console.log('\n💡 Suggestions:');
            console.log('1. Check for extra commas or missing quotes');
            console.log('2. Validate JSON syntax online');
            console.log('3. Restore from backup if available');
        }

        return false;
    }
}

// Show current environment status
function showEnvironmentStatus() {
    console.log('\n📋 Environment Variables Status:');
    console.log('=================================');

    const checkEnv = (key, _value) => {
        const status = value && value !== `your_${key.toLowerCase()}_here` ? '✅' : '❌';
        const display = value ? `${value.substring(0, 20)}...` : 'Not set';
        console.log(`${status} ${key}: ${display}`);
    };

    checkEnv('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
    checkEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    checkEnv('HUGGINGFACE_TOKEN', process.env.HUGGINGFACE_TOKEN);
    checkEnv('GITHUB_PERSONAL_ACCESS_TOKEN', process.env.GITHUB_PERSONAL_ACCESS_TOKEN);
    checkEnv('SENTRY_AUTH_TOKEN', process.env.SENTRY_AUTH_TOKEN);
    checkEnv('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY);
    checkEnv('ZAPIER_API_KEY', process.env.ZAPIER_API_KEY);
}

// Main execution
async function main() {
    showEnvironmentStatus();
    const success = fixMcpConfiguration();

    if (success) {
        console.log('\n🎉 MCP Configuration Fixed Successfully!');
        process.exit(0);
    } else {
        console.log('\n💥 MCP Configuration Fix Failed!');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { fixMcpConfiguration, showEnvironmentStatus };
