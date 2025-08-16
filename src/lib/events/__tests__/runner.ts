/**
 * Simple Test Runner for Event System
 * A minimal test runner to validate the event system without Jest dependency
 */

import { 
  validateRegistryCompleteness,
  isEventTypeRegistered,
  getRegisteredEventTypes,
  getAllEventTypes
} from '../registry';
import { EventType } from '../types';
import { 
  publishEvent,
  EventPublisher,
  getIdempotencyStoreSize,
  clearIdempotencyStore
} from '../publisher';

// Simple test utilities
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toHaveLength: (expected: number) => {
        if (!actual || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual?.length || 'undefined'}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },
      toMatch: (pattern: RegExp) => {
        if (!pattern.test(actual)) {
          throw new Error(`Expected ${actual} to match ${pattern}`);
        }
      },
      not: {
        toBe: (expected: any) => {
          if (actual === expected) {
            throw new Error(`Expected ${actual} not to be ${expected}`);
          }
        },
      },
    };
  }

  async run() {
    console.log('🧪 Running Event System Tests...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Mock logger to avoid Firebase dependency
const mockLogger = {
  info: () => {},
  error: () => {},
};

// Replace the logger import in the module
const originalRequire = require;
require = function(id: string) {
  if (id === 'firebase-functions') {
    return { logger: mockLogger };
  }
  return originalRequire(id);
} as any;

// Create test runner instance
const runner = new TestRunner();

// Registry Tests
runner.test('all event types from enum are registered', () => {
  const validation = validateRegistryCompleteness();
  
  runner.expect(validation.isComplete).toBe(true);
  runner.expect(validation.missingTypes).toHaveLength(0);
  runner.expect(validation.extraTypes).toHaveLength(0);
});

runner.test('registry contains all event types', () => {
  const allTypes = getAllEventTypes();
  const registeredTypes = getRegisteredEventTypes();
  
  for (const eventType of allTypes) {
    runner.expect(isEventTypeRegistered(eventType)).toBe(true);
  }
  
  runner.expect(registeredTypes.length).toBe(allTypes.length);
});

runner.test('validates registered event types correctly', () => {
  runner.expect(isEventTypeRegistered(EventType.USER_LOGIN)).toBe(true);
  runner.expect(isEventTypeRegistered(EventType.SEO_AUDIT_STARTED)).toBe(true);
  runner.expect(isEventTypeRegistered(EventType.HEALTH_CHECK_PERFORMED)).toBe(true);
});

// Publisher Tests
runner.test('publishes a simple event successfully', async () => {
  clearIdempotencyStore();
  
  const result = await publishEvent(EventType.HEALTH_CHECK_PERFORMED, {
    data: {
      status: 'ok' as const,
      responseTime: 100,
      timestamp: new Date().toISOString(),
    },
  });
  
  runner.expect(result.eventId).toBeDefined();
  runner.expect(result.eventId).toMatch(/^evt_/);
  runner.expect(result.wasDeduped).toBe(false);
});

runner.test('generates deterministic IDs for identical events', async () => {
  clearIdempotencyStore();
  
  const eventData = {
    userId: 'test-user-123',
    sessionId: 'session-456',
    data: {
      url: 'https://example.com',
      score: 85,
    },
  };
  
  const result1 = await publishEvent(EventType.SEO_AUDIT_COMPLETED, eventData);
  const result2 = await publishEvent(EventType.SEO_AUDIT_COMPLETED, eventData);
  
  runner.expect(result1.wasDeduped).toBe(false);
  runner.expect(result2.wasDeduped).toBe(true);
  runner.expect(result1.eventId).toBe(result2.eventId);
});

runner.test('generates different IDs for different events', async () => {
  clearIdempotencyStore();
  
  const eventData1 = {
    userId: 'user-1',
    data: { url: 'https://example.com' },
  };
  
  const eventData2 = {
    userId: 'user-2', 
    data: { url: 'https://different.com' },
  };
  
  const result1 = await publishEvent(EventType.SEO_AUDIT_STARTED, eventData1);
  const result2 = await publishEvent(EventType.SEO_AUDIT_STARTED, eventData2);
  
  runner.expect(result1.eventId).not.toBe(result2.eventId);
  runner.expect(result1.wasDeduped).toBe(false);
  runner.expect(result2.wasDeduped).toBe(false);
});

runner.test('handles collision testing with multiple events', async () => {
  clearIdempotencyStore();
  
  const eventIds = new Set<string>();
  const promises: Promise<any>[] = [];
  
  // Generate 50 events with different data
  for (let i = 0; i < 50; i++) {
    promises.push(
      publishEvent(EventType.GLOBAL_SEARCH_PERFORMED, {
        userId: `user-${i}`,
        data: {
          query: `search query ${i}`,
          resultsCount: i * 10,
        },
      })
    );
  }
  
  const results = await Promise.all(promises);
  
  results.forEach(result => {
    eventIds.add(result.eventId);
  });
  
  // Should have 50 unique event IDs (no collisions)
  runner.expect(eventIds.size).toBe(50);
});

runner.test('idempotency store grows correctly', async () => {
  clearIdempotencyStore();
  runner.expect(getIdempotencyStoreSize()).toBe(0);
  
  await publishEvent(EventType.USER_LOGIN, { userId: 'user1' });
  runner.expect(getIdempotencyStoreSize()).toBe(1);
  
  await publishEvent(EventType.USER_LOGIN, { userId: 'user2' });
  runner.expect(getIdempotencyStoreSize()).toBe(2);
  
  // Publishing the same event again shouldn't increase store size
  await publishEvent(EventType.USER_LOGIN, { userId: 'user1' });
  runner.expect(getIdempotencyStoreSize()).toBe(2);
});

runner.test('EventPublisher helpers work correctly', async () => {
  clearIdempotencyStore();
  
  const userAuthResult = await EventPublisher.userAuth(
    EventType.USER_LOGIN,
    'user-123',
    'session-456'
  );
  runner.expect(userAuthResult.eventId).toBeDefined();
  
  const apiResult = await EventPublisher.apiRequest(
    EventType.API_REQUEST_COMPLETED,
    '/api/audit',
    'POST',
    200,
    1500
  );
  runner.expect(apiResult.eventId).toBeDefined();
  
  const healthResult = await EventPublisher.healthCheck(
    'ok',
    100,
    new Date().toISOString()
  );
  runner.expect(healthResult.eventId).toBeDefined();
});

// Run all tests
runner.run().catch(console.error);