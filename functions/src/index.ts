// Enhanced Firebase Functions - australia-southeast2
import { setGlobalOptions } from "firebase-functions/v2";

// Core feature functions
import { adminChatHandler, customerChatHandler } from "./chatbot";
import { testMinimal } from "./test-minimal";

// Export keyword suggestions (production)
export { getKeywordSuggestionsEnhanced } from "./api/production-keyword-suggestions";

// Export SEO Audit (was previously un-exported so not deployed)
export { runSeoAudit } from "./api/audit";

// Export performance dashboard suite (choose single canonical implementation)
export { performanceDashboard, realtimeMetrics, functionMetrics, abTestManagement, healthCheck } from "./api/performance-dashboard-functions";

setGlobalOptions({ region: "australia-southeast2" });

// Export chatbot & utility test function
export { adminChatHandler, customerChatHandler, testMinimal };

// Note: sendBillingReminder exists as scheduled function in production
// but is not exported here to avoid deployment conflicts
