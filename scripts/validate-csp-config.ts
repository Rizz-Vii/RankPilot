#!/usr/bin/env node

/**
 * CSP Configuration Validation Script
 * Validates that all CSP configurations are consistent across files
 */

import chalk from 'chalk';
import { readFileSync } from 'fs';

interface CSPConfig {
    file: string;
    scriptSrc: string[];
    connectSrc: string[];
    frameSrc: string[];
}

// Required domains for RankPilot
const REQUIRED_DOMAINS = {
    scriptSrc: [
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://apis.google.com',
        'https://*.firebaseapp.com',
        'https://*.firebase.com',
        'https://js.stripe.com',
        'https://www.google.com',
        'https://www.gstatic.com'
    ],
    connectSrc: [
        'https://*.firebaseapp.com',
        'https://*.firebase.com',
        'https://www.google-analytics.com',
        'https://*.googleapis.com',
        'https://firebase.googleapis.com',
        'https://api.stripe.com'
    ],
    frameSrc: [
        'https://js.stripe.com',
        'https://*.stripe.com',
        'https://www.google.com'
    ]
};

function extractCSPFromMiddleware(): CSPConfig {
    const content = readFileSync('/workspaces/studio/src/middleware.ts', 'utf-8');

    // Extract script-src domains
    const scriptSrcMatch = content.match(/script-src[^"]+/);
    const connectSrcMatch = content.match(/connect-src[^"]+/);
    const frameSrcMatch = content.match(/frame-src[^"]+/);

    return {
        file: 'middleware.ts',
        scriptSrc: scriptSrcMatch ? extractDomains(scriptSrcMatch[0]) : [],
        connectSrc: connectSrcMatch ? extractDomains(connectSrcMatch[0]) : [],
        frameSrc: frameSrcMatch ? extractDomains(frameSrcMatch[0]) : []
    };
}

function extractCSPFromFirebase(): CSPConfig {
    const content = readFileSync('/workspaces/studio/firebase.json', 'utf-8');
    const config = JSON.parse(content);

    const cspHeader = config.hosting?.headers?.[0]?.headers?.find(
        (h: unknown) => h.key === 'Content-Security-Policy'
    )?.value || '';

    return {
        file: 'firebase.json',
        scriptSrc: extractDomains(cspHeader.match(/script-src[^;]+/)?.[0] || ''),
        connectSrc: extractDomains(cspHeader.match(/connect-src[^;]+/)?.[0] || ''),
        frameSrc: extractDomains(cspHeader.match(/frame-src[^;]+/)?.[0] || '')
    };
}

function extractCSPFromNextConfig(): CSPConfig {
    const content = readFileSync('/workspaces/studio/next.config.ts', 'utf-8');

    const cspMatch = content.match(/Content-Security-Policy[\s\S]*?_value:\s*"([^"]+)"/);
    const cspValue = cspMatch?.[1] || '';

    return {
        file: 'next.config.ts',
        scriptSrc: extractDomains(cspValue.match(/script-src[^;]+/)?.[0] || ''),
        connectSrc: extractDomains(cspValue.match(/connect-src[^;]+/)?.[0] || ''),
        frameSrc: extractDomains(cspValue.match(/frame-src[^;]+/)?.[0] || '')
    };
}

function extractDomains(directive: string): string[] {
    return directive
        .split(/\s+/)
        .filter(domain => domain.startsWith('https://'))
        .map(domain => domain.replace(/[+\s]/g, ''));
}

function validateConfig(config: CSPConfig): { passed: boolean; missing: string[]; } {
    const allMissing: string[] = [];

    // Check script-src
    REQUIRED_DOMAINS.scriptSrc.forEach(domain => {
        if (!config.scriptSrc.some(d => d.includes(domain.replace('*', '')) || domain.includes(d.replace('*', '')))) {
            allMissing.push(`script-src: ${domain}`);
        }
    });

    // Check connect-src
    REQUIRED_DOMAINS.connectSrc.forEach(domain => {
        if (!config.connectSrc.some(d => d.includes(domain.replace('*', '')) || domain.includes(d.replace('*', '')))) {
            allMissing.push(`connect-src: ${domain}`);
        }
    });

    // Check frame-src
    REQUIRED_DOMAINS.frameSrc.forEach(domain => {
        if (!config.frameSrc.some(d => d.includes(domain.replace('*', '')) || domain.includes(d.replace('*', '')))) {
            allMissing.push(`frame-src: ${domain}`);
        }
    });

    return {
        passed: allMissing.length === 0,
        missing: allMissing
    };
}

function main() {
    console.log(chalk.blue('🔒 CSP Configuration Validation\n'));

    const configs = [
        extractCSPFromMiddleware(),
        extractCSPFromFirebase(),
        extractCSPFromNextConfig()
    ];

    let allPassed = true;

    configs.forEach(config => {
        const validation = validateConfig(config);

        if (validation.passed) {
            console.log(chalk.green(`✅ ${config.file}: All required domains present`));
        } else {
            console.log(chalk.red(`❌ ${config.file}: Missing domains`));
            validation.missing.forEach(missing => {
                console.log(chalk.yellow(`   - ${missing}`));
            });
            allPassed = false;
        }
    });

    console.log('\n' + chalk.blue('📊 Summary:'));
    if (allPassed) {
        console.log(chalk.green('✅ All CSP configurations are valid'));
    } else {
        console.log(chalk.red('❌ CSP configurations need fixes'));
        console.log(chalk.yellow('💡 Fix the missing domains in the respective files'));
    }

    process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
    main();
}
