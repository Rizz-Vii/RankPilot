import fs from 'fs';
import path from 'path';
import { collectDiagnostics } from '../diagnostics/collect';
import type { MemoryEvent } from '../state/memory';

let recordMemory: undefined | ((ev: MemoryEvent) => void);
try { recordMemory = require('../state/memory').recordMemory as (ev: MemoryEvent) => void; } catch { }

export interface Mission {
    ts: number;
    summary: string;
    diagnostics: {
        typecheck: { errors: number; rawExcerpt: string };
        lint: { errors: number; warnings: number; rawExcerpt: string };
    };
    immediateSteps: { id: string; title: string; rationale: string }[];
    status: 'active' | 'clean';
}


export function runMissionCycle(): Mission {
    const thinkDir = path.join(process.cwd(), 'artifacts', 'brain');
    fs.mkdirSync(thinkDir, { recursive: true });
    // Preserve previous mission for delta reporting
    try {
        const currentMissionPath = path.join(thinkDir, 'currentMission.json');
        const prevMissionPath = path.join(thinkDir, 'previousMission.json');
        if (fs.existsSync(currentMissionPath)) {
            fs.copyFileSync(currentMissionPath, prevMissionPath);
        }
    } catch { /* ignore */ }

    const diag = collectDiagnostics();
    const missionHistoryFile = path.join(thinkDir, 'mission-history.jsonl');
    const tsErrors = diag.typecheck.errors;
    const lintErrors = diag.lint.errors;
    const lintWarnings = diag.lint.warnings;

    const thoughts: string[] = [];
    thoughts.push(`# Brain Thinking @ ${new Date().toISOString()}`);
    thoughts.push(`TypeScript errors: ${tsErrors}`);
    thoughts.push(`ESLint errors: ${lintErrors}, warnings: ${lintWarnings}`);
    if (tsErrors > 0) thoughts.push('Observation: Type errors present; prioritizing type stability.');
    if (lintErrors > 0) thoughts.push('Observation: Lint errors degrade code health; auto-fix recommended.');
    if (lintWarnings > 100) thoughts.push('Observation: High warning volume; consider rule refinement or batch suppression strategy.');

    const immediateSteps: Mission['immediateSteps'] = [];
    if (tsErrors > 0) immediateSteps.push({ id: 'fix-types', title: 'Resolve top TypeScript errors', rationale: 'Type stability prerequisite for further refactors.' });
    if (lintErrors > 0) immediateSteps.push({ id: 'lint-autofix', title: 'Run ESLint autofix for safe rules', rationale: 'Reduce toil and surface structural issues.' });
    if (lintWarnings > 0 && lintWarnings <= 200) immediateSteps.push({ id: 'lint-triage', title: 'Triage remaining lint warnings', rationale: 'Convert noisy rules or batch address readability issues.' });
    // Derive top offending TS error files for targeted steps (first 3 unique files)
    if (tsErrors > 0) {
        try {
            const lines = diag.typecheck.rawExcerpt.split(/\n/);
            const fileRe = /(\S+\.ts)\((\d+),(\d+)\): error TS\d+:/;
            const files: string[] = [];
            for (const l of lines) {
                const m = l.match(fileRe);
                if (m) {
                    const f = m[1];
                    if (!files.includes(f)) files.push(f);
                    if (files.length >= 3) break;
                }
            }
            files.forEach((f, idx) => immediateSteps.push({ id: `fix-ts-${idx + 1}`, title: `Fix TS errors in ${f}`, rationale: 'Reduce compiler error count for stability.' }));
        } catch { /* ignore */ }
    }
    if (!immediateSteps.length) thoughts.push('System clean: no immediate remediation required.');

    const mission: Mission = {
        ts: Date.now(),
        summary: immediateSteps.length ? 'Remediation required' : 'Codebase clean',
        diagnostics: {
            typecheck: { errors: tsErrors, rawExcerpt: diag.typecheck.rawExcerpt },
            lint: { errors: lintErrors, warnings: lintWarnings, rawExcerpt: diag.lint.rawExcerpt }
        },
        immediateSteps,
        status: immediateSteps.length ? 'active' : 'clean'
    };

    const thinkingFile = path.join(thinkDir, 'brainThinking.txt');
    fs.appendFileSync(thinkingFile, thoughts.join('\n') + '\n\n');
    const thinkingJsonl = path.join(thinkDir, 'brainThinking.jsonl');
    fs.appendFileSync(thinkingJsonl, JSON.stringify({ ts: mission.ts, thoughts, metrics: { tsErrors, lintErrors, lintWarnings } }) + '\n');

    const missionFile = path.join(thinkDir, 'currentMission.json');
    fs.writeFileSync(missionFile, JSON.stringify(mission, null, 2));
    // Append concise history line
    try { fs.appendFileSync(missionHistoryFile, JSON.stringify({ ts: mission.ts, tsErrors, lintErrors, lintWarnings, steps: mission.immediateSteps.length }) + '\n'); } catch { }

    try { recordMemory && recordMemory({ ts: mission.ts, source: 'brain', kind: 'mission-set', status: mission.status, meta: { tsErrors, lintErrors, lintWarnings, steps: mission.immediateSteps.length } }); } catch { }

    // Optional: enqueue immediate steps into delegation queue with lineage (mission id)
    if (process.env.BRAIN_ENQUEUE_MISSION_STEPS === '1' && mission.immediateSteps.length) {
        try {
            const queueFile = 'sessions/aider-queue.jsonl';
            const nowIso = new Date(mission.ts).toISOString();
            if (!fs.existsSync(queueFile)) {
                fs.mkdirSync('sessions', { recursive: true });
                fs.writeFileSync(queueFile, JSON.stringify({ meta: 'delegation queue (JSON Lines). Each line: pending task.' }) + '\n');
            }
            const existing = fs.readFileSync(queueFile, 'utf8').trim().split(/\n/).slice(1).map((l: string) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
            const existingIds = new Set(existing.map((t: any) => t.taskId));
            const lineage = 'MISSION-' + mission.ts;
            const newLines: string[] = [];
            mission.immediateSteps.forEach((step, idx) => {
                const taskId = `${lineage}-S${idx + 1}`;
                if (existingIds.has(taskId)) return;
                const task = {
                    taskId,
                    summary: `[Mission] ${step.title}`,
                    files: [],
                    status: 'pending',
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    lineage: { missionTs: mission.ts, missionSummary: mission.summary, stepId: step.id }
                };
                newLines.push(JSON.stringify(task));
            });
            if (newLines.length) fs.appendFileSync(queueFile, newLines.join('\n') + '\n');
            try { recordMemory && recordMemory({ ts: Date.now(), source: 'brain', kind: 'mission-enqueue', status: 'ok', meta: { lineage, enqueued: newLines.length } }); } catch { }
        } catch { /* swallow */ }
    }

    return mission;
}

export default { runMissionCycle };
