// Global error handler for Firebase and network issues
"use client";

let errorHandlerInitialized = false;
let unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
let errorHandler: ((event: ErrorEvent) => void) | null = null;

export function initializeGlobalErrorHandler() {
  if (errorHandlerInitialized || typeof window === "undefined") return;

  // Create handler functions that can be removed later
  unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
    const error = event.reason;

    // Check if it's a Firebase-related fetch error
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch") &&
      (error.stack?.includes("firebase") || error.stack?.includes("firestore"))
    ) {
      console.warn("Suppressed Firebase fetch error:", error.message);
      event.preventDefault(); // Prevent the error from propagating
      return;
    }

    // Check if it's a Firebase installations error
    if (
      error?.message?.includes("installations") ||
      error?.message?.includes("analytics")
    ) {
      console.warn("Suppressed Firebase service error:", error.message);
      event.preventDefault();
      return;
    }

    // Let other errors through
    console.error("Unhandled promise rejection:", error);
  };

  // Catch regular JavaScript errors
  errorHandler = (event: ErrorEvent) => {
    const error = event.error;

    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch") &&
      (event.filename?.includes("firebase") ||
        error.stack?.includes("firebase"))
    ) {
      console.warn("Suppressed Firebase error:", error.message);
      event.preventDefault();
      return;
    }

    // Let other errors through
    console.error("Global error:", error);
  };

  window.addEventListener("unhandledrejection", unhandledRejectionHandler);
  window.addEventListener("error", errorHandler);

  errorHandlerInitialized = true;
  console.log("Global Firebase error handler initialized");
}

// NEW: Add cleanup function
export function cleanupGlobalErrorHandler() {
  if (!errorHandlerInitialized || typeof window === "undefined") return;

  if (unhandledRejectionHandler) {
    window.removeEventListener("unhandledrejection", unhandledRejectionHandler);
    unhandledRejectionHandler = null;
  }

  if (errorHandler) {
    window.removeEventListener("error", errorHandler);
    errorHandler = null;
  }

  errorHandlerInitialized = false;
  console.log("Global error handler cleaned up");
}
