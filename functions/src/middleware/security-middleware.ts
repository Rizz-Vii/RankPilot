/**
 * Enhanced Security Middleware for Firebase Functions
 * Implements Firebase Functions v2 best practices
 */

import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

export interface SecurityOptions {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    rateLimit?: {
        maxRequests: number;
        windowMs: number;
    };
    validateOrigin?: boolean;
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function withSecurity(options: SecurityOptions = {}) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (request: CallableRequest) {
      const startTime = Date.now();
      const userId = request.auth?.uid || "anonymous";

      try {
        // Authentication check
        if (options.requireAuth && !request.auth) {
          throw new HttpsError("unauthenticated", "Authentication required");
        }

        // Admin check
        if (options.requireAdmin) {
          const token = request.auth?.token as { role?: string } | undefined;
          if (!token?.role || token.role !== "admin") {
            throw new HttpsError("permission-denied", "Admin access required");
          }
        }

        // Rate limiting
        if (options.rateLimit) {
          const now = Date.now();
          const key = `${userId}_${propertyName}`;
          const current = requestCounts.get(key);

          if (current && now < current.resetTime) {
            if (current.count >= options.rateLimit.maxRequests) {
              throw new HttpsError("resource-exhausted", "Rate limit exceeded");
            }
            current.count++;
          } else {
            requestCounts.set(key, {
              count: 1,
              resetTime: now + options.rateLimit.windowMs
            });
          }
        }

        // Origin validation
        if (options.validateOrigin) {
          const origin = request.rawRequest?.headers?.origin;
          const allowedOrigins = [
            "https://rankpilot-h3jpc.web.app",
            "https://rankpilot-h3jpc.firebaseapp.com",
            "http://localhost:3000"
          ];

          if (origin && !allowedOrigins.includes(origin)) {
            throw new HttpsError("permission-denied", "Origin not allowed");
          }
        }

        logger.info(`Function ${propertyName} started`, {
          userId,
          timestamp: new Date().toISOString()
        });

        const result = await method.call(this, request);

        logger.info(`Function ${propertyName} completed`, {
          userId,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });

        return result;

      } catch (error) {
        logger.error(`Function ${propertyName} failed`, {
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });

        if (error instanceof HttpsError) {
          throw error;
        }

        throw new HttpsError("internal", "An internal error occurred");
      }
    };

    return descriptor;
  };
}

// Cleanup function for rate limiting maps
export function cleanupRateLimitMaps() {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now >= value.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Schedule cleanup every 10 minutes
setInterval(cleanupRateLimitMaps, 10 * 60 * 1000);
