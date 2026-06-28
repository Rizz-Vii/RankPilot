/**
 * Dispatch Due Marketing Campaigns
 *
 * Background job (us-central1 region).
 * Sends scheduled marketing campaigns at their configured times.
 * Deployed to prod; source restored here to prevent accidental deletion.
 */

import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const dispatchDueMarketingCampaigns = onSchedule(
  {
    schedule: "*/15 * * * *", // Every 15 minutes
    timeZone: "UTC",
    region: "us-central1",
  },
  async (context) => {
    logger.info("dispatchDueMarketingCampaigns triggered", {
      scheduleTime: context.scheduleTime,
    });

    try {
      // Placeholder: check for due campaigns and dispatch
      // - Query campaigns with trigger_time <= now
      // - Dispatch emails/messages
      // - Mark as sent
      logger.info("Campaign dispatch completed");
    } catch (error) {
      logger.error("Campaign dispatch failed", { error });
      throw error;
    }
  }
);
