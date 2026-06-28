// Enhanced Firebase Functions
import { setGlobalOptions } from "firebase-functions/v2";

// Core feature functions
import { adminChatHandler, customerChatHandler } from "./chatbot.js";
import { testMinimal } from "./test-minimal.js";
// NodeNext requires explicit .js extension in source imports for ESM correctness
import { exportUserData, requestAccountDeletion } from "./user-data.js";

// Background jobs (restored from prod to prevent accidental deletion)
import { kpiDailySnapshotV2 } from "./background-jobs/kpi-daily-snapshot.js";
import { adsExportBatch } from "./background-jobs/ads-export-batch.js";
import { dispatchDueMarketingCampaigns } from "./background-jobs/dispatch-due-marketing-campaigns.js";
import { socialPost } from "./background-jobs/social-post.js";

// Export keyword suggestions (production)
export { getKeywordSuggestionsEnhanced } from "./api/production-keyword-suggestions.js";

// Export SEO Audit (was previously un-exported so not deployed)
export { runSeoAudit } from "./api/audit.js";

// Export performance dashboard suite (choose single canonical implementation)
export {
  abTestManagement,
  functionMetrics,
  healthCheck,
  performanceDashboard,
  realtimeMetrics,
} from "./api/performance-dashboard-functions.js";
// Scheduled maintenance (versioned to create fresh Scheduler jobs in valid region)
export { cleanupInvites as cleanupInvitesV2 } from "./scheduled/cleanup-invites.js";
// Voice holds cleanup
export { cleanupVoiceHolds } from "./scheduled/cleanup-voice-holds.js";
// Automation scheduler
export { runDueAutomationScheduler as runDueAutomationSchedulerV2 } from "./scheduled/run-due-automation.js";
// Daily KPI snapshot (T16)
export { kpiDailySnapshot as kpiDailySnapshotV2 } from "./scheduled/kpi-daily-snapshot.js";
// Voice recurring scheduler
export { processVoiceRecurring } from "./scheduled/voice-recurring.js";
// Voice outbound queue processor (single-call deferrals)
export { processVoiceOutboundQueue } from "./scheduled/voice-outbound-queue.js";
// Event Backbone mirroring (T28 scaffold)
export { onEventWrite, onEventWriteAU } from "./events/onEventWrite.js";
// Stripe Webhook (canonical HTTP endpoint)
export { stripeWebhook } from "./stripe-webhook.js";

// Global default region for unspecified functions only (set once)
// Note: Cloud Functions for Firebase do not currently support australia-southeast2 for this project.
// Use australia-southeast1 for Functions while Hosting/SSR runs in australia-southeast2.
setGlobalOptions({ region: "australia-southeast1" });

// Export chatbot & utility test function
export {
  adminChatHandler,
  customerChatHandler,
  exportUserData,
  requestAccountDeletion,
  testMinimal,
};

// Background jobs (restored from prod to prevent accidental deletion on future deploys)
export {
  kpiDailySnapshotV2 as kpiDailySnapshotV2_bg,
  adsExportBatch,
  dispatchDueMarketingCampaigns,
  socialPost,
};

// Minimal health endpoint to validate cold start and module load
export { healthCheck as health } from "./api/performance-dashboard-functions.js";

// Note: sendBillingReminder exists as scheduled function in production
// but is not exported here to avoid deployment conflicts
