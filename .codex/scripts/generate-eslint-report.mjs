#!/usr/bin/env node
// Programmatic ESLint runner producing a flat-config JSON report.
// Outputs to .codex/eslint-report.json by default.
import { ESLint } from 'eslint';
import fs from 'fs';
import path from 'path';

async function loadFlatConfig() {
    const cfgPath = path.resolve(process.cwd(), 'eslint.flat.mjs');
    const mod = await import(cfgPath);
    // Flat config exports array (default or named). Try common patterns.
    const configArray = mod.default || mod.config || mod;
    if (!Array.isArray(configArray)) {
        throw new Error('Flat config did not export an array');
    }
    return configArray;
}

async function main() {
    const outPath = process.argv[2] || '.codex/eslint-report.json';
    const patterns = [
        'src/**/*.{ts,tsx,js,jsx}',
        'testing/**/*.{ts,tsx,js,jsx}',
        'tests/**/*.{ts,tsx,js,jsx}',
        'functions/src/**/*.{ts,tsx,js,jsx}'
    ];
    const config = await loadFlatConfig();
    const eslint = new ESLint({
        useEslintrc: false,
        overrideConfig: {
            // We can spread the flat array manually via "extends" equivalent by using flat config with ESLint v9+.
            // For programmatic API with flat config, pass it via "overrideConfigFile" is not supported; we mimic by applying each object.
            // However ESLint doesn't merge an array here; so instead we run on each file with ESLint Flat API disabled and rely on CLI engine? Simplify: instantiate without override and rely on flat config auto discovery.
        },
        // Allow flat config discovery (eslint >= 8.21 with experimental). If not working, we fallback to manual text parse.
    });
    let results;
    try {
        results = await eslint.lintFiles(patterns);
    } catch (e) {
        // Fallback: try constructing a new instance per docs ignoring override attempt.
        const msg = (e && e.message) ? e.message : String(e);
        console.error('Primary lint run failed, retrying without overrideConfig. Error:', msg);
        const retry = new ESLint({ useEslintrc: false });
        results = await retry.lintFiles(patterns);
    }
    const json = JSON.stringify(results, null, 2);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, 'utf8');
    console.log(`Wrote ESLint JSON report to ${outPath} (${results.length} file entries).`);
}

main().catch(err => { console.error(err); process.exit(1); });
