import fs from 'fs';
import path from 'path';
import type { ToolRunner } from '../../../types/brain';

export interface BrainPluginModule {
    runners?: ToolRunner[];
    validators?: Array<(ctx: any) => Promise<{ name: string; status: string; note?: string }>>;
}

export interface LoadedPlugins {
    runners: ToolRunner[];
    validators: BrainPluginModule['validators'];
    names: string[];
}

export function loadPlugins(): LoadedPlugins {
    // Detect whether we're executing from the compiled dist output or directly from TS sources.
    // When compiled, this file lives at dist/brain/scripts/brain/plugins/index.js and __dirname points there.
    // In that scenario we must NOT attempt to require .ts source files (Node cannot parse TS) – instead load the .js artifacts.
    const compiledDirCandidate = __dirname; // if running from dist this exists with .js files
    const sourceDirCandidate = path.join(process.cwd(), 'scripts', 'brain', 'plugins');
    const runningFromDist = /dist[\\/ ]brain[\\/ ]/.test(compiledDirCandidate) && fs.existsSync(path.join(compiledDirCandidate, 'index.js'));
    const dir = runningFromDist && fs.existsSync(compiledDirCandidate)
        ? compiledDirCandidate
        : sourceDirCandidate;

    let runners: ToolRunner[] = [];
    let validators: LoadedPlugins['validators'] = [];
    const names: string[] = [];
    try {
        // Only include .ts plugins when running directly from sources (dev / ts-node scenario)
        const allowTs = !runningFromDist;
        const files = fs.readdirSync(dir).filter(f => (
            f.endsWith('.plugin.js') || (allowTs && f.endsWith('.plugin.ts'))
        ));
        for (const f of files) {
            if (f === 'index.ts' || f === 'index.js') continue;
            try {
                const full = path.join(dir, f);
                const mod = require(full) as BrainPluginModule;
                if (mod.runners?.length) runners.push(...mod.runners);
                if (mod.validators?.length) validators.push(...mod.validators);
                names.push(f.replace(/\.(plugin\.ts|plugin\.js)$/, ''));
            } catch (e) {
                names.push('error:' + f);
                console.error('[plugins] failed to load module', f, e);
            }
        }
    } catch (e) {
        // Swallow directory read errors silently; absence of plugins is acceptable.
        console.error('[plugins] plugin directory read failed', (e as Error).message);
    }
    return { runners, validators, names };
}

export default { loadPlugins };
