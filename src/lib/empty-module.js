/**
 * Empty module used as a replacement for server-only modules in client bundles.
 * This prevents "issuerLayer" errors and other webpack bundling issues when
 * a server component or module is accidentally imported in client code.
 *
 * This module is dual-compatible with both ESM and CommonJS.
 */

// CommonJS export - only executed in CommonJS environments
if (typeof module !== "undefined") {
  const moduleObj = module || {};
  moduleObj.exports = {
    createTelemetryProvider: () => ({
      start: () => {},
      shutdown: async () => Promise.resolve(),
      isActive: false,
    }),
  };
}

/**
 * Default export for ES modules
 */
export default {};

/**
 * Stub implementation of createTelemetryProvider that does nothing
 * @return {Object} A no-op telemetry provider
 */
export const createTelemetryProvider = () => ({
  start: () => {},
  shutdown: async () => Promise.resolve(),
  isActive: false,
});
