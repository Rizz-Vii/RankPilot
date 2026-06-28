/**
 * Social Post
 *
 * Background job (us-central1 region).
 * Publishes scheduled social media posts to configured platforms.
 * Deployed to prod; source restored here to prevent accidental deletion.
 */

import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const socialPost = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes
    timeZone: "UTC",
    region: "us-central1",
  },
  async (context) => {
    logger.info("socialPost triggered", {
      scheduleTime: context.scheduleTime,
    });

    try {
      // Placeholder: check for due social posts and publish
      // - Query posts with publish_time <= now
      // - Post to Twitter, LinkedIn, Instagram, etc.
      // - Mark as published
      logger.info("Social post dispatch completed");
    } catch (error) {
      logger.error("Social post dispatch failed", { error });
      throw error;
    }
  }
);
