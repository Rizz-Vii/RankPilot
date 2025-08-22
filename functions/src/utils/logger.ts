/**
 * Silent console utility for Firebase Functions
 * Conditionally suppresses console output during deployment
 */

const isDeployment = process.env.NODE_ENV === "production" || process.env.FIREBASE_DEPLOY === "true";

export const logger = {
  log: (...args: unknown[]) => {
    if (!isDeployment) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (!isDeployment) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (!isDeployment) {
      console.info(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always show errors
    console.error(...args);
  },

  // Deployment-safe logging for critical operations
  deploymentSafe: (...args: unknown[]) => {
    // Only log during development
    if (!isDeployment) {
      console.log("🚀 [DEV]", ...args);
    }
  }
};

export default logger;
