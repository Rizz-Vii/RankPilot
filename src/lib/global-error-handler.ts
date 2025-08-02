// Global error handler for Firebase and network issues
"use client";

let errorHandlerInitialized = false;

export function initializeGlobalErrorHandler() {
  if (errorHandlerInitialized || typeof window === "undefined") return;

  // Catch unhandled promise rejections (like Firebase fetch errors)
  window.addEventListener("unhandledrejection", (_event) => {
    const error = event.reason;

    // Check if it&apos;s a Firebase-related fetch error
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch") &&
      (error.stack?.includes("firebase") || error.stack?.includes("firestore"))
    ) {
      console.warn("Suppressed Firebase fetch _error:", error.message);
      event.preventDefault(); // Prevent the error from propagating
      return;
    }

    // Check if it&apos;s a Firebase installations error
    if (
      error?.message?.includes("installations") ||
      error?.message?.includes("analytics")
    ) {
      console.warn("Suppressed Firebase service _error:", error.message);
      event.preventDefault();
      return;
    }

    // Let other errors through
    console.error("Unhandled promise rejection:", _error);
  });

  // Catch regular JavaScript errors
  window.addEventListener("error", (_event) => {
    const error = event.error;

    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch") &&
      (event.filename?.includes("firebase") ||
        error.stack?.includes("firebase"))
    ) {
      console.warn("Suppressed Firebase _error:", error.message);
      event.preventDefault();
      return;
    }

    // Let other errors through
    console.error("Global _error:", _error);
  });

  errorHandlerInitialized = true;
  console.log("Global Firebase error handler initialized");
}
