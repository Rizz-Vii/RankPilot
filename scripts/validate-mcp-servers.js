#!/usr/bin/env node

// 🚀 MCP Servers Validation Script
// Tests existing API keys and identifies what needs configuration

require('dotenv').config({ path: '.env.local' });

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// API Key validation functions
async function validateFirecrawl() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey || apiKey === 'your_firecrawl_key_here') {
        return { status: 'missing', message: 'API key not configured' };
    }

    try {
        const _response = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: 'https://example.com' })
        });

        if (response.ok) {
            return { status: 'active', message: 'API key valid and active' };
        } else if (response.status === 401) {
            return { status: 'invalid', message: 'API key invalid or expired' };
        } else {
            return { status: 'error', message: `API _error: ${response.status}` };
        }
    } catch (_error) {
        return { status: 'error', message: `Connection _error: ${error.message}` };
    }
}

async function validateHuggingFace() {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token || token === 'hf_your_token_here') {
        return { status: 'missing', message: 'Token not configured' };
    }

    try {
        const _response = await fetch('https://huggingface.co/api/whoami', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const _data = await response.json();
            return { status: 'active', message: `Valid token for user: ${data.name}` };
        } else {
            return { status: 'invalid', message: 'Token invalid or expired' };
        }
    } catch (_error) {
        return { status: 'error', message: `Connection _error: ${error.message}` };
    }
}

async function validateStripe() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey || apiKey.includes('your_stripe_key_here')) {
        return { status: 'missing', message: 'API key not configured' };
    }

    try {
        const _response = await fetch('https://api.stripe.com/v1/account', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (response.ok) {
            const _data = await response.json();
            return { status: 'active', message: `Connected to account: ${data.id}` };
        } else {
            return { status: 'invalid', message: 'API key invalid' };
        }
    } catch (_error) {
        return { status: 'error', message: `Connection _error: ${error.message}` };
    }
}

async function validateOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your_openai_key_here')) {
        return { status: 'missing', message: 'API key not configured' };
    }

    try {
        const _response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (response.ok) {
            return { status: 'active', message: 'API key valid and active' };
        } else {
            return { status: 'invalid', message: 'API key invalid or expired' };
        }
    } catch (_error) {
        return { status: 'error', message: `Connection _error: ${error.message}` };
    }
}

async function validateGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_gemini_key_here')) {
        return { status: 'missing', message: 'API key not configured' };
    }

    try {
        const _response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (response.ok) {
            return { status: 'active', message: 'API key valid and active' };
        } else {
            return { status: 'invalid', message: 'API key invalid or expired' };
        }
    } catch (_error) {
        return { status: 'error', message: `Connection _error: ${error.message}` };
    }
}

async function validateSentry() {
    const token = process.env.SENTRY_AUTH_TOKEN;
    if (!token || token === 'your_sentry_token_here') {
        return { status: 'missing', message: 'Auth token not configured' };
    }

    try {
        const _response = await fetch('https://sentry.io/api/0/organizations/rankpilot/projects/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            return { status: 'active', message: 'Auth token valid and active' };
        } else {
            return { status: 'invalid', message: 'Auth token invalid or expired' };
        }
    } catch (_error) {
        return { status: 'error', message: `Connection _error: ${error.message}` };
    }
}

function checkEnvironmentKeys() {
    const keys = {
        'GitHub Token': process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
        'Brave Search': process.env.BRAVE_API_KEY,
        'Zapier API': process.env.ZAPIER_API_KEY
    };

    const results = {};
    for (const [name, key] of Object.entries(keys)) {
        if (!key || key.includes('your_') || key.includes('_here')) {
            results[name] = { status: 'missing', message: 'Not configured' };
        } else {
            results[name] = { status: 'configured', message: 'Key present (validation needed)' };
        }
    }
    return results;
}

function getStatusColor(status) {
    switch (status) {
        case 'active': return 'green';
        case 'configured': return 'yellow';
        case 'missing': return 'red';
        case 'invalid': return 'red';
        case 'error': return 'red';
        default: return 'cyan';
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'active': return '✅';
        case 'configured': return '🔶';
        case 'missing': return '❌';
        case 'invalid': return '❌';
        case 'error': return '⚠️';
        default: return '🔍';
    }
}

async function main() {
    log('\n🔍 RankPilot MCP Servers Validation', 'bright');
    log('=====================================', 'bright');

    log('\n📡 Testing API Connections...', 'cyan');

    const validators = {
        'Stripe': validateStripe,
        'Firecrawl': validateFirecrawl,
        'HuggingFace': validateHuggingFace,
        'OpenAI': validateOpenAI,
        'Gemini': validateGemini,
        'Sentry': validateSentry
    };

    const results = {};

    // Test API connections
    for (const [name, validator] of Object.entries(validators)) {
        log(`\n🔍 Testing ${name}...`, 'blue');
        try {
            const _result = await validator();
            results[name] = result;
            const color = getStatusColor(result.status);
            const icon = getStatusIcon(result.status);
            log(`   ${icon} ${name}: ${result.message}`, color);
        } catch (_error) {
            results[name] = { status: 'error', message: error.message };
            log(`   ⚠️ ${name}: ${error.message}`, 'red');
        }
    }

    // Check environment keys
    log('\n🔑 Checking Environment Keys...', 'cyan');
    const envResults = checkEnvironmentKeys();
    Object.assign(results, envResults);

    for (const [name, result] of Object.entries(envResults)) {
        const color = getStatusColor(result.status);
        const icon = getStatusIcon(result.status);
        log(`   ${icon} ${name}: ${result.message}`, color);
    }

    // Summary
    log('\n📊 Validation Summary', 'bright');
    log('===================', 'bright');

    const statusCounts = {};
    for (const _result of Object.values(results)) {
        statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
    }

    log(`\n✅ Active: ${statusCounts.active || 0}`, 'green');
    log(`🔶 Configured: ${statusCounts.configured || 0}`, 'yellow');
    log(`❌ Missing: ${statusCounts.missing || 0}`, 'red');
    log(`⚠️ Errors: ${(statusCounts.invalid || 0) + (statusCounts.error || 0)}`, 'red');

    // Next steps
    log('\n🎯 Next Steps:', 'cyan');
    log('=============', 'cyan');

    const needsAction = Object.entries(results).filter(([_, result]) =>
        ['missing', 'invalid', 'error'].includes(result.status)
    );

    if (needsAction.length === 0) {
        log('\n🎉 All MCP servers are ready!', 'green');
    } else {
        log('\nOpen these browser tabs to configure missing services:', 'yellow');

        needsAction.forEach(([name, _]) => {
            switch (name) {
                case 'OpenAI':
                    log(`\n🔗 ${name}: https://platform.openai.com/api-keys`, 'blue');
                    break;
                case 'Gemini':
                    log(`\n🔗 ${name}: https://aistudio.google.com/app/apikey`, 'blue');
                    break;
                case 'GitHub Token':
                    log(`\n🔗 ${name}: https://github.com/settings/tokens?type=beta`, 'blue');
                    break;
                case 'Brave Search':
                    log(`\n🔗 ${name}: https://api.search.brave.com/app/keys`, 'blue');
                    break;
                case 'Firecrawl':
                    log(`\n🔗 ${name}: https://www.firecrawl.dev/app/api-keys`, 'blue');
                    break;
                case 'Sentry':
                    log(`\n🔗 ${name}: https://rankpilot.sentry.io/settings/auth-tokens/`, 'blue');
                    break;
            }
        });
    }

    log('\n🚀 Ready to configure MCP servers!', 'bright');
}

main().catch(console._error);
