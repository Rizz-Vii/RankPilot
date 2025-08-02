import { getAnalytics, logEvent, setUserProperties } from "firebase/analytics";
import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { analytics, db } from "@/lib/firebase";

// Initialize analytics (client-side only)
const getAnalyticsInstance = () => {
  if (typeof window !== "undefined") {
    try {
      return getAnalytics();
    } catch {
      return null;
    }
  }
  return null;
};

// Payment Analytics Events
export const trackPaymentEvents = {
  // Track when user views pricing page
  viewPricing: (source?: string) => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, "view_pricing", {
        source: source || "direct",
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track when user starts checkout process
  beginCheckout: (plan: string, amount: number, currency: string = "USD") => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
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
    }
  },

  // Track successful purchases
  purchase: (
    plan: string,
    amount: number,
    transactionId: string,
    currency: string = "USD"
  ) => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
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
    }
  },

  // Track payment method selection
  selectPaymentMethod: (method: string, plan: string) => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, "select_payment_method", {
        payment_method: method,
        plan: plan,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track checkout abandonment
  abandonCheckout: (plan: string, step: string, reason?: string) => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, "abandon_checkout", {
        plan,
        step,
        reason: reason || "unknown",
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track subscription changes
  subscriptionChange: (
    action: "upgrade" | "downgrade" | "cancel",
    fromPlan: string,
    toPlan?: string
  ) => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, "subscription_change", {
        action,
        from_plan: fromPlan,
        to_plan: toPlan || null,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track refund requests
  refundRequest: (plan: string, amount: number, reason: string) => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, "refund_request", {
        plan,
        amount,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
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
    if (typeof window !== "undefined" && analytics) {
      setUserProperties(analytics, {
        user_id: userId,
        ...properties,
      });
    }
  },

  // Track user engagement
  engagement: (action: string, category: string, label?: string) => {
    if (typeof window !== "undefined" && analytics) {
      logEvent(analytics, "engagement", {
        action,
        category,
        label: label || null,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track feature usage
  featureUsage: (feature: string, plan: string, usage_count?: number) => {
    if (typeof window !== "undefined" && analytics) {
      logEvent(analytics, "feature_usage", {
        feature,
        plan,
        usage_count: usage_count || 1,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Conversion Funnel Tracking
export const conversionFunnel = {
  // Track funnel steps
  step: (
    step: number,
    stepName: string,
    plan?: string,
    additionalData?: Record<string, any>
  ) => {
    if (typeof window !== "undefined" && analytics) {
      logEvent(analytics, "funnel_step", {
        step_number: step,
        step_name: stepName,
        plan: plan || null,
        ...additionalData,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track conversion rates in Firestore
  updateConversionMetrics: async (
    userId: string,
    _event: "view_pricing" | "begin_checkout" | "purchase",
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
    } catch (_error) {
      console.error("Error updating conversion metrics:", _error);
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
        conversionRates: calculateConversionRates(_data),
        dailyMetrics: data.daily || {},
        planMetrics: data.plans || {},
        lastUpdated: data.lastUpdated?.toDate() || null,
      };
    }

    return null;
  } catch (_error) {
    console.error("Error fetching analytics dashboard:", _error);
    throw error;
  }
};

// Helper function to calculate conversion rates
const calculateConversionRates = (_data: unknown) => {
  const daily = data.daily || {};
  const plans = data.plans || {};

  // Calculate overall conversion rates
  let totalViews = 0;
  let totalCheckouts = 0;
  let totalPurchases = 0;

  Object.values(daily).forEach((day: unknown) => {
    totalViews += day.view_pricing || 0;
    totalCheckouts += day.begin_checkout || 0;
    totalPurchases += day.purchase || 0;
  });

  const viewToCheckout =
    totalViews > 0 ? (totalCheckouts / totalViews) * 100 : 0;
  const checkoutToPurchase =
    totalCheckouts > 0 ? (totalPurchases / totalCheckouts) * 100 : 0;
  const overallConversion =
    totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

  // Calculate plan-specific conversion rates
  const planConversions = Object.entries(plans).map(
    ([plan, metrics]: [string, any]) => ({
      plan,
      views: metrics.view_pricing || 0,
      checkouts: metrics.begin_checkout || 0,
      purchases: metrics.purchase || 0,
      conversionRate:
        metrics.view_pricing > 0
          ? (metrics.purchase / metrics.view_pricing) * 100
          : 0,
    })
  );

  return {
    overall: {
      viewToCheckout: Number(viewToCheckout.toFixed(2)),
      checkoutToPurchase: Number(checkoutToPurchase.toFixed(2)),
      overallConversion: Number(overallConversion.toFixed(2)),
    },
    byPlan: planConversions,
    totals: {
      views: totalViews,
      checkouts: totalCheckouts,
      purchases: totalPurchases,
    },
  };
};

// A/B Testing Support
export const abTesting = {
  // Track A/B test variant
  trackVariant: (testName: string, variant: string, plan?: string) => {
    if (typeof window !== "undefined" && analytics) {
      logEvent(analytics, "ab_test_variant", {
        test_name: testName,
        variant,
        plan: plan || null,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Track A/B test conversion
  trackConversion: (
    testName: string,
    variant: string,
    conversionType: string,
    value?: number
  ) => {
    if (typeof window !== "undefined" && analytics) {
      logEvent(analytics, "ab_test_conversion", {
        test_name: testName,
        variant,
        conversion_type: conversionType,
        value: value || null,
        timestamp: new Date().toISOString(),
      });
    }
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
    } catch (_error) {
      console.error("Error tracking cohort:", _error);
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
    } catch (_error) {
      console.error("Error tracking retention:", _error);
    }
  },
};
