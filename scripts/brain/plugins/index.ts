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
    const dir = path.join(process.cwd(), 'scripts', 'brain', 'plugins');
    let runners: ToolRunner[] = [];
    let validators: LoadedPlugins['validators'] = [];
    const names: string[] = [];
    try {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.plugin.ts') || f.endsWith('.plugin.js'));
        for (const f of files) {
            if (f === 'index.ts' || f === 'index.js') continue;
            try {
                const mod = require(path.join(dir, f)) as BrainPluginModule;
                if (mod.runners?.length) runners.push(...mod.runners);
                if (mod.validators?.length) validators.push(...mod.validators);
                names.push(f.replace(/\.(plugin\.ts|plugin\.js)$/, ''));
            } catch (e) {
                names.push('error:' + f);
            }
        }
    } catch { }
    return { runners, validators, names };
}

export default { loadPlugins };
