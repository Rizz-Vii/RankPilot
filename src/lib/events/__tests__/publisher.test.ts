/**
 * Event Publisher Tests
 * Tests for event publishing, idempotency, and collision detection
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  publishEvent,
  EventPublisher,
  getIdempotencyStoreSize,
  clearIdempotencyStore
} from '../publisher';
import { EventType } from '../types';

// Mock logger to avoid dependency issues in tests
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Event Publisher', () => {
  beforeEach(() => {
    // Clear idempotency store before each test
    clearIdempotencyStore();
  });
  
  describe('Basic Event Publishing', () => {
    test('publishes a simple event successfully', async () => {
      const result = await publishEvent(EventType.HEALTH_CHECK_PERFORMED, {
        data: {
          status: 'ok',
          responseTime: 100,
          timestamp: new Date().toISOString(),
        },
      });
      
      expect(result.eventId).toBeDefined();
      expect(result.eventId).toMatch(/^evt_/);
      expect(result.wasDeduped).toBe(false);
    });
    
    test('publishes user event with userId', async () => {
      const result = await publishEvent(EventType.USER_LOGIN, {
        userId: 'test-user-123',
        sessionId: 'session-456',
      });
      
      expect(result.eventId).toBeDefined();
      expect(result.wasDeduped).toBe(false);
    });
    
    test('throws error for unregistered event type', async () => {
      // Create a fake event type that's not in the registry
      const fakeEventType = 'fake_event_type' as EventType;
      
      await expect(
        publishEvent(fakeEventType, {
          userId: 'test-user',
        })
      ).rejects.toThrow("Event type 'fake_event_type' is not registered");
    });
  });
  
  describe('Idempotency', () => {
    test('generates deterministic IDs for identical events', async () => {
      const eventData = {
        userId: 'test-user-123',
        sessionId: 'session-456',
        data: {
          url: 'https://example.com',
          score: 85,
        },
      };
      
      // Clear store and publish first event
      clearIdempotencyStore();
      const result1 = await publishEvent(EventType.SEO_AUDIT_COMPLETED, eventData);
      
      // Publish identical event - should be deduped
      const result2 = await publishEvent(EventType.SEO_AUDIT_COMPLETED, eventData);
      
      expect(result1.wasDeduped).toBe(false);
      expect(result2.wasDeduped).toBe(true);
      expect(result1.eventId).toBe(result2.eventId);
    });
    
    test('generates different IDs for different events', async () => {
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
      
      expect(result1.eventId).not.toBe(result2.eventId);
      expect(result1.wasDeduped).toBe(false);
      expect(result2.wasDeduped).toBe(false);
    });
    
    test('can skip idempotency when requested', async () => {
      const eventData = {
        userId: 'test-user-123',
        data: { message: 'test' },
      };
      
      const result1 = await publishEvent(EventType.USER_LOGIN, eventData);
      const result2 = await publishEvent(EventType.USER_LOGIN, eventData, {
        skipIdempotency: true,
      });
      
      expect(result1.eventId).not.toBe(result2.eventId);
      expect(result1.wasDeduped).toBe(false);
      expect(result2.wasDeduped).toBe(false);
    });
    
    test('uses custom idempotency key when provided', async () => {
      const eventData = {
        userId: 'test-user-123',
        data: { message: 'test' },
      };
      
      const customKey = 'my-custom-key-123';
      
      const result1 = await publishEvent(EventType.USER_LOGIN, eventData, {
        idempotencyKey: customKey,
      });
      
      const result2 = await publishEvent(EventType.USER_LOGIN, eventData, {
        idempotencyKey: customKey,
      });
      
      expect(result1.wasDeduped).toBe(false);
      expect(result2.wasDeduped).toBe(true);
      expect(result1.eventId).toBe(result2.eventId);
    });
  });
  
  describe('Collision Testing', () => {
    test('handles high volume without collisions', async () => {
      const eventIds = new Set<string>();
      const promises: Promise<any>[] = [];
      
      // Generate many events with different data
      for (let i = 0; i < 100; i++) {
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
      
      // Collect all event IDs
      results.forEach(result => {
        eventIds.add(result.eventId);
      });
      
      // Should have 100 unique event IDs (no collisions)
      expect(eventIds.size).toBe(100);
      
      // All should be first-time events
      results.forEach(result => {
        expect(result.wasDeduped).toBe(false);
      });
    });
    
    test('idempotency store grows correctly', async () => {
      expect(getIdempotencyStoreSize()).toBe(0);
      
      await publishEvent(EventType.USER_LOGIN, { userId: 'user1' });
      expect(getIdempotencyStoreSize()).toBe(1);
      
      await publishEvent(EventType.USER_LOGIN, { userId: 'user2' });
      expect(getIdempotencyStoreSize()).toBe(2);
      
      // Publishing the same event again shouldn't increase store size
      await publishEvent(EventType.USER_LOGIN, { userId: 'user1' });
      expect(getIdempotencyStoreSize()).toBe(2);
    });
  });
  
  describe('EventPublisher Utilities', () => {
    test('userAuth helper works correctly', async () => {
      const result = await EventPublisher.userAuth(
        EventType.USER_LOGIN,
        'user-123',
        'session-456',
        { loginMethod: 'google' }
      );
      
      expect(result.eventId).toBeDefined();
      expect(result.wasDeduped).toBe(false);
    });
    
    test('apiRequest helper works correctly', async () => {
      const result = await EventPublisher.apiRequest(
        EventType.API_REQUEST_COMPLETED,
        '/api/audit',
        'POST',
        200,
        1500,
        undefined,
        'user-123'
      );
      
      expect(result.eventId).toBeDefined();
      expect(result.wasDeduped).toBe(false);
    });
    
    test('healthCheck helper works correctly', async () => {
      const result = await EventPublisher.healthCheck(
        'ok',
        100,
        new Date().toISOString()
      );
      
      expect(result.eventId).toBeDefined();
      expect(result.wasDeduped).toBe(false);
    });
  });
});