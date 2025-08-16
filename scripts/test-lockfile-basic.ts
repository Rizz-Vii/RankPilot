#!/usr/bin/env ts-node
import { createLock, isLocked, releaseLock, cleanupLock } from './delegation/queue-utils';

console.log('🔒 Testing basic lockfile functionality...');

// Cleanup any existing locks
cleanupLock();

console.log('1. Creating lock:', createLock('TEST-001', 1));
console.log('2. Is locked:', isLocked());
console.log('3. Releasing lock:', releaseLock());
console.log('4. Is locked after release:', isLocked());
console.log('✅ Basic lockfile test completed');