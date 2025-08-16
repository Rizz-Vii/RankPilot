import { getRunnersFor } from '../execution/toolRegistry';

export async function runValidators(ctx: any): Promise<{ lint: string; typecheck: string; tests: string; performance?: string; plugins?: any[] }> {
  if (ctx?.forceFail) return { lint: 'fail', typecheck: 'skipped', tests: 'skipped', performance: 'skipped', plugins: [] };
  
  const cfg = (ctx && ctx.cfg) || {};
  const domain = ctx?.domain || 'frontend'; // Default domain
  
  // Get enabled runners based on configuration
  const runners = getRunnersFor(domain, cfg);
  
  // Initialize results with defaults
  const results = { 
    lint: 'skipped', 
    typecheck: 'skipped', 
    tests: 'skipped', 
    performance: 'skipped',
    plugins: [] as any[]
  };
  
  // Map runner names to result fields
  const runnerMapping: Record<string, keyof typeof results> = {
    'ESLintRunner': 'lint',
    'TypecheckRunner': 'typecheck',
    'UnitTestRunner': 'tests',
    'PlaywrightRunner': 'tests'
  };
  
  // Execute enabled validation runners
  for (const runner of runners) {
    const resultField = runnerMapping[runner.name];
    if (resultField && resultField !== 'plugins') {
      try {
        const result = await runner.run({}, { cfg });
        results[resultField] = result.ok ? 'pass' : 'fail';
      } catch (e: any) {
        results[resultField] = 'error';
        console.warn(`Validator ${runner.name} failed:`, e?.message || 'unknown error');
      }
    }
  }
  
  // Handle plugin validators
  const pluginResults: any[] = [];
  if (ctx.plugins?.validators?.length) {
    for (const v of ctx.plugins.validators) {
      try { 
        pluginResults.push(await v(ctx)); 
      } catch (e: any) { 
        pluginResults.push({ name: 'plugin-error', status: 'error', note: e?.message || 'error' }); 
      }
    }
  }
  
  return { ...results, plugins: pluginResults };
}

export default { runValidators };
