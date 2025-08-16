import fs from 'fs';
import path from 'path';

export const defaults = {
  limits: { maxLocAdded: 450, maxFiles: 15 },
  domains: ["backend", "frontend", "docs", "infra", "ops", "data"],
  tools: { codex: true, aider: true, openaiPlanner: true, firecrawl: true, sequential: true, github: false, zapier: false, terminal: true },
  retry: { planner: { retries: 2, backoffMs: [250, 750] } },
  modes: { default: "execute+verify" },
  budget: { token: 60000, timeSeconds: 360 }
};

export function loadConfig(): any {
  const cfgPath = path.join(process.cwd(), 'brain.config.json');
  let cfg: any = { ...defaults };
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const j = JSON.parse(raw);
    cfg = { ...cfg, ...j, limits: { ...defaults.limits, ...(j.limits || {}) }, tools: { ...defaults.tools, ...(j.tools || {}) }, modes: { ...defaults.modes, ...(j.modes || {}) }, budget: { ...defaults.budget, ...(j.budget || {}) } };
  } catch {}
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
  if (cfg.modes && have(cfg.modes, 'default')) {
    if (typeof cfg.modes.default !== 'string') errs.push('modes.default');
  }
  if (cfg.budget) {
    if (!Number.isFinite(cfg.budget.token) || cfg.budget.token < 0) errs.push('budget.token');
    if (!Number.isFinite(cfg.budget.timeSeconds) || cfg.budget.timeSeconds <= 0) errs.push('budget.timeSeconds');
  }
  return errs.length ? { ok: false, errors: errs } : { ok: true };
}

export default { loadConfig, validateConfig, defaults };

