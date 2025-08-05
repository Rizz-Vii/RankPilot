"use client";

/**
 * Telemetry utility for traces, metrics, and logs.
 * Safe to import in both client and server components.
 * In the browser, all telemetry is disabled (no-op).
 */

// Define the interface for the TelemetryProvider. This interface ensures
// consistency whether we have a real OpenTelemetry provider or a mock one.
export type TelemetryProvider = {
  start: () => void;
  shutdown: () => Promise<void>;
  isActive: boolean;
  getTracer?: () => unknown; // Tracer instance (from @opentelemetry/api)
  getMeter?: () => unknown; // Meter instance (from @opentelemetry/api)
  getLogger?: () => unknown; // Logger instance (from @opentelemetry/api)
};

// A no-operation (noop) provider that does nothing. This is used on the client-side
// or when telemetry is explicitly disabled, to avoid unnecessary overhead.
const noopProvider: TelemetryProvider = {
  start: () => {
    // No-op: Does nothing
  },
  shutdown: async () => {
    // No-op: Does nothing
  },
  isActive: false, // Indicates that this is not an active telemetry provider
  getTracer: () => undefined, // Returns undefined as no tracer is available
  getMeter: () => undefined, // Returns undefined as no meter is available
  getLogger: () => undefined, // Returns undefined as no logger is available
};

// A singleton instance of the telemetry provider. It's initialized to noopProvider
// and will be replaced with a real provider if initialized on the server.
let telemetryInstance: TelemetryProvider = noopProvider;

/**
 * Retrieves the current telemetry provider instance.
 * This function should be used throughout the application to access telemetry capabilities.
 * @returns The current TelemetryProvider instance.
 */
export function getTelemetryProvider(): TelemetryProvider {
  return telemetryInstance;
}

/**
 * Initializes the telemetry provider.
 * This function is designed to be called once at application startup.
 * It dynamically imports the server-side telemetry setup only when running on the server.
 * @returns A Promise that resolves to the initialized TelemetryProvider instance.
 */
export async function initTelemetry(): Promise<TelemetryProvider> {
  // If running in a browser environment, return the no-op provider immediately.
  // This prevents any server-side telemetry code from being bundled or executed on the client.
  if (typeof window !== "undefined") {
    return noopProvider;
  }

  try {
    // Check environment variables to determine if telemetry should be disabled,
    // even on the server. This provides a convenient way to turn off telemetry.
    if (
      process.env.NODE_ENV !== "production" || // Telemetry typically enabled in production only
      process.env.DISABLE_TELEMETRY === "true" // Explicit disable flag
    ) {
      console.log(
        "Telemetry disabled in non-production mode or by DISABLE_TELEMETRY flag."
      );
      return noopProvider;
    }

    try {
      // Dynamically import the server-side telemetry module.
      // This ensures that the heavy OpenTelemetry SDK dependencies are only loaded
      // on the server where they are needed.
      const serverTelemetry = await import("./server-telemetry.js");

      // Check if the createTelemetryProvider function exists and is callable.
      if (
        serverTelemetry &&
        typeof serverTelemetry.createTelemetryProvider === "function"
      ) {
        // Initialize the real telemetry provider and assign it to the singleton instance.
        telemetryInstance = await serverTelemetry.createTelemetryProvider();
        return telemetryInstance;
      }
    } catch (importError) {
      // Log a warning if the server telemetry module cannot be imported.
      // This might happen if the file path is incorrect or due to other module resolution issues.
      console.warn(
        "Unable to import server telemetry module, falling back to no-op provider:",
        importError
      );
    }

    // If dynamic import fails or createTelemetryProvider is not found,
    // fall back to the no-op provider to ensure the application continues to function.
    return noopProvider;
  } catch (_error) {
    // Catch any other errors during the initialization process and log them.
    console.error("Failed to initialize telemetry:", _error);
    return noopProvider; // Always return a provider, even if initialization fails
  }
}

/**
 * Creates a custom span for measuring the performance of a function.
 * This function is safe to use in both client and server code.
 *
 * @param name The name of the span.
 * @param fn The function to be executed and measured within the span.
 * @returns The result of the executed function.
 * @template T The return type of the function `fn`.
 */
export function createSpan<T>(name: string, fn: () => T): T {
  // If running in a browser environment, just execute the function directly.
  // No actual span creation occurs on the client.
  if (typeof window !== "undefined") {
    return fn();
  }

  try {
    const provider = getTelemetryProvider();
    // Get the tracer from the provider if it exists.
    const tracer = provider.getTracer ? provider.getTracer() : undefined;

    if (tracer && typeof tracer === 'object' && tracer !== null && 'startActiveSpan' in tracer) {
      // If a tracer is available, start an active span.
      // The function `fn` will be executed within the context of this span.
      return (tracer as { startActiveSpan: (name: string, callback: (span: { end: () => void; recordException?: (err: unknown) => void }) => T) => T }).startActiveSpan(name, (span) => {
        try {
          const result = fn(); // Execute the provided function
          span.end(); // End the span after function execution
          return result;
        } catch (err: unknown) {
          // Catch errors during function execution
          span.recordException?.(err); // Record the exception on the span if available
          span.end(); // End the span even if an error occurred
          throw err; // Re-throw the error to propagate it
        }
      });
    } else {
      // Fallback behavior if no tracer is available (e.g., in development mode
      // or if telemetry initialization failed).
      const startTime = Date.now();
      const result = fn();
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === "development") {
        // In development, log the span name and duration to the console.
        console.log(
          `[Telemetry Fallback] Span: ${name}, duration: ${duration}ms`
        );
      }
      return result;
    }
  } catch (_error) {
    // Catch any errors that occur during the span creation or fallback process.
    console.error(`Error in createSpan for ${name}:`, _error);
    throw _error; // Re-throw the error
  }
}
