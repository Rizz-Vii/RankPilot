// Minimal export for testing KPI snapshot function only
import { setGlobalOptions } from "firebase-functions/v2";

// Daily KPI snapshot (T16)
export { kpiDailySnapshot } from "./scheduled/kpi-daily-snapshot";

setGlobalOptions({ region: "australia-southeast2" });