/**
 * StructuredLogger — lightweight tracing and business-event logging for Firebase Functions.
 */

import { logger } from "firebase-functions/v2";
import type { CallableRequest } from "firebase-functions/v2/https";

interface TraceContext {
  traceId: string;
  _functionName: string;
  userId: string;
  userTier: string;
  startTime: number;
}

export class StructuredLogger {
  static generateTraceId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  static startTrace(
    request: CallableRequest,
    functionName: string
  ): TraceContext {
    const traceId = StructuredLogger.generateTraceId();
    const userId = request.auth?.uid ?? "anonymous";
    const userTier = (request.auth?.token?.tier as string) ?? "free";
    logger.info("trace.start", { traceId, functionName, userId, userTier });
    return {
      traceId,
      _functionName: functionName,
      userId,
      userTier,
      startTime: Date.now(),
    };
  }

  static logBusinessEvent(
    traceId: string,
    eventName: string,
    data: Record<string, unknown>
  ): void {
    logger.info("business.event", { traceId, event: eventName, ...data });
  }

  static completeTrace(
    traceId: string,
    meta: {
      success: boolean;
      duration: number;
      dataSize?: number;
      memoryUsed?: number;
    }
  ): void {
    logger.info("trace.complete", { traceId, ...meta });
  }

  static errorTrace(
    traceId: string,
    error: Error,
    context?: Record<string, unknown>
  ): void {
    logger.error("trace.error", {
      traceId,
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }
}
