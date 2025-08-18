// Simplified analytics that won&apos;t break the app
export const trackEvent = (eventName: string, eventParams?: unknown) => {
  // For now, just log to console. Can be enhanced later when Firebase issues are resolved
  if (process.env.NODE_ENV === "development") {
    console.log(`Analytics Event: ${eventName}`, eventParams);
  }
};

export const setUserProperties = (userId: string, properties: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`User Properties for ${userId}:`, properties);
  }
};

// Safe wrapper that prevents any analytics errors from breaking the app
export const safeAnalytics = {
  track: trackEvent,
  setUser: setUserProperties,

  // Common events
  viewPage: (pageName: string) => trackEvent("page_view", { page: pageName }),
  clickButton: (buttonName: string) =>
    trackEvent("button_click", { button: buttonName }),
  featureUsage: (feature: string) => trackEvent("feature_usage", { feature }),
};
