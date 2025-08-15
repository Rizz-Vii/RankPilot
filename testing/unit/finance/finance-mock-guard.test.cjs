// Enable requiring TypeScript files from mocha
require('ts-node/register/transpile-only');
const assert = require('assert');

// This test guards that finance mocks are OFF by default in production builds unless explicitly enabled.
// It simulates production environment values and verifies the flag behavior.

describe('finance flag: allowFinanceMocks', () => {
  beforeEach(() => {
  delete require.cache[require.resolve('../../../src/lib/flags/finance.ts')];
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    // Simulate server-side (no window)
    global.window = undefined;
  });

  it('defaults to false in production when env not set', () => {
    const mod = require('../../../src/lib/flags/finance.ts');
    assert.strictEqual(mod.allowFinanceMocks(), false);
  });

  it('can be explicitly enabled via env', () => {
    process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = 'true';
    const mod = require('../../../src/lib/flags/finance.ts');
    assert.strictEqual(mod.allowFinanceMocks(), true);
  });

  it('can be explicitly disabled via env', () => {
    process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = 'false';
    const mod = require('../../../src/lib/flags/finance.ts');
    assert.strictEqual(mod.allowFinanceMocks(), false);
  });
});
