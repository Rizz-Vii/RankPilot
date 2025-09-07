export interface Analytics {}
export function isSupported(): Promise<boolean>;
export function getAnalytics(app?: any): Analytics;
export function logEvent(
  analytics: Analytics,
  eventName: string,
  params?: Record<string, unknown>
): void;
export function setUserProperties(
  analytics: Analytics,
  properties: Record<string, unknown>
): void;
