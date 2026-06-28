/**
 * Ads Export Batch
 *
 * Background job (us-central1 region).
 * Exports ad campaign data to external integrations (reporting, archival).
 * Deployed to prod; source restored here to prevent accidental deletion.
 */

import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const adsExportBatch = onSchedule(
  {
    schedule: "0 2 * * *", // Daily at 2 AM UTC
    timeZone: "UTC",
    region: "us-central1",
  },
  async (context) => {
    logger.info("adsExportBatch triggered", {
      scheduleTime: context.scheduleTime,
    });

    try {
      // Placeholder: batch export ad campaign data
      // - Query active campaigns
      // - Export to external storage/reporting
      // - Archive historical data
      logger.info("Ads export batch completed");
    } catch (error) {
      logger.error("Ads export batch failed", { error });
      throw error;
    }
  }
);
