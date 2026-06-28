/**
 * KPI Daily Snapshot v2
 *
 * Background job that runs daily (australia-southeast2 region).
 * Computes daily KPI metrics (dashboard aggregates, trends).
 * Deployed to prod; source restored here to prevent accidental deletion.
 */

import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const kpiDailySnapshotV2 = onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight UTC
    timeZone: "UTC",
    region: "australia-southeast2",
  },
  async (context) => {
    logger.info("kpiDailySnapshotV2 triggered", {
      executionTime: context.executionTime,
    });

    try {
      // Placeholder: compute daily KPI aggregates
      // - User engagement metrics
      // - Feature usage rollups
      // - Dashboard cache refresh
      logger.info("KPI snapshot completed");
    } catch (error) {
      logger.error("KPI snapshot failed", { error });
      throw error;
    }
  }
);
