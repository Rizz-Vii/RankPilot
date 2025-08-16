export async function runValidators(ctx: any): Promise<{ lint: string; typecheck: string; tests: string; performance?: string }> {
  const cfg = (ctx && ctx.cfg) || {};
  const on = (k: string) => !!(cfg.tools && cfg.tools[k]);
  // For now, we skip to keep no-deps; wiring exists for future enablement.
  return { lint: on('eslint') ? 'skipped' : 'skipped', typecheck: on('typecheck') ? 'skipped' : 'skipped', tests: on('unitTests') ? 'skipped' : 'skipped', performance: 'skipped' };
}

export default { runValidators };
