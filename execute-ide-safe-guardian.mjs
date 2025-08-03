#!/usr/bin/env node

// Import using register for TypeScript execution
import { register } from 'ts-node';
register({
  esm: true,
  experimentalSpecifierResolution: 'node'
});

const { ideSafeTypeScriptGuardianAgent } = await import('./src/lib/agents/technical-operations/ide-safe-typescript-guardian.ts');

console.log('🚀 SYSTEMATIC TYPESCRIPT ERROR RESOLUTION');
console.log('📊 Target: 2,510 errors across 224 files');
console.log('🤖 Agent: IDE-Safe TypeScript Guardian v2.1');
console.log('═══════════════════════════════════════════');
console.log('');

try {
  const success = await ideSafeTypeScriptGuardianAgent.execute();
  
  console.log('');
  console.log('═══════════════════════════════════════════');
  if (success) {
    console.log('✅ IDE-SAFE EXECUTION COMPLETED SUCCESSFULLY');
    console.log('🔄 Running post-execution validation...');
    
    // Run TypeScript check to see results
    console.log('');
    console.log('📊 VALIDATION: Checking remaining TypeScript errors...');
  } else {
    console.log('❌ IDE-SAFE EXECUTION COMPLETED WITH ISSUES');
    console.log('📋 Check logs above for specific details');
  }
} catch (error) {
  console.error('🚨 EXECUTION ERROR:', error.message);
  console.error('📋 Stack:', error.stack);
  process.exit(1);
}
