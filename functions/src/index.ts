import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsOptions } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { EventPublisher, EventType } from "../src/lib/events";

// Initialize Firebase Admin SDK first
initializeApp();
logger.info("Firebase Admin SDK initialized successfully");

// Set options for better cold start performance
const httpsOptions: HttpsOptions = {
  timeoutSeconds: 60,
  memory: "256MiB",
  minInstances: 0,
  region: "australia-southeast2", // Explicitly set region for consistency
};

// Global error handler for unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Health check function to confirm functions are working correctly
export const healthCheck = onCall(httpsOptions, async (request) => {
  const startTime = Date.now();
  
  try {
    logger.info("Health check function called", {
      auth: request.auth ? "authenticated" : "unauthenticated",
      timestamp: new Date().toISOString(),
    });

    const responseTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    
    // Publish health check event
    await EventPublisher.healthCheck('ok', responseTime, timestamp);

    return {
      status: "ok",
      timestamp,
      runtime: "Node.js v" + process.version,
      region: httpsOptions.region,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    
    logger.error("Health check function failed:", error);
    
    // Publish health check event for failure
    await EventPublisher.healthCheck('error', responseTime, timestamp);

    throw new Error("Health check failed");
  }
});

// export * from "./api/keyword-suggestions";
// export * from "./api/audit";
// export * from "./api/analyze-content";
