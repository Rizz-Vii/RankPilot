/**
 * Minimal test function to debug Cloud Run health check issue
 */
import { onCall } from "firebase-functions/v2/https";

export const testMinimal = onCall(
  {
    region: "australia-southeast2",
    memory: "256MiB",
    timeoutSeconds: 10,
  },
  async (_request) => {
    return {
      success: true,
      message: "Test function working",
      timestamp: new Date().toISOString()
    };
  }
);
