#!/usr/bin/env ts-node
import fs from 'fs';

interface TaskMeta { id: string; summary: string; files?: string[]; estLoc?: number; previousFailures?: number; domains?: string[] }
interface Decision { profile: string; reason: string }


function estimateSemanticProbability(t: TaskMeta): number {
    const summary = (t.summary || '').toLowerCase()
    const keywords = ['refactor', 'architect', 'race', 'concurrency', 'auth', 'finance', 'scheduler', 'planner', 'state']
    let score = 0
    for (const k of keywords) if (summary.includes(k)) score += 1
    if ((t.files || []).some(f => f.includes('/lib/'))) score += 0.5
    return Math.min(1, score / 5)
}

function decide(task: TaskMeta): Decision {
    const sem = estimateSemanticProbability(task)
    const loc = task.estLoc ?? 0
    const failures = task.previousFailures ?? 0
    if (failures >= 2 && sem > 0.2) return { profile: 'balanced', reason: 'escalate after failures' }
    if (sem >= 0.6) return { profile: 'deep', reason: 'high semantic probability' }
    if (loc < 160 && sem < 0.25) return { profile: 'mini', reason: 'mechanical low semantic small LOC' }
    return { profile: 'balanced', reason: 'default middle ground' }
}

function main() {
    const raw = fs.readFileSync(0, 'utf8') // read stdin JSON
    const task: TaskMeta = JSON.parse(raw)
    const decision = decide(task)
    process.stdout.write(JSON.stringify(decision) + '\n')
}

if (require.main === module) main()
