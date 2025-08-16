/**
 * Event Registry Tests
 * Tests for event type registry completeness and validation
 */

import { describe, test, expect } from '@jest/globals';
import { 
  EVENT_TYPE_REGISTRY,
  validateRegistryCompleteness,
  isEventTypeRegistered,
  getRegisteredEventTypes,
  getAllEventTypes
} from '../registry';
import { EventType } from '../types';

describe('Event Registry', () => {
  describe('Registry Completeness', () => {
    test('all event types from enum are registered', () => {
      const validation = validateRegistryCompleteness();
      
      expect(validation.isComplete).toBe(true);
      expect(validation.missingTypes).toHaveLength(0);
      expect(validation.extraTypes).toHaveLength(0);
      
      // If this test fails, it means event producers exist that aren't in the registry
      if (!validation.isComplete) {
        console.error('Missing event types:', validation.missingTypes);
        console.error('Extra event types:', validation.extraTypes);
      }
    });
    
    test('registry contains all event types', () => {
      const allTypes = getAllEventTypes();
      const registeredTypes = getRegisteredEventTypes();
      
      // Check that every enum value is in the registry
      for (const eventType of allTypes) {
        expect(isEventTypeRegistered(eventType)).toBe(true);
      }
      
      // Check counts match
      expect(registeredTypes.length).toBe(allTypes.length);
    });
    
    test('no duplicate entries in registry', () => {
      const registeredTypes = getRegisteredEventTypes();
      const uniqueTypes = [...new Set(registeredTypes)];
      
      expect(registeredTypes.length).toBe(uniqueTypes.length);
    });
  });
  
  describe('Event Type Validation', () => {
    test('validates registered event types correctly', () => {
      expect(isEventTypeRegistered(EventType.USER_LOGIN)).toBe(true);
      expect(isEventTypeRegistered(EventType.SEO_AUDIT_STARTED)).toBe(true);
      expect(isEventTypeRegistered(EventType.HEALTH_CHECK_PERFORMED)).toBe(true);
    });
    
    test('registry is a Set for efficient lookup', () => {
      expect(EVENT_TYPE_REGISTRY).toBeInstanceOf(Set);
    });
  });
  
  describe('Specific Event Categories', () => {
    test('user authentication events are registered', () => {
      expect(isEventTypeRegistered(EventType.USER_LOGIN)).toBe(true);
      expect(isEventTypeRegistered(EventType.USER_LOGOUT)).toBe(true);
      expect(isEventTypeRegistered(EventType.USER_REGISTER)).toBe(true);
    });
    
    test('SEO audit events are registered', () => {
      expect(isEventTypeRegistered(EventType.SEO_AUDIT_STARTED)).toBe(true);
      expect(isEventTypeRegistered(EventType.SEO_AUDIT_COMPLETED)).toBe(true);
      expect(isEventTypeRegistered(EventType.SEO_AUDIT_FAILED)).toBe(true);
    });
    
    test('content analysis events are registered', () => {
      expect(isEventTypeRegistered(EventType.CONTENT_ANALYSIS_STARTED)).toBe(true);
      expect(isEventTypeRegistered(EventType.CONTENT_ANALYSIS_COMPLETED)).toBe(true);
      expect(isEventTypeRegistered(EventType.CONTENT_ANALYSIS_FAILED)).toBe(true);
    });
    
    test('keyword suggestion events are registered', () => {
      expect(isEventTypeRegistered(EventType.KEYWORD_SUGGESTIONS_REQUESTED)).toBe(true);
      expect(isEventTypeRegistered(EventType.KEYWORD_SUGGESTIONS_GENERATED)).toBe(true);
      expect(isEventTypeRegistered(EventType.KEYWORD_SUGGESTIONS_FAILED)).toBe(true);
    });
    
    test('system and API events are registered', () => {
      expect(isEventTypeRegistered(EventType.API_REQUEST_RECEIVED)).toBe(true);
      expect(isEventTypeRegistered(EventType.API_REQUEST_COMPLETED)).toBe(true);
      expect(isEventTypeRegistered(EventType.API_REQUEST_FAILED)).toBe(true);
      expect(isEventTypeRegistered(EventType.HEALTH_CHECK_PERFORMED)).toBe(true);
    });
  });
});