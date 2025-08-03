// Firebase error handling utilities
import { FirebaseError } from "firebase/app";
import { getAnalytics, logEvent, Analytics } from "firebase/analytics";
import { app } from "./firebase/index"; // Ensure 'app' is your FirebaseApp instance
const analytics: Analytics = getAnalytics(app);

export class FirebaseErrorHandler {
  static isNetworkError(error: unknown): boolean {
    return (
      (error instanceof TypeError &&
        error.message.includes("Failed to fetch")) ||
      (error instanceof FirebaseError &&
        (error.code === "unavailable" || error.code === "deadline-exceeded"))
    );
  }

  static handleFirebaseError(_error: unknown, operation: string): void {
    if (this.isNetworkError(_error)) {
      console.warn(
        `Firebase ${operation} failed due to network issues. This is non-critical.`,
        _error
      );
      return;
    }

    if (_error instanceof FirebaseError) {
      console.error(`Firebase ${operation} _error:`, {
        code: _error.code,
        message: _error.message,
      });
    } else {
      console.error(`Unexpected error during ${operation}:`, _error);
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (_error) {
        if (attempt === maxRetries) {
          this.handleFirebaseError(_error, operationName);
          return null;
        }

        if (this.isNetworkError(_error)) {
          console.warn(
            `${operationName} attempt ${attempt} failed, retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        } else {
          // Non-network errors shouldn&apos;t be retried
          this.handleFirebaseError(_error, operationName);
          return null;
        }
      }
    }
    return null;
  }
}

// Wrapper for analytics events that won&apos;t throw errors
export function safeAnalyticsEvent(eventName: string, eventParams?: unknown): void {
  if (typeof window === "undefined") return;

  try {
    if (analytics) {
      logEvent(analytics, eventName, eventParams as Record<string, any> | undefined);
    }
  } catch (_error) {
    FirebaseErrorHandler.handleFirebaseError(_error, "analytics event");
  }
}
