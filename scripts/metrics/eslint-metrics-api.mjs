// Programmatic ESLint metrics collector (isolated, minimal flat config) to bypass Next.js/rushstack patch issues.
import { ESLint } from 'eslint';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export async function runMetrics() {
  try {
    const { FlatESLint } = await import('eslint/use-at-your-own-risk');
    const eslint = new FlatESLint({
      overrideConfig: [
        { ignores: ['**/node_modules/**','**/.next/**','**/dist/**','**/out/**','functions/lib/**'] },
        {
          languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
          plugins: { '@typescript-eslint': tsPlugin },
          rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { args: 'none', vars: 'all', ignoreRestSiblings: true }],
            '@typescript-eslint/no-require-imports': 'error'
          }
        }
      ]
    });
    const results = await eslint.lintFiles([
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.js',
      'src/**/*.jsx'
    ]);
    return results.map(r => ({ filePath: r.filePath, messages: r.messages }));
  } catch (e) {
    if (String(e.message || e).includes('Failed to patch ESLint')) {
      return await fallbackLinter();
    }
    throw e;
  }
}

async function fallbackLinter() {
  // Lightweight metrics using Linter directly to avoid config discovery / rushstack patch.
  const { Linter } = await import('eslint');
  const fs = await import('fs');
  const path = await import('path');
  const linter = new Linter();
  // Build flat-like config object manually and embed plugin rule implementations directly.
  const neededRuleNames = ['no-explicit-any','no-unused-vars','no-require-imports'];
  const pluginRules = Object.fromEntries(
    neededRuleNames
      .filter(n => tsPlugin.rules && tsPlugin.rules[n])
      .map(n => [n, tsPlugin.rules[n]])
  );
  const activeRules = {
  '@typescript-eslint/no-explicit-any': ['error'],
  '@typescript-eslint/no-unused-vars': ['error', { args: 'none', vars: 'all', ignoreRestSiblings: true }],
  '@typescript-eslint/no-require-imports': ['error']
  };
  const files = [];
  const exts = new Set(['.ts','.tsx','.js','.jsx']);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist' || entry === 'out') continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full); else if (exts.has(path.extname(entry))) files.push(full);
    }
  }
  walk(path.join(process.cwd(), 'src'));
  const results = [];
  for (const filePath of files) {
    let code; try { code = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
    const messages = linter.verify(code, [
      {
        languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
        plugins: { '@typescript-eslint': { rules: pluginRules } },
        rules: activeRules
      }
    ], { filename: filePath });
    results.push({ filePath, messages });
  }
  return results;
}

export function aggregate(results) {
  const debug = !!process.env.METRICS_DEBUG;
  let errorCount = 0, warningCount = 0;
  const ruleTally = {};
  let totalMessages = 0;
  for (const file of results) {
    for (const msg of file.messages) {
      totalMessages++;
      // Primary pass: only count messages with a ruleId OR severity=2 (error) to avoid losing true errors.
      if (!msg.ruleId && msg.severity !== 2) continue;
      const key = msg.ruleId || '(no-rule)'; // avoid 'internal' label; explicit placeholder
      if (msg.severity === 2) errorCount++; else warningCount++;
      ruleTally[key] = (ruleTally[key] || 0) + 1;
    }
  }
  // Fallback: If we saw messages but produced zero tallied rules, revert to permissive inclusion of every message.
  if (totalMessages > 0 && Object.keys(ruleTally).length === 0) {
    if (debug) console.log('[metrics:aggregate] Empty tally after first pass; applying fallback inclusion strategy');
    errorCount = 0; warningCount = 0; // reset
    for (const file of results) {
      for (const msg of file.messages) {
        const key = msg.ruleId || '(no-rule)';
        if (msg.severity === 2) errorCount++; else warningCount++;
        ruleTally[key] = (ruleTally[key] || 0) + 1;
      }
    }
  }
  if (debug) console.log('[metrics:aggregate] files=%d messages=%d errors=%d warnings=%d distinctRules=%d', results.length, totalMessages, errorCount, warningCount, Object.keys(ruleTally).length);
  return { errorCount, warningCount, ruleTally };
}
