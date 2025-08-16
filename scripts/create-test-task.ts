#!/usr/bin/env ts-node
import { appendTask } from './delegation/queue-utils';

// Create a simple test task
const testTask = {
    taskId: 'TEST-LOCKFILE-001',
    summary: 'Test lockfile blocking behavior',
    files: ['README.md'],
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

console.log('📝 Creating test task for lockfile testing...');
appendTask(testTask);
console.log('✅ Test task created:', testTask.taskId);