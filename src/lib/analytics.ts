import { db, analytics as rawAnalytics } from "@/lib/firebase";
import { logEvent, setUserProperties, type Analytics } from "firebase/analytics";
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

// Resolve analytics instance (only set in production via firebase/index)
function getAnalyticsInstance(): Analytics | null {
  if (typeof window === "undefined") return null;
  return rawAnalytics ?? null;
}

// Defensive helper – Firebase analytics types require a real instance
function withAnalytics(cb: (a: Analytics) => void): void {
  const a = getAnalyticsInstance();
  if (!a) return; // silently ignore when unavailable (dev / unsupported)
  try {
    cb(a);
  } catch (err) {
    // Non-critical — swallow errors; show debug info in non-production environments
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== "production") console.debug("analytics error", err);
  }
}

// Compute simple conversion rates – placeholder until richer analytics needed
const calculateConversionRates = (data: unknown): {
  viewToBegin: number;
  beginToPurchase: number;
  viewToPurchase: number;
} => {
  try {
    const daily = (data && typeof data === "object" && "daily" in data)
      ? (data as { daily?: unknown }).daily
      : {};
    // naive aggregate: purchase / view_pricing etc.
    let views = 0;
    let purchases = 0;
    let begins = 0;
    if (daily && typeof daily === "object") {
      Object.values(daily as Record<string, unknown>).forEach((d: unknown) => {
        if (d && typeof d === "object") {
          const obj = d as Record<string, unknown>;
          const vp = obj.view_pricing as unknown;
          const bc = obj.begin_checkout as unknown;
          const pu = obj.purchase as unknown;
          views += Number(
            (vp && typeof vp === "object" && "count" in vp ? (vp as { count?: unknown }).count : vp) || 0
          );
          begins += Number(
            (bc && typeof bc === "object" && "count" in bc ? (bc as { count?: unknown }).count : bc) || 0
          );
          purchases += Number(
            (pu && typeof pu === "object" && "count" in pu ? (pu as { count?: unknown }).count : pu) || 0
          );
        }
      });
    }
    return {
      viewToBegin: views ? begins / views : 0,
      beginToPurchase: begins ? purchases / begins : 0,
      viewToPurchase: views ? purchases / views : 0,
    };
  } catch {
    return { viewToBegin: 0, beginToPurchase: 0, viewToPurchase: 0 };
  }
};

// Payment Analytics Events
export const trackPaymentEvents = {
  // Track when user views pricing page
  viewPricing: (source?: string) => {
    withAnalytics(analytics => {
      logEvent(analytics, "view_pricing", {
        source: source || "direct",
        timestamp: new Date().toISOString(),
      });
    });
  },

  // Track when user starts checkout process
  beginCheckout: (plan: string, amount: number, currency: string = "USD") => {
    withAnalytics(analytics => {
      logEvent(analytics, "begin_checkout", {
        currency,
        value: amount,
        items: [
          {
            item_id: plan,
            item_name: `RankPilot ${plan}`,
            category: "subscription",
            quantity: 1,
            price: amount,
          },
        ],
      });
    });
  },

  // Track successful purchases
  purchase: (
    plan: string,
    amount: number,
    transactionId: string,
    currency: string = "USD"
  ) => {
    withAnalytics(analytics => {
      logEvent(analytics, "purchase", {
        transaction_id: transactionId,
        currency,
        value: amount,
        items: [
          {
            item_id: plan,
            item_name: `RankPilot ${plan}`,
            category: "subscription",
            quantity: 1,
            price: amount,
          },
        ],
      });
    });
  },

  // Track payment method selection
  selectPaymentMethod: (method: string, plan: string) => {
    withAnalytics(analytics => {
      logEvent(analytics, "select_payment_method", {
        payment_method: method,
        plan: plan,
        timestamp: new Date().toISOString(),
      });
    });
  },

  // Track checkout abandonment
  abandonCheckout: (plan: string, step: string, reason?: string) => {
    withAnalytics(analytics => {
      logEvent(analytics, "abandon_checkout", {
        plan,
        step,
        reason: reason || "unknown",
        timestamp: new Date().toISOString(),
      });
    });
  },

  // Track subscription changes
  subscriptionChange: (
    action: "upgrade" | "downgrade" | "cancel",
    fromPlan: string,
    toPlan?: string
  ) => {
    withAnalytics(analytics => {
      logEvent(analytics, "subscription_change", {
        action,
        from_plan: fromPlan,
        to_plan: toPlan || null,
        timestamp: new Date().toISOString(),
      });
    });
  },

  // Track refund requests
  refundRequest: (plan: string, amount: number, reason: string) => {
    withAnalytics(analytics => {
      logEvent(analytics, "refund_request", {
        plan,
        amount,
        reason,
        timestamp: new Date().toISOString(),
      });
    });
  },
};

// User Analytics Events
export const trackUserEvents = {
  // Set user properties for segmentation
  setUserProperties: (
    userId: string,
    properties: {
      plan?: string;
      lifetime_value?: number;
      subscription_status?: string;
      signup_date?: string;
    }
  ) => {
    const a = getAnalyticsInstance();
    if (!a) return;
    setUserProperties(a, {
      user_id: userId,
      ...properties,
    });
  },

  // Track user engagement
  engagement: (action: string, category: string, label?: string) => {
    const a = getAnalyticsInstance();
    if (!a) return;
    logEvent(a, "engagement", {
      action,
      category,
      label: label || null,
      timestamp: new Date().toISOString(),
    });
  },

  // Track feature usage
  featureUsage: (feature: string, plan: string, usage_count?: number) => {
    const a = getAnalyticsInstance();
    if (!a) return;
    logEvent(a, "feature_usage", {
      feature,
      plan,
      usage_count: usage_count || 1,
      timestamp: new Date().toISOString(),
    });
  },
};

// Conversion Funnel Tracking
export const conversionFunnel = {
  // Track funnel steps
  step: (
    step: number,
    stepName: string,
    plan?: string,
    additionalData?: Record<string, unknown>
  ) => {
    const a = getAnalyticsInstance();
    if (!a) return;
    logEvent(a, "funnel_step", {
      step_number: step,
      step_name: stepName,
      plan: plan || null,
      ...additionalData,
      timestamp: new Date().toISOString(),
    });
  },

  // Track conversion rates in Firestore
  updateConversionMetrics: async (
    userId: string,
    event: "view_pricing" | "begin_checkout" | "purchase",
    plan?: string
  ) => {
    try {
      const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const metricsRef = doc(db, "analytics", "conversion_metrics");

      await updateDoc(metricsRef, {
        [`daily.${date}.${event}`]: increment(1),
        [`daily.${date}.total_users`]: increment(1),
        [`plans.${plan || "unknown"}.${event}`]: increment(1),
        lastUpdated: serverTimestamp(),
      });

      // Track user journey
      if (userId) {
        const userJourneyRef = doc(db, "user_journeys", userId);
        await updateDoc(userJourneyRef, {
          [`events.${event}`]: {
            timestamp: serverTimestamp(),
            plan: plan || null,
          },
          lastActivity: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error updating conversion metrics:", error);
    }
  },
};

// Real-time Analytics Dashboard Data
export const getAnalyticsDashboard = async () => {
  try {
    const metricsRef = doc(db, "analytics", "conversion_metrics");
    const snapshot = await getDoc(metricsRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        conversionRates: calculateConversionRates(data),
        dailyMetrics: data.daily || {},
        planMetrics: data.plans || {},
        lastUpdated: data.lastUpdated?.toDate() || null,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching analytics dashboard:", error);
    throw error;
  }
};

// A/B Testing Support
export const abTesting = {
  // Track A/B test variant
  trackVariant: (testName: string, variant: string, plan?: string) => {
    const a = getAnalyticsInstance();
    if (!a) return;
    logEvent(a, "ab_test_variant", {
      test_name: testName,
      variant,
      plan: plan || null,
      timestamp: new Date().toISOString(),
    });
  },

  // Track A/B test conversion
  trackConversion: (
    testName: string,
    variant: string,
    conversionType: string,
    value?: number
  ) => {
    const a = getAnalyticsInstance();
    if (!a) return;
    logEvent(a, "ab_test_conversion", {
      test_name: testName,
      variant,
      conversion_type: conversionType,
      value: value ?? null,
      timestamp: new Date().toISOString(),
    });
  },
};

// Cohort Analysis
export const cohortAnalysis = {
  // Track user cohort
  trackCohort: async (userId: string, cohortDate: string, plan: string) => {
    try {
      const cohortRef = doc(db, "cohorts", cohortDate);
      await updateDoc(cohortRef, {
        [`users.${userId}`]: {
          plan,
          joinedAt: serverTimestamp(),
        },
        [`totals.${plan}`]: increment(1),
        totalUsers: increment(1),
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error tracking cohort:", error);
    }
  },

  // Track cohort retention
  trackRetention: async (
    userId: string,
    cohortDate: string,
    retentionPeriod: number
  ) => {
    try {
      const retentionRef = doc(
        db,
        "retention",
        `${cohortDate}_${retentionPeriod}`
      );
      await updateDoc(retentionRef, {
        [`active_users.${userId}`]: serverTimestamp(),
        totalActiveUsers: increment(1),
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error tracking retention:", error);
    }
  },
};
