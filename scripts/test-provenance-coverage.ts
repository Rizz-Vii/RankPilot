#!/usr/bin/env ts-node
// Static provenance coverage audit: flags AI routes lacking middleware enforcement usage.
import fs from 'fs';
import path from 'path';

interface Finding { file: string; reason: string; }

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');

function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full, acc); else if (entry === 'route.ts') acc.push(full);
    }
    return acc;
}

const aiHeuristicPatterns = [
    /openai/i,
    /fallbackOneShot/,
    /multiModelOrchestrator/,
    /conversationalSEOEngine/,
    /neuroSEOOrchestrator/i,
    /executeNeuroLive/,
];

const enforcementPatterns = [/enforceProvenance/, /enforceProvenanceOnChunk/];

const findings: Finding[] = [];
for (const file of walk(apiDir)) {
    const text = fs.readFileSync(file, 'utf8');
    const isAI = aiHeuristicPatterns.some(r => r.test(text));
    if (!isAI) continue;
    const hasEnforcement = enforcementPatterns.some(r => r.test(text));
    if (!hasEnforcement) findings.push({ file: path.relative(process.cwd(), file), reason: 'AI pattern present but no provenance enforcement import' });
}

if (findings.length) {
    console.error('Provenance coverage gaps detected:');
    for (const f of findings) console.error(` - ${f.file}: ${f.reason}`);
    process.exit(1);
}

console.log('All AI heuristic route files include provenance enforcement.');
