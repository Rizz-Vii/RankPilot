/**
 * Event Type Registry
 * Central registry of all event types that can be produced in the system
 */

import { EventType } from './types';

/**
 * Complete registry of all event types that can be produced in the system.
 * This MUST be kept in sync with all event producers.
 * 
 * Any new event type added to EventType enum MUST be added here.
 * The unit tests will validate this registry is complete.
 */
export const EVENT_TYPE_REGISTRY = new Set<EventType>([
  // User Authentication Events
  EventType.USER_LOGIN,
  EventType.USER_LOGOUT,
  EventType.USER_REGISTER,
  
  // SEO Analysis Events
  EventType.SEO_AUDIT_STARTED,
  EventType.SEO_AUDIT_COMPLETED,
  EventType.SEO_AUDIT_FAILED,
  
  // Content Analysis Events
  EventType.CONTENT_ANALYSIS_STARTED,
  EventType.CONTENT_ANALYSIS_COMPLETED,
  EventType.CONTENT_ANALYSIS_FAILED,
  
  // Keyword Research Events
  EventType.KEYWORD_SUGGESTIONS_REQUESTED,
  EventType.KEYWORD_SUGGESTIONS_GENERATED,
  EventType.KEYWORD_SUGGESTIONS_FAILED,
  
  // Search Events
  EventType.GLOBAL_SEARCH_PERFORMED,
  
  // Link Analysis Events
  EventType.LINK_ANALYSIS_STARTED,
  EventType.LINK_ANALYSIS_COMPLETED,
  EventType.LINK_ANALYSIS_FAILED,
  
  // SERP Analysis Events
  EventType.SERP_ANALYSIS_STARTED,
  EventType.SERP_ANALYSIS_COMPLETED,
  EventType.SERP_ANALYSIS_FAILED,
  
  // Competitor Analysis Events
  EventType.COMPETITOR_ANALYSIS_STARTED,
  EventType.COMPETITOR_ANALYSIS_COMPLETED,
  EventType.COMPETITOR_ANALYSIS_FAILED,
  
  // System Events
  EventType.API_REQUEST_RECEIVED,
  EventType.API_REQUEST_COMPLETED,
  EventType.API_REQUEST_FAILED,
  
  // Health Check Events
  EventType.HEALTH_CHECK_PERFORMED,
]);

/**
 * Validates that an event type is registered
 */
export function isEventTypeRegistered(eventType: EventType): boolean {
  return EVENT_TYPE_REGISTRY.has(eventType);
}

/**
 * Gets all registered event types
 */
export function getRegisteredEventTypes(): EventType[] {
  return Array.from(EVENT_TYPE_REGISTRY);
}

/**
 * Gets all event types defined in the EventType enum
 */
export function getAllEventTypes(): EventType[] {
  return Object.values(EventType);
}

/**
 * Validates that the registry contains all defined event types
 * Returns missing event types if any
 */
export function validateRegistryCompleteness(): {
  isComplete: boolean;
  missingTypes: EventType[];
  extraTypes: EventType[];
} {
  const allTypes = new Set(getAllEventTypes());
  const registeredTypes = EVENT_TYPE_REGISTRY;
  
  const missingTypes: EventType[] = [];
  const extraTypes: EventType[] = [];
  
  // Check for missing types (defined but not registered)
  for (const type of allTypes) {
    if (!registeredTypes.has(type)) {
      missingTypes.push(type);
    }
  }
  
  // Check for extra types (registered but not defined)
  for (const type of registeredTypes) {
    if (!allTypes.has(type)) {
      extraTypes.push(type);
    }
  }
  
  return {
    isComplete: missingTypes.length === 0 && extraTypes.length === 0,
    missingTypes,
    extraTypes,
  };
}