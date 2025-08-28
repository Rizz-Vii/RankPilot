/**
 * Minimal test function to debug Cloud Run health check issue
 */
import { onCall } from "firebase-functions/v2/https";

export const testMinimal = onCall(
  {
    region: "australia-southeast1",
    memory: "256MiB",
    timeoutSeconds: 10,
  },
  async (request) => {
    return {
      success: true,
      message: "Test function working",
      timestamp: new Date().toISOString()
    };
  }
);
