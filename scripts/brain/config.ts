import fs from 'fs';
import path from 'path';

export const defaults = {
  limits: { maxLocAdded: 450, maxFiles: 15 },
  domains: ["backend", "frontend", "docs", "infra", "ops", "data"],
  tools: { codex: true, aider: true, openaiPlanner: true, firecrawl: true, sequential: true, github: false, zapier: false, terminal: true },
  retry: { planner: { retries: 2, backoffMs: [250, 750] } },
  modes: { default: "execute+verify" },
  budget: { token: 60000, timeSeconds: 360 },
  governance: { maxBatchTasks: 10, splitThresholdLoc: 300, budgetStrategy: 'conservative' },
  tokens: { plannerModel: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2000 }
};

export function loadConfig(): {
  limits: { maxLocAdded: number; maxFiles: number };
  domains: string[];
  tools: Record<string, boolean>;
  retry: { planner: { retries: number; backoffMs: number[] } };
  modes: { default: string };
  budget: { token: number; timeSeconds: number };
  governance: { maxBatchTasks: number; splitThresholdLoc: number; budgetStrategy?: string };
  tokens: { plannerModel: string; temperature: number; maxTokens: number };
} {
  const cfgPath = path.join(process.cwd(), 'brain.config.json');
  let cfg: Record<string, unknown> = { ...defaults } as unknown as Record<string, unknown>;
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const j = JSON.parse(raw) as Record<string, unknown>;
    cfg = {
      ...cfg,
      ...j,
      limits: { ...defaults.limits, ...((j.limits as Record<string, unknown>) || {}) },
      tools: { ...defaults.tools, ...((j.tools as Record<string, unknown>) || {}) },
      modes: { ...defaults.modes, ...((j.modes as Record<string, unknown>) || {}) },
      budget: { ...defaults.budget, ...((j.budget as Record<string, unknown>) || {}) }
    };
  } catch { }
  // Environment overrides (lightweight for tests / CI)
  if (process.env.PB_BRAIN_BUDGET_TOKEN) {
    const v = parseInt(process.env.PB_BRAIN_BUDGET_TOKEN, 10);
    if (!isNaN(v)) (cfg as unknown as { budget: { token: number } }).budget.token = v;
  }
  if (process.env.PB_BRAIN_BUDGET_TIME) {
    const v = parseInt(process.env.PB_BRAIN_BUDGET_TIME, 10);
    if (!isNaN(v)) (cfg as unknown as { budget: { timeSeconds: number } }).budget.timeSeconds = v;
  }
  return cfg as unknown as ReturnType<typeof loadConfig>;
}

export function validateConfig(cfg: unknown): { ok: boolean; errors?: string[] } {
  const errs: string[] = [];
  const have = (o: unknown, k: string) => Object.prototype.hasOwnProperty.call((o as Record<string, unknown>) || {}, k);
  const c = (cfg && typeof cfg === 'object') ? cfg as Record<string, unknown> : {} as Record<string, unknown>;
  const limits = c.limits as { maxLocAdded?: unknown; maxFiles?: unknown } | undefined;
  if (limits) {
    if (!Number.isFinite(limits.maxLocAdded as number) || (limits.maxLocAdded as number) <= 0) errs.push('limits.maxLocAdded');
    if (!Number.isFinite(limits.maxFiles as number) || (limits.maxFiles as number) <= 0) errs.push('limits.maxFiles');
  }
  const tools = c.tools as Record<string, unknown> | undefined;
  if (tools) {
    Object.keys(tools).forEach((k) => { if (typeof tools[k] !== 'boolean') errs.push(`tools.${k}`); });
  }
  const modes = c.modes as { default?: unknown } | undefined;
  if (modes && have(modes, 'default')) {
    if (typeof modes.default !== 'string') errs.push('modes.default');
  }
  const budget = c.budget as { token?: unknown; timeSeconds?: unknown } | undefined;
  if (budget) {
    if (!Number.isFinite(budget.token as number) || (budget.token as number) < 0) errs.push('budget.token');
    if (!Number.isFinite(budget.timeSeconds as number) || (budget.timeSeconds as number) <= 0) errs.push('budget.timeSeconds');
  }
  const governance = c.governance as { maxBatchTasks?: unknown; splitThresholdLoc?: unknown; budgetStrategy?: unknown } | undefined;
  if (governance) {
    if (!Number.isFinite(governance.maxBatchTasks as number) || (governance.maxBatchTasks as number) <= 0) errs.push('governance.maxBatchTasks');
    if (!Number.isFinite(governance.splitThresholdLoc as number) || (governance.splitThresholdLoc as number) < 0) errs.push('governance.splitThresholdLoc');
    if (governance.budgetStrategy && typeof governance.budgetStrategy !== 'string') errs.push('governance.budgetStrategy');
  }
  const tokens = c.tokens as { plannerModel?: unknown; temperature?: unknown; maxTokens?: unknown } | undefined;
  if (tokens) {
    if (tokens.plannerModel && typeof tokens.plannerModel !== 'string') errs.push('tokens.plannerModel');
    if (!Number.isFinite(tokens.temperature as number) || (tokens.temperature as number) < 0 || (tokens.temperature as number) > 2) errs.push('tokens.temperature');
    if (!Number.isFinite(tokens.maxTokens as number) || (tokens.maxTokens as number) <= 0) errs.push('tokens.maxTokens');
  }
  return errs.length ? { ok: false, errors: errs } : { ok: true };
}

export default { loadConfig, validateConfig, defaults };
