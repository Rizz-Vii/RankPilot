import type { ToolRunner } from '../../../types/brain';

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
export const TypecheckRunner = mk('TypecheckRunner');
export const ESLintRunner = mk('ESLintRunner', ['frontend', 'docs']);
export const PlaywrightRunner = mk('PlaywrightRunner', ['frontend']);

export function getRegistry(): ToolRunner[] {
  return [
    OpenAIPlanner, CodexRunner, AiderRunner, MCPFirecrawl, MCPSequential, MCPGitHub, MCPZapier, TerminalRunner,
    TypecheckRunner, ESLintRunner, PlaywrightRunner
  ];
}

export function getRunnersFor(domain: string, cfg?: any): ToolRunner[] {
  const base = getRegistry();
  const byToggle = (r: ToolRunner) => {
    if (!cfg || !cfg.tools) return true;
    const map: Record<string, string> = {
      OpenAIPlanner: 'openaiPlanner', CodexRunner: 'codex', AiderRunner: 'aider', MCPFirecrawl: 'firecrawl', MCPSequential: 'sequential', MCPGitHub: 'github', MCPZapier: 'zapier', TerminalRunner: 'terminal',
      TypecheckRunner: 'typecheck', ESLintRunner: 'eslint', PlaywrightRunner: 'playwright'
    };
    const key = map[r.name as keyof typeof map];
    return typeof key === 'string' ? cfg.tools[key] !== false : true;
  };
  return base.filter((r) => r.supports(domain)).filter(byToggle).slice(0, 10);
}

export default { getRegistry, getRunnersFor };
