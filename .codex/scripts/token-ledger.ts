#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';

interface Entry { ts: number; taskId: string; profile: string; input_tokens: number; output_tokens: number; tool_calls: number; success: boolean }
const LEDGER = path.resolve('.codex/token-ledger.jsonl')

function record(e: Entry) {
    fs.appendFileSync(LEDGER, JSON.stringify(e) + '\n')
}

if (require.main === module) {
    const raw = fs.readFileSync(0, 'utf8')
    const e: Entry = JSON.parse(raw)
    record(e)
}
