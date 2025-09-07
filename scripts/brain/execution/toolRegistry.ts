import { spawnSync } from "child_process";
import type { ToolRunner } from "../../../types/brain";
import { loadPlugins } from "../plugins";

function mk(name: string, supportsDomains: string[] = []): ToolRunner {
  return {
    name,
    supports: (domain: string) =>
      supportsDomains.length ? supportsDomains.includes(domain) : true,
    run: async (_plan: unknown, _opts: unknown) => ({
      ok: true,
      note: `${name}: stub`,
    }),
  };
}

export const OpenAIPlanner = mk("OpenAIPlanner");
export const CodexRunner = mk("CodexRunner");
export const AiderRunner = mk("AiderRunner", ["frontend", "docs"]);
export const MCPFirecrawl = mk("MCPFirecrawl", ["backend", "ops"]);
export const MCPSequential = mk("MCPSequential");
export const MCPGitHub = mk("MCPGitHub", ["backend", "frontend"]);
export const MCPZapier = mk("MCPZapier", ["ops"]);
export const TerminalRunner = mk("TerminalRunner");
// Minimal validator/tool names for tests
function runShell(cmd: string, args: string[]) {
  if (process.env.PB_BRAIN_FORCE_SKIP_BIN === "1")
    return { ok: false, note: "skipped:forced" };
  try {
    const r = spawnSync(cmd, args, { stdio: "ignore" });
    const err: unknown = r.error;
    const code =
      err && typeof err === "object" && "code" in (err as { code?: unknown })
        ? (err as { code?: unknown }).code
        : undefined;
    if (code === "ENOENT") return { ok: false, note: "skipped:missing-binary" };
    return {
      ok: r.status === 0,
      note: r.status === 0 ? "ok" : `fail:${r.status}`,
    };
  } catch {
    return { ok: false, note: "skipped:error" };
  }
}

export const TypecheckRunner: ToolRunner = {
  name: "TypecheckRunner",
  supports: () => true,
  run: async () => runShell("npx", ["tsc", "--noEmit"]),
};

export const ESLintRunner: ToolRunner = {
  name: "ESLintRunner",
  supports: (d: string) =>
    ["frontend", "docs", "backend", "infra", "ops", "data"].includes(d),
  run: async () => runShell("npx", ["eslint", "--version"]),
};

export const PlaywrightRunner: ToolRunner = {
  name: "PlaywrightRunner",
  supports: (d: string) => ["frontend"].includes(d),
  run: async () => runShell("npx", ["playwright", "--version"]),
};

export function getRegistry(): ToolRunner[] {
  const base = [
    OpenAIPlanner,
    CodexRunner,
    AiderRunner,
    MCPFirecrawl,
    MCPSequential,
    MCPGitHub,
    MCPZapier,
    TerminalRunner,
    TypecheckRunner,
    ESLintRunner,
    PlaywrightRunner,
  ];
  try {
    const plugins = loadPlugins();
    if (plugins.runners.length) return [...base, ...plugins.runners];
  } catch {}
  return base;
}

export function getRunnersFor(domain: string, cfg?: unknown): ToolRunner[] {
  const base = getRegistry();
  const byToggle = (r: ToolRunner) => {
    const c = cfg as { tools?: Record<string, unknown> };
    if (!c || !c.tools) return true;
    const map: Record<string, string> = {
      OpenAIPlanner: "openaiPlanner",
      CodexRunner: "codex",
      AiderRunner: "aider",
      MCPFirecrawl: "firecrawl",
      MCPSequential: "sequential",
      MCPGitHub: "github",
      MCPZapier: "zapier",
      TerminalRunner: "terminal",
      TypecheckRunner: "typecheck",
      ESLintRunner: "eslint",
      PlaywrightRunner: "playwright",
    };
    const key = map[r.name as keyof typeof map];
    return typeof key === "string" ? c.tools[key] !== false : true;
  };
  return base
    .filter((r) => r.supports(domain))
    .filter(byToggle)
    .slice(0, 10);
}

export default { getRegistry, getRunnersFor };
