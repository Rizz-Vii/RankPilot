// Firebase error handling utilities
import { FirebaseError } from "firebase/app";
import { analytics } from "./firebase";
import { logEvent } from "firebase/analytics";

export class FirebaseErrorHandler {
  static isNetworkError(error: any): boolean {
    return (
      (error instanceof TypeError &&
        error.message.includes("Failed to fetch")) ||
      (error instanceof FirebaseError &&
        (error.code === "unavailable" || error.code === "deadline-exceeded"))
    );
  }

  static handleFirebaseError(error: any, operation: string): void {
    if (this.isNetworkError(error)) {
      console.warn(
        `Firebase ${operation} failed due to network issues. This is non-critical.`,
        error
      );
      return;
    }

    if (error instanceof FirebaseError) {
      console.error(`Firebase ${operation} error:`, {
        code: error.code,
        message: error.message,
      });
    } else {
      console.error(`Unexpected error during ${operation}:`, error);
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
      } catch (error) {
        if (attempt === maxRetries) {
          this.handleFirebaseError(error, operationName);
          return null;
        }

        if (this.isNetworkError(error)) {
          console.warn(
            `${operationName} attempt ${attempt} failed, retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        } else {
          // Non-network errors shouldn&apos;t be retried
          this.handleFirebaseError(error, operationName);
          return null;
        }
      }
    }
    return null;
  }
}

// Wrapper for analytics events that won&apos;t throw errors
export function safeAnalyticsEvent(eventName: string, eventParams?: any): void {
  if (typeof window === "undefined") return;

  try {
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }
  } catch (error) {
    FirebaseErrorHandler.handleFirebaseError(error, "analytics event");
  }
}
