export async function runValidators(ctx: any): Promise<{ lint: string; typecheck: string; tests: string; performance?: string; plugins?: any[] }> {
  if (ctx?.forceFail) return { lint: 'fail', typecheck: 'skipped', tests: 'skipped', performance: 'skipped', plugins: [] };
  const cfg = (ctx && ctx.cfg) || {};
  const on = (k: string) => !!(cfg.tools && cfg.tools[k]);
  const base = { lint: on('eslint') ? 'skipped' : 'skipped', typecheck: on('typecheck') ? 'skipped' : 'skipped', tests: on('unitTests') ? 'skipped' : 'skipped', performance: 'skipped' };
  const pluginResults: any[] = [];
  if (ctx.plugins?.validators?.length) {
    for (const v of ctx.plugins.validators) {
      try { pluginResults.push(await v(ctx)); } catch (e: any) { pluginResults.push({ name: 'plugin-error', status: 'error', note: e?.message || 'error' }); }
    }
  }
  return { ...base, plugins: pluginResults };
}

export default { runValidators };
