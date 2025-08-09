"use client";
import { safeAnalytics } from '@/lib/safe-analytics';

export function trackDashboardView(domain: 'sales' | 'finance' | 'marketing') {
    safeAnalytics.track('dashboard_view', { domain });
}
