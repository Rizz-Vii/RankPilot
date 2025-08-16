import type { ToolRunner } from '../../../types/brain';
import { spawnSync } from 'child_process';
import { loadPlugins } from '../plugins';
import fs from 'fs';
import path from 'path';

function mk(name: string, supportsDomains: string[] = []): ToolRunner {
  return {
    name,
    supports: (domain: string) => supportsDomains.length ? supportsDomains.includes(domain) : true,
    run: async (_plan: any, _opts: any) => ({ ok: true, note: `${name}: stub` })
  };
}

export const OpenAIPlanner = mk('OpenAIPlanner');
export const CodexRunner = mk('CodexRunner');
export const AiderRunner = mk('AiderRunner', ['frontend', 'docs']);
export const MCPFirecrawl = mk('MCPFirecrawl', ['backend', 'ops']);
export const MCPSequential = mk('MCPSequential');
export const MCPGitHub = mk('MCPGitHub', ['backend', 'frontend']);
export const MCPZapier = mk('MCPZapier', ['ops']);
export const TerminalRunner = mk('TerminalRunner');
// Minimal validator/tool names for tests
function runShell(cmd: string, args: string[], options: { timeout?: number } = {}) {
  if (process.env.PB_BRAIN_FORCE_SKIP_BIN === '1') return { ok: false, note: 'skipped:forced' };
  try {
    const r = spawnSync(cmd, args, { 
      stdio: 'pipe',
      timeout: options.timeout || 30000, // 30 second default timeout
      encoding: 'utf8'
    });
    if (r.error && (r.error as any).code === 'ENOENT') return { ok: false, note: 'skipped:missing-binary' };
    if (r.error && (r.error as any).code === 'ETIMEDOUT') return { ok: false, note: 'fail:timeout' };
    
    const output = (r.stdout || '') + (r.stderr || '');
    const success = r.status === 0;
    const note = success ? 'ok' : `fail:${r.status}`;
    
    return { 
      ok: success, 
      note, 
      output: output.slice(0, 500), // Limit output for logging
      exitCode: r.status 
    };
  } catch (e: any) { 
    return { ok: false, note: 'skipped:error', output: e?.message || 'error' }; 
  }
}

export const TypecheckRunner: ToolRunner = {
  name: 'TypecheckRunner',
  supports: () => true,
  run: async () => runShell('npx', ['tsc', '--noEmit'], { timeout: 60000 })
};

export const ESLintRunner: ToolRunner = {
  name: 'ESLintRunner',
  supports: (d: string) => ['frontend', 'docs', 'backend', 'infra', 'ops', 'data'].includes(d),
  run: async () => runShell('npx', ['eslint', '.', '--max-warnings', '0'], { timeout: 60000 })
};

export const PlaywrightRunner: ToolRunner = {
  name: 'PlaywrightRunner',
  supports: (d: string) => ['frontend'].includes(d),
  run: async () => runShell('npm', ['run', 'test:critical'], { timeout: 120000 })
};

export const UnitTestRunner: ToolRunner = {
  name: 'UnitTestRunner',
  supports: (d: string) => ['frontend', 'backend', 'docs'].includes(d),
  run: async () => runShell('npm', ['test'], { timeout: 120000 })
};

export function getRegistry(): ToolRunner[] {
  const base = [
    OpenAIPlanner, CodexRunner, AiderRunner, MCPFirecrawl, MCPSequential, MCPGitHub, MCPZapier, TerminalRunner,
    TypecheckRunner, ESLintRunner, PlaywrightRunner, UnitTestRunner
  ];
  try {
    const plugins = loadPlugins();
    if (plugins.runners.length) return [...base, ...plugins.runners];
  } catch { }
  return base;
}

export function getRunnersFor(domain: string, cfg?: any): ToolRunner[] {
  const base = getRegistry();
  const byToggle = (r: ToolRunner) => {
    if (!cfg || !cfg.tools) return true;
    const map: Record<string, string> = {
      OpenAIPlanner: 'openaiPlanner', CodexRunner: 'codex', AiderRunner: 'aider', MCPFirecrawl: 'firecrawl', MCPSequential: 'sequential', MCPGitHub: 'github', MCPZapier: 'zapier', TerminalRunner: 'terminal',
      TypecheckRunner: 'typecheck', ESLintRunner: 'eslint', PlaywrightRunner: 'playwright', UnitTestRunner: 'unitTests'
    };
    const key = map[r.name as keyof typeof map];
    return typeof key === 'string' ? cfg.tools[key] !== false : true;
  };
  return base.filter((r) => r.supports(domain)).filter(byToggle).slice(0, 10);
}

export default { getRegistry, getRunnersFor };
