import { ESLintRunner, TypecheckRunner, PlaywrightRunner } from '../execution/toolRegistry';

export async function runValidators(ctx: any): Promise<{ lint: string; typecheck: string; tests: string; performance?: string; plugins?: any[] }> {
  const cfg = (ctx && ctx.cfg) || {};
  const on = (k: string) => !!(cfg.tools && cfg.tools[k]);
  
  // Initialize results as skipped
  let lint = 'skipped';
  let typecheck = 'skipped';
  let tests = 'skipped';
  let performance = 'skipped';
  
  // Run enabled validators and map exit codes
  if (on('eslint')) {
    try {
      const result = await ESLintRunner.run({}, {});
      lint = result.ok ? 'ok' : 'fail';
    } catch (e) {
      lint = 'fail';
    }
  }
  
  if (on('typecheck')) {
    try {
      const result = await TypecheckRunner.run({}, {});
      typecheck = result.ok ? 'ok' : 'fail';
    } catch (e) {
      typecheck = 'fail';
    }
  }
  
  if (on('unitTests')) {
    // For unit tests, we'll try to run a basic test command
    try {
      const { spawnSync } = await import('child_process');
      const result = spawnSync('npm', ['test', '--', '--passWithNoTests'], { stdio: 'ignore' });
      tests = result.status === 0 ? 'ok' : 'fail';
    } catch (e) {
      tests = 'fail';
    }
  }
  
  if (on('playwright')) {
    try {
      const result = await PlaywrightRunner.run({}, {});
      performance = result.ok ? 'ok' : 'fail';
    } catch (e) {
      performance = 'fail';
    }
  }
  
  // Handle plugin validators
  const pluginResults: any[] = [];
  if (ctx.plugins?.validators?.length) {
    for (const v of ctx.plugins.validators) {
      try { pluginResults.push(await v(ctx)); } catch (e: any) { pluginResults.push({ name: 'plugin-error', status: 'error', note: e?.message || 'error' }); }
    }
  }
  
  // Apply forced fail mechanism - force at least one validator to fail
  if (ctx?.forceFail) {
    // If all validators are skipped, force lint to fail
    if (lint === 'skipped' && typecheck === 'skipped' && tests === 'skipped' && performance === 'skipped') {
      lint = 'fail';
    } else {
      // Force the first enabled validator to fail
      if (lint !== 'skipped') lint = 'fail';
      else if (typecheck !== 'skipped') typecheck = 'fail';
      else if (tests !== 'skipped') tests = 'fail';
      else if (performance !== 'skipped') performance = 'fail';
    }
  }
  
  return { lint, typecheck, tests, performance, plugins: pluginResults };
}

export default { runValidators };
