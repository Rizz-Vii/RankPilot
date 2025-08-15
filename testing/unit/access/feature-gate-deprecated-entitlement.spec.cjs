const { readFileSync } = require('fs');
const path = require('path');

/**
 * Standalone script (no mocha) to assert no FeatureGate usages reference deprecated / entitlement keys.
 * Usage: node testing/unit/access/feature-gate-deprecated-entitlement.spec.cjs
 */

// __dirname => /workspaces/studio/testing/unit/access
// Project root is four levels up? Actually: access -> unit -> testing -> (studio root) so three ..
const projectRoot = path.join(__dirname, '../../..');
const srcDir = path.join(projectRoot, 'src');
const forbidden = new Set([
  'priority_support',
  'dedicated_support',
  'enterprise_sla',
  'admin_panel',
  'user_management',
  'system_settings',
  'ai_insights'
]);

  function walk(dir, acc) {
    const entries = require('fs').readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, acc);
      else if (/\.(t|j)sx?$/.test(e.name)) acc.push(full);
    }
    return acc;
  }

  const files = walk(srcDir, []);
  const offenders = [];
  const gateRegex = /<FeatureGate[^>]*feature=\"([a-zA-Z0-9_]+)\"/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    let m;
    while ((m = gateRegex.exec(content))) {
      const key = m[1];
      if (forbidden.has(key)) offenders.push({ file: file.replace(projectRoot + '/', ''), key });
    }
  }

if (offenders.length) {
  console.error('[FEATURE_GATE_DEPRECATED_CHECK] FAIL', offenders);
  process.exit(1);
} else {
  console.log('[FEATURE_GATE_DEPRECATED_CHECK] PASS - no forbidden FeatureGate keys');
}
