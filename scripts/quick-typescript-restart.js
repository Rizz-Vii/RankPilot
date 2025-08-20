#!/usr/bin/env node
'use strict';
// Quick TypeScript restart utility
const { execSync } = require('child_process');

console.log('🔄 Quick TypeScript restart...');

try {
  execSync('rm -rf tsconfig.tsbuildinfo .tsbuildinfo 2>/dev/null || true');
  console.log('✅ TypeScript cache cleared - reload VS Code window');
} catch (err) {
  // Log the error to stderr for visibility in CI or terminals
  console.error('⚠️ TypeScript restart encountered an error:', err);
  // set non-zero exit code to signal failure
  process.exitCode = 1;
}
