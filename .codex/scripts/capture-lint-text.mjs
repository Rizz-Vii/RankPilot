#!/usr/bin/env node
// Execute the existing lint script (text output) and synthesize a JSON report compatible with eslint-cluster-plan.
// This bypasses the rushstack patch failure blocking --format json.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runLint() {
    return new Promise((resolve) => {
        const proc = spawn('npm', ['run', 'lint:flat:all', '--silent'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        proc.stdout.on('data', d => { out += d.toString(); });
        proc.stderr.on('data', d => { err += d.toString(); });
        proc.on('close', code => resolve({ code, out, err }));
    });
}

function parse(text) {
    const lines = text.split(/\r?\n/);
    const files = [];
    let current = null;
    const pathRegex = /^\/(?:[\w.-]+\/)+[^:]+$/; // crude: absolute path line
    const ruleRegex = /(@typescript-eslint\/[a-zA-Z0-9-]+|react-hooks\/exhaustive-deps|[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+)$/;
    for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line) continue;
        if (pathRegex.test(line)) {
            if (current) files.push(current);
            current = { filePath: line, messages: [] };
            continue;
        }
        if (!current) continue;
        // Example message fragment includes ruleId at end; capture it
        const lastChunk = line.split(/\s{2,}/).pop() || '';
        const m = ruleRegex.exec(lastChunk);
        if (m) {
            current.messages.push({ ruleId: m[1], message: '', line: 0, severity: line.includes('error') ? 2 : 1 });
        }
    }
    if (current) files.push(current);
    return files;
}

async function main() {
    const outPath = process.argv[2] || '.codex/eslint-report.json';
    const { out } = await runLint();
    const parsed = parse(out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
    console.log(`Synthesized report with ${parsed.length} files -> ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
