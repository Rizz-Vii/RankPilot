type PluginResult = { name?: string; status?: string; note?: string } | unknown;
export async function runValidators(ctx: unknown): Promise<{ lint: string; typecheck: string; tests: string; performance?: string; plugins?: PluginResult[] }> {
  const c = (ctx && typeof ctx === 'object') ? ctx as Record<string, unknown> : {};
  if (c && (c as { forceFail?: boolean }).forceFail) return { lint: 'fail', typecheck: 'skipped', tests: 'skipped', performance: 'skipped', plugins: [] };
  const cfg = (c.cfg && typeof c.cfg === 'object') ? (c.cfg as { tools?: Record<string, unknown> }) : {};
  const on = (k: string) => !!(cfg.tools && Object.prototype.hasOwnProperty.call(cfg.tools, k) && cfg.tools[k]);
  const base = { lint: on('eslint') ? 'skipped' : 'skipped', typecheck: on('typecheck') ? 'skipped' : 'skipped', tests: on('unitTests') ? 'skipped' : 'skipped', performance: 'skipped' };
  const pluginResults: PluginResult[] = [];
  const plugins = (c.plugins && typeof c.plugins === 'object') ? (c.plugins as Record<string, unknown>) : {};
  const validators = Array.isArray(plugins.validators) ? plugins.validators as unknown[] : [];
  if (validators.length) {
    for (const v of validators) {
      if (typeof v !== 'function') continue;
      try { pluginResults.push(await v(ctx)); } catch (e: unknown) { const msg = e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : 'error'; pluginResults.push({ name: 'plugin-error', status: 'error', note: msg }); }
    }
  }
  return { ...base, plugins: pluginResults };
}

export default { runValidators };
