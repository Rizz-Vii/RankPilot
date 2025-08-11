#!/usr/bin/env ts-node
/** TEST-01: Feature key manifest validation
 * Ensures every canUseFeature('key') / feature gate reference exists in FEATURE_KEYS.md table.
 * And no manifest key is duplicated.
 */
import fs from 'fs';
import path from 'path';

function extractManifestKeys(md: string): string[] {
    const lines = md.split(/\r?\n/).filter(l => l.startsWith('| '));
    const keys: string[] = [];
    for (const l of lines) {
        const cells = l.split('|').map(c => c.trim());
        const key = cells[1];
        if (key && key !== 'Key' && !key.startsWith('---')) keys.push(key);
    }
    return keys;
}

function grepCodeForFeatureKeys(root: string): string[] {
    const matches: string[] = [];
    function walk(dir: string) {
        for (const entry of fs.readdirSync(dir)) {
            const full = path.join(dir, entry);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) { if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== '.next') walk(full); continue; }
            if (!/\.(ts|tsx|js|mjs)$/.test(entry)) continue;
            const content = fs.readFileSync(full, 'utf8');
            const regex = /canUseFeature\(['"]([a-z0-9_]+)['"]\)/g;
            let m: RegExpExecArray | null;
            while ((m = regex.exec(content))) { matches.push(m[1]); }
        }
    }
    walk(root);
    return matches;
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

try {
    const manifest = fs.readFileSync('FEATURE_KEYS.md', 'utf8');
    const manifestKeys = extractManifestKeys(manifest);
    const codeKeys = grepCodeForFeatureKeys('src');
    const missing = uniq(codeKeys.filter(k => !manifestKeys.includes(k)));
    const duplicates = manifestKeys.filter((k, i, arr) => arr.indexOf(k) !== i);
    const failures: string[] = [];
    if (missing.length) failures.push('Missing in manifest: ' + missing.join(','));
    if (duplicates.length) failures.push('Duplicate manifest keys: ' + duplicates.join(','));
    if (failures.length) { console.error('FEATURE KEY AUDIT FAIL', { failures }); process.exit(1); }
    else console.log('FEATURE KEY AUDIT PASS', { manifestCount: manifestKeys.length, referenced: uniq(codeKeys).length });
} catch (e: any) {
    console.error('FEATURE KEY AUDIT ERROR', e.message); process.exit(1);
}
