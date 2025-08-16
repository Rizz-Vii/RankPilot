import fs from 'fs';
import path from 'path';

export const defaults = {
  limits: { maxLocAdded: 450, maxFiles: 15 },
  domains: ["backend", "frontend", "docs", "infra", "ops", "data"],
  tools: { codex: true, aider: true, openaiPlanner: true, firecrawl: true, sequential: true, github: false, zapier: false, terminal: true },
  plugins: { enabled: true, loadPlugins: true },
  retry: { planner: { retries: 2, backoffMs: [250, 750] } },
  modes: { default: "execute+verify" },
  budget: { token: 60000, timeSeconds: 360 },
  governance: { maxBatchTasks: 10, splitThresholdLoc: 300, budgetStrategy: 'conservative' },
  tokens: { plannerModel: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2000 }
};

export function loadConfig(): any {
  const cfgPath = path.join(process.cwd(), 'brain.config.json');
  let cfg: any = { ...defaults };
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const j = JSON.parse(raw);
    cfg = { ...cfg, ...j, limits: { ...defaults.limits, ...(j.limits || {}) }, tools: { ...defaults.tools, ...(j.tools || {}) }, plugins: { ...defaults.plugins, ...(j.plugins || {}) }, modes: { ...defaults.modes, ...(j.modes || {}) }, budget: { ...defaults.budget, ...(j.budget || {}) } };
  } catch { }
  // Environment overrides (lightweight for tests / CI)
  if (process.env.PB_BRAIN_BUDGET_TOKEN) {
    const v = parseInt(process.env.PB_BRAIN_BUDGET_TOKEN, 10);
    if (!isNaN(v)) cfg.budget.token = v;
  }
  if (process.env.PB_BRAIN_BUDGET_TIME) {
    const v = parseInt(process.env.PB_BRAIN_BUDGET_TIME, 10);
    if (!isNaN(v)) cfg.budget.timeSeconds = v;
  }
  return cfg;
}

export function validateConfig(cfg: any): { ok: boolean; errors?: string[] } {
  const errs: string[] = [];
  const have = (o: any, k: string) => Object.prototype.hasOwnProperty.call(o || {}, k);
  if (cfg.limits) {
    if (!Number.isFinite(cfg.limits.maxLocAdded) || cfg.limits.maxLocAdded <= 0) errs.push('limits.maxLocAdded');
    if (!Number.isFinite(cfg.limits.maxFiles) || cfg.limits.maxFiles <= 0) errs.push('limits.maxFiles');
  }
  if (cfg.tools) {
    Object.keys(cfg.tools).forEach((k) => { if (typeof cfg.tools[k] !== 'boolean') errs.push(`tools.${k}`); });
  }
  if (cfg.plugins) {
    if (cfg.plugins.hasOwnProperty('enabled') && typeof cfg.plugins.enabled !== 'boolean') errs.push('plugins.enabled');
    if (cfg.plugins.hasOwnProperty('loadPlugins') && typeof cfg.plugins.loadPlugins !== 'boolean') errs.push('plugins.loadPlugins');
  }
  if (cfg.modes && have(cfg.modes, 'default')) {
    if (typeof cfg.modes.default !== 'string') errs.push('modes.default');
  }
  if (cfg.budget) {
    if (!Number.isFinite(cfg.budget.token) || cfg.budget.token < 0) errs.push('budget.token');
    if (!Number.isFinite(cfg.budget.timeSeconds) || cfg.budget.timeSeconds <= 0) errs.push('budget.timeSeconds');
  }
  if (cfg.governance) {
    if (!Number.isFinite(cfg.governance.maxBatchTasks) || cfg.governance.maxBatchTasks <= 0) errs.push('governance.maxBatchTasks');
    if (!Number.isFinite(cfg.governance.splitThresholdLoc) || cfg.governance.splitThresholdLoc < 0) errs.push('governance.splitThresholdLoc');
    if (cfg.governance.budgetStrategy && typeof cfg.governance.budgetStrategy !== 'string') errs.push('governance.budgetStrategy');
  }
  if (cfg.tokens) {
    if (cfg.tokens.plannerModel && typeof cfg.tokens.plannerModel !== 'string') errs.push('tokens.plannerModel');
    if (!Number.isFinite(cfg.tokens.temperature) || cfg.tokens.temperature < 0 || cfg.tokens.temperature > 2) errs.push('tokens.temperature');
    if (!Number.isFinite(cfg.tokens.maxTokens) || cfg.tokens.maxTokens <= 0) errs.push('tokens.maxTokens');
  }
  return errs.length ? { ok: false, errors: errs } : { ok: true };
}

export default { loadConfig, validateConfig, defaults };
