/**
 * Event System Types
 * Defines all event types and interfaces for the RankPilot event system
 */

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface UserEvent extends BaseEvent {
  userId: string;
}

// Define all possible event types in the system
export enum EventType {
  // User Authentication Events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  
  // SEO Analysis Events
  SEO_AUDIT_STARTED = 'seo_audit_started',
  SEO_AUDIT_COMPLETED = 'seo_audit_completed',
  SEO_AUDIT_FAILED = 'seo_audit_failed',
  
  // Content Analysis Events
  CONTENT_ANALYSIS_STARTED = 'content_analysis_started',
  CONTENT_ANALYSIS_COMPLETED = 'content_analysis_completed',
  CONTENT_ANALYSIS_FAILED = 'content_analysis_failed',
  
  // Keyword Research Events
  KEYWORD_SUGGESTIONS_REQUESTED = 'keyword_suggestions_requested',
  KEYWORD_SUGGESTIONS_GENERATED = 'keyword_suggestions_generated',
  KEYWORD_SUGGESTIONS_FAILED = 'keyword_suggestions_failed',
  
  // Search Events
  GLOBAL_SEARCH_PERFORMED = 'global_search_performed',
  
  // Link Analysis Events
  LINK_ANALYSIS_STARTED = 'link_analysis_started',
  LINK_ANALYSIS_COMPLETED = 'link_analysis_completed',
  LINK_ANALYSIS_FAILED = 'link_analysis_failed',
  
  // SERP Analysis Events
  SERP_ANALYSIS_STARTED = 'serp_analysis_started',
  SERP_ANALYSIS_COMPLETED = 'serp_analysis_completed',
  SERP_ANALYSIS_FAILED = 'serp_analysis_failed',
  
  // Competitor Analysis Events
  COMPETITOR_ANALYSIS_STARTED = 'competitor_analysis_started',
  COMPETITOR_ANALYSIS_COMPLETED = 'competitor_analysis_completed',
  COMPETITOR_ANALYSIS_FAILED = 'competitor_analysis_failed',
  
  // System Events
  API_REQUEST_RECEIVED = 'api_request_received',
  API_REQUEST_COMPLETED = 'api_request_completed',
  API_REQUEST_FAILED = 'api_request_failed',
  
  // Health Check Events
  HEALTH_CHECK_PERFORMED = 'health_check_performed',
}

// Event payload interfaces for different event types
export interface SEOAuditEvent extends UserEvent {
  type: EventType.SEO_AUDIT_STARTED | EventType.SEO_AUDIT_COMPLETED | EventType.SEO_AUDIT_FAILED;
  data: {
    url: string;
    depth?: number;
    checkMobile?: boolean;
    score?: number;
    duration?: number;
    error?: string;
  };
}

export interface ContentAnalysisEvent extends UserEvent {
  type: EventType.CONTENT_ANALYSIS_STARTED | EventType.CONTENT_ANALYSIS_COMPLETED | EventType.CONTENT_ANALYSIS_FAILED;
  data: {
    contentLength: number;
    analysisType?: string;
    score?: number;
    duration?: number;
    error?: string;
  };
}

export interface KeywordSuggestionsEvent extends UserEvent {
  type: EventType.KEYWORD_SUGGESTIONS_REQUESTED | EventType.KEYWORD_SUGGESTIONS_GENERATED | EventType.KEYWORD_SUGGESTIONS_FAILED;
  data: {
    query: string;
    count?: number;
    suggestionsCount?: number;
    duration?: number;
    error?: string;
  };
}

export interface GlobalSearchEvent extends UserEvent {
  type: EventType.GLOBAL_SEARCH_PERFORMED;
  data: {
    query: string;
    resultsCount: number;
    duration?: number;
  };
}

export interface APIRequestEvent extends BaseEvent {
  type: EventType.API_REQUEST_RECEIVED | EventType.API_REQUEST_COMPLETED | EventType.API_REQUEST_FAILED;
  data: {
    endpoint: string;
    method: string;
    statusCode?: number;
    duration?: number;
    error?: string;
  };
}

export interface HealthCheckEvent extends BaseEvent {
  type: EventType.HEALTH_CHECK_PERFORMED;
  data: {
    status: 'ok' | 'error';
    responseTime: number;
    timestamp: string;
  };
}

// Union type for all possible events
export type EventPayload = 
  | SEOAuditEvent
  | ContentAnalysisEvent
  | KeywordSuggestionsEvent
  | GlobalSearchEvent
  | APIRequestEvent
  | HealthCheckEvent
  | UserEvent;

export interface PublishEventOptions {
  /**
   * Optional external ID for idempotency. If not provided, one will be generated
   * based on the event content for deterministic deduplication.
   */
  idempotencyKey?: string;
  
  /**
   * Whether to skip idempotency checks (default: false)
   */
  skipIdempotency?: boolean;
}