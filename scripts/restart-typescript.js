#!/usr/bin/env node

/**
 * Quick TypeScript Language Server Restart
 * Use this if you encounter EPIPE errors again
 */

const { execSync } = require('child_process');

console.log('🔄 Restarting TypeScript Language Server...');

try {
  // Kill TypeScript processes
  execSync('pkill -f "tsserver|typescript" 2>/dev/null || true', { stdio: 'ignore' });
  
  // Clear TypeScript cache
  execSync('rm -rf tsconfig.tsbuildinfo .tsbuildinfo 2>/dev/null || true', { stdio: 'ignore' });
  
  console.log('✅ TypeScript Language Server restarted');
  console.log('💡 Please reload VS Code window for best results');
} catch (_error) {
  console.error('❌ Error restarting TypeScript:', error.message);
}
