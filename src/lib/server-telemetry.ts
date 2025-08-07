"use server";

/**
 * Server-only telemetry implementation using OpenTelemetry for traces, metrics, and logs.
 * This file is designed to be imported dynamically only in server contexts to avoid
 * bundling OpenTelemetry SDKs into client-side code.
 */

// Import the TelemetryProvider type from the shared telemetry.ts file.
import type { TelemetryProvider } from "./telemetry";

// Type alias for the OpenTelemetry Node.js SDK module for better type safety.
type OpenTelemetryNodeSDKModule = typeof import("@opentelemetry/sdk-node");

// Global variables to hold the OpenTelemetry API instances (Tracer, Meter, Logger).
// These are initialized to undefined and populated upon successful SDK startup.
let tracer: any = undefined;
let meter: any = undefined;
let logger: any = undefined;

/**
 * Creates a server-side telemetry provider that integrates with OpenTelemetry.
 * This function should primarily be called from a server context (e.g., via dynamic import).
 * It acts as the entry point for initializing OpenTelemetry on the server.
 *
 * @returns A Promise that resolves to a TelemetryProvider instance.
 */
export async function createTelemetryProvider(): Promise<TelemetryProvider> {
  // In development or test environments, or if DISABLE_TELEMETRY is set,
  // return a mock provider to avoid full OpenTelemetry setup overhead.
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.DISABLE_TELEMETRY === "true"
  ) {
    console.log(
      "Using mock telemetry provider (development/test or disabled)."
    );
    return createMockProvider();
  }

  // In production, or when explicitly enabled, create and return the real OpenTelemetry provider.
  return await createRealProvider();
}

/**
 * Creates a real OpenTelemetry provider for production use.
 * This function handles the full initialization of the OpenTelemetry Node.js SDK,
 * including resources, tracing, metrics, and logging.
 *
 * @returns A Promise that resolves to a TelemetryProvider instance.
 */
async function createRealProvider(): Promise<TelemetryProvider> {
  let sdkInstance: any | null = null; // Holds the OpenTelemetry Node.js SDK instance

  try {
    // Dynamically import all necessary OpenTelemetry packages.
    // This ensures that these potentially large dependencies are only loaded
    // when this function is called (i.e., on the server in production).
    const OpenTelemetry: OpenTelemetryNodeSDKModule = await import(
      "@opentelemetry/sdk-node"
    );
    // Corrected import for ATTR_SERVICE_NAME and SemanticResourceAttributes
    const { SemanticResourceAttributes } = await import(
      "@opentelemetry/semantic-conventions"
    );
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { BatchSpanProcessor, AlwaysOnSampler } = await import(
      "@opentelemetry/sdk-trace-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { OTLPMetricExporter } = await import(
      "@opentelemetry/exporter-metrics-otlp-http"
    );
    const { PeriodicExportingMetricReader } = await import(
      "@opentelemetry/sdk-metrics"
    );
    const {
      LoggerProvider,
      ConsoleLogRecordExporter,
      BatchLogRecordProcessor,
    } = await import("@opentelemetry/sdk-logs");

    // Corrected import for resourceFromAttributes
    const { resourceFromAttributes } = await import("@opentelemetry/resources");

    const api = await import("@opentelemetry/api"); // Import the API for global accessors

    // --- Resource Configuration ---
    // A Resource represents the entity producing telemetry (e.g., your service).
    // Attributes defined here will be attached to all traces, metrics, and logs.
    const serviceName = process.env.OTEL_SERVICE_NAME || "my-nextjs-server-app";

    // Using resourceFromAttributes as per your example

    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: "api-service",
    });

    const anotherResource = resourceFromAttributes({
      "service.version": "2.0.0",
      "service.group": "instrumentation-group",
    });
    const mergedResource = resource.merge(anotherResource);

    // You can add more resources and merge them if needed, as shown in your example
    // const anotherResource = resourceFromAttributes({
    //     'service.group': 'instrumentation-group'
    // });
    // const mergedResource = resource.merge(anotherResource);
    // Use mergedResource in NodeSDK below if you merge. For now, sticking with 'resource'.

    // --- Tracing Setup ---
    // OTLPTraceExporter sends traces to an OpenTelemetry Collector via HTTP.
    const traceExporter = new OTLPTraceExporter({
      url:
        process.env.OTEL_COLLECTOR_ENDPOINT_TRACES ||
        "http://localhost:4318/v1/traces",
    });
    // BatchSpanProcessor buffers spans and exports them in batches.
    const spanProcessor = new BatchSpanProcessor(traceExporter);
    // AlwaysOnSampler ensures all spans are recorded. For production, consider
    // a sampling strategy like TraceIdRatioBasedSampler.
    const sampler = new AlwaysOnSampler();

    // // --- Metrics Setup ---
    // // OTLPMetricExporter sends metrics to an OpenTelemetry Collector via HTTP.
    // const metricExporter = new OTLPMetricExporter({
    //   url:
    //     process.env.OTEL_COLLECTOR_ENDPOINT_METRICS ||
    //     "http://localhost:4318/v1/metrics",
    // });
    // // PeriodicExportingMetricReader pulls metrics at a regular interval.
    // const metricReader = new PeriodicExportingMetricReader({
    //   exporter: metricExporter,
    //   exportIntervalMillis: 60000, // Export every 60 seconds
    // });

    // --- Logging Setup ---
    // Create the log exporter
    const logExporter = new ConsoleLogRecordExporter(); // Or your OTLPLogRecordExporter(...)

    // Create the log processor
    const logProcessor = new BatchLogRecordProcessor(logExporter);

    // LoggerProvider manages Loggers.
    // Pass the processors directly in the constructor options
    const loggerProvider = new LoggerProvider({
      resource: mergedResource, // Use the merged resource here
      processors: [logProcessor], // THIS IS THE CORRECTION
    });

    // You can optionally set the global logger provider if you intend to use api.logs.getLogger
    // api.logs.setGlobalLoggerProvider(loggerProvider);

    // --- OpenTelemetry Node.js SDK Initialization ---
    // Create the NodeSDK instance with all configured components.
    sdkInstance = new OpenTelemetry.NodeSDK({
      resource: mergedResource, // Apply the defined resource
      sampler, // Set the span sampler
      spanProcessor, // Add the span processor
      instrumentations: getNodeAutoInstrumentations(), // Enable automatic instrumentations
      // metricReader, // Add the metric reader
      // For logs, you typically set the LoggerProvider globally or pass it to specific loggers.
      // The SDK itself doesn't directly take a LoggerProvider in its constructor like trace/metrics.
    });

    // Start the OpenTelemetry SDK. This initializes all configured components.
    await sdkInstance.start();

    // --- Set Global API Instances ---
    // Set the global tracer, meter, and logger instances. This allows other parts
    // of the application to retrieve them using `api.trace.getTracer()`, etc.

    // Corrected: Use api.diag.setLogger with api.diag.console for diagnostics.
    const { DiagConsoleLogger, DiagLogLevel } = await import(
      "@opentelemetry/api"
    );
    api.diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    tracer = api.trace.getTracer(serviceName);
    meter = api.metrics.getMeter(serviceName);
    // For logs, the logger is obtained from the specific LoggerProvider instance.
    // If you want a global logger, you might need to set it via api.logs.setLoggerProvider(loggerProvider);
    // and then api.logs.getLogger(serviceName);
    logger = loggerProvider.getLogger(serviceName);

    // --- Graceful Shutdown ---
    // Listen for SIGTERM signal (e.g., from process managers like PM2, Docker).
    // This ensures that all buffered telemetry data is flushed before the process exits.
    process.on("SIGTERM", () => {
      sdkInstance
        .shutdown()
        .then(() => console.log("OpenTelemetry SDK shut down gracefully."))
        .catch((error: Error) =>
          console.error("Error shutting down OpenTelemetry:", error)
        )
        .finally(() => process.exit(0)); // Ensure process exits after shutdown attempt
    });

    // Return the TelemetryProvider interface with the active instances.
    return {
      start: () => {
        console.log("OpenTelemetry SDK started.");
      },
      shutdown: async () => {
        if (sdkInstance) {
          await sdkInstance.shutdown();
          console.log("OpenTelemetry SDK shut down.");
        }
      },
      isActive: true, // Indicates that this is an active telemetry provider
      getTracer: () => tracer,
      getMeter: () => meter,
      getLogger: () => logger,
    };
  } catch (error) {
    // Catch any errors during the real provider setup and log them.
    console.error("Failed to initialize real OpenTelemetry provider:", error);
    // Fallback to a mock provider if the real one fails to initialize.
    return createMockProvider();
  }
}

/**
 * Creates a mock telemetry provider that doesn't actually use OpenTelemetry.
 * This is useful for development, testing, or when telemetry is disabled,
 * preventing the need for a full OpenTelemetry setup.
 *
 * @returns A mock TelemetryProvider instance.
 */
function createMockProvider(): TelemetryProvider {
  let active = false; // Internal state for the mock provider's active status
  return {
    start: () => {
      console.log("Starting mock telemetry provider");
      active = true;
    },
    shutdown: async () => {
      console.log("Shutting down mock telemetry provider");
      active = false;
      await Promise.resolve(); // Simulate async shutdown
    },
    isActive: active, // Reflects the mock provider's active status
    getTracer: () => undefined, // No real tracer in mock
    getMeter: () => undefined, // No real meter in mock
    getLogger: () => undefined, // No real logger in mock
  };
}
