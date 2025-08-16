/**
 * Event Publishing System
 * Handles publishing events with idempotency and deterministic ID generation
 */

import { createHash } from 'crypto';
import { EventType, EventPayload, PublishEventOptions, BaseEvent } from './types';
import { isEventTypeRegistered } from './registry';

// Dynamic logger import to handle environments where firebase-functions isn't available
let logger: any;
try {
  const firebaseFunctions = require('firebase-functions');
  logger = firebaseFunctions.logger;
} catch {
  // Fallback logger for testing/non-Firebase environments
  logger = {
    info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
    error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  };
}

// In-memory store for idempotency (in production, this would be a database)
const idempotencyStore = new Map<string, string>();

/**
 * Generates a deterministic hash for idempotency based on event content
 */
function generateIdempotencyHash(event: Partial<EventPayload>): string {
  // Create a deterministic string from the event data
  const contentForHash = {
    type: event.type,
    userId: event.userId,
    sessionId: event.sessionId,
    timestamp: Math.floor((event.timestamp || Date.now()) / 1000), // Round to seconds for some tolerance
    data: event.data || {},
    // Exclude id and metadata from hash to prevent circular dependency
  };
  
  const contentString = JSON.stringify(contentForHash, Object.keys(contentForHash).sort());
  return createHash('sha256').update(contentString).digest('hex').substring(0, 16);
}

/**
 * Generates a deterministic event ID based on content and timestamp
 */
function generateEventId(event: Partial<EventPayload>, idempotencyKey?: string): string {
  if (idempotencyKey) {
    return `evt_${idempotencyKey}_${Date.now()}`;
  }
  
  const hash = generateIdempotencyHash(event);
  return `evt_${hash}_${event.timestamp || Date.now()}`;
}

/**
 * Checks if an event with the same idempotency key has already been processed
 */
function checkIdempotency(idempotencyKey: string): string | null {
  return idempotencyStore.get(idempotencyKey) || null;
}

/**
 * Stores an event ID for idempotency checking
 */
function storeIdempotency(idempotencyKey: string, eventId: string): void {
  idempotencyStore.set(idempotencyKey, eventId);
}

/**
 * Publishes an event with idempotency checks and deterministic ID generation
 */
export async function publishEvent(
  eventType: EventType,
  eventData: Omit<EventPayload, 'id' | 'type' | 'timestamp'>,
  options: PublishEventOptions = {}
): Promise<{ eventId: string; wasDeduped: boolean }> {
  // Validate event type is registered
  if (!isEventTypeRegistered(eventType)) {
    throw new Error(`Event type '${eventType}' is not registered in the event registry`);
  }
  
  const timestamp = Date.now();
  const { idempotencyKey, skipIdempotency = false } = options;
  
  // Construct the full event
  const event: EventPayload = {
    ...eventData,
    id: '', // Will be set below
    type: eventType,
    timestamp,
  } as EventPayload;
  
  // Generate or use provided idempotency key
  const finalIdempotencyKey = idempotencyKey || generateIdempotencyHash(event);
  
  // Check for duplicate if idempotency is enabled
  if (!skipIdempotency) {
    const existingEventId = checkIdempotency(finalIdempotencyKey);
    if (existingEventId) {
      logger.info(`Event deduplicated: ${eventType}`, {
        idempotencyKey: finalIdempotencyKey,
        existingEventId,
      });
      return { eventId: existingEventId, wasDeduped: true };
    }
  }
  
  // Generate deterministic event ID
  const eventId = generateEventId(event, idempotencyKey);
  event.id = eventId;
  
  try {
    // Store for idempotency (if enabled)
    if (!skipIdempotency) {
      storeIdempotency(finalIdempotencyKey, eventId);
    }
    
    // Log the event (in production, this would also persist to a database)
    logger.info(`Event published: ${eventType}`, {
      eventId,
      userId: event.userId,
      sessionId: event.sessionId,
      idempotencyKey: finalIdempotencyKey,
      data: event.data,
    });
    
    // In a real implementation, you would:
    // 1. Persist the event to a database
    // 2. Trigger any event handlers
    // 3. Potentially publish to event streams (Pub/Sub, Kafka, etc.)
    
    return { eventId, wasDeduped: false };
  } catch (error) {
    logger.error(`Failed to publish event: ${eventType}`, {
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Utility function to create events for common patterns
 */
export const EventPublisher = {
  /**
   * Publishes a user authentication event
   */
  async userAuth(
    type: EventType.USER_LOGIN | EventType.USER_LOGOUT | EventType.USER_REGISTER,
    userId: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ) {
    return publishEvent(type, {
      userId,
      sessionId,
      metadata,
    });
  },
  
  /**
   * Publishes an API request event
   */
  async apiRequest(
    type: EventType.API_REQUEST_RECEIVED | EventType.API_REQUEST_COMPLETED | EventType.API_REQUEST_FAILED,
    endpoint: string,
    method: string,
    statusCode?: number,
    duration?: number,
    error?: string,
    userId?: string
  ) {
    return publishEvent(type, {
      userId,
      data: {
        endpoint,
        method,
        statusCode,
        duration,
        error,
      },
    });
  },
  
  /**
   * Publishes a health check event
   */
  async healthCheck(
    status: 'ok' | 'error',
    responseTime: number,
    timestamp: string
  ) {
    return publishEvent(EventType.HEALTH_CHECK_PERFORMED, {
      data: {
        status,
        responseTime,
        timestamp,
      },
    });
  },
};

/**
 * Gets the current size of the idempotency store (for testing)
 */
export function getIdempotencyStoreSize(): number {
  return idempotencyStore.size;
}

/**
 * Clears the idempotency store (for testing)
 */
export function clearIdempotencyStore(): void {
  idempotencyStore.clear();
}