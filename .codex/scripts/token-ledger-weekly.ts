#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';

interface Entry { ts: number; taskId: string; profile: string; input_tokens: number; output_tokens: number; tool_calls: number; success: boolean }
const LEDGER = path.resolve('.codex/token-ledger.jsonl')

function load(): Entry[] {
    if (!fs.existsSync(LEDGER)) return []
    return fs.readFileSync(LEDGER, 'utf8')
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as Entry;
        } catch {
          // ignore malformed lines
          return null;
        }
      })
      .filter(Boolean) as Entry[];
}

function aggregate(entries: Entry[]): Array<{ profile: string; count: number; inTokens: number; outTokens: number; toolCalls: number; success: number; successRate: number }> {
    const weekMs = 7 * 24 * 3600 * 1000;
    const cutoff = Date.now() - weekMs;
    const recent = entries.filter((e) => e.ts >= cutoff);
    const byProfile: Record<string, { count: number; inTokens: number; outTokens: number; toolCalls: number; success: number }> = {};
    for (const e of recent) {
        const b = byProfile[e.profile] || (byProfile[e.profile] = { count: 0, inTokens: 0, outTokens: 0, toolCalls: 0, success: 0 });
        b.count++;
        b.inTokens += e.input_tokens;
        b.outTokens += e.output_tokens;
        b.toolCalls += e.tool_calls;
        if (e.success) b.success++;
    }
    return Object.entries(byProfile).map(([profile, v]) => ({ profile, ...v, successRate: v.count ? v.success / v.count : 0 }));
}

function main(): void {
    const entries = load();
    const agg = aggregate(entries);
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), profiles: agg }, null, 2) + '\n');
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}
