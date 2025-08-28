/**
 * Real-time Data Hooks for Dynamic Database Integration
 *
 * Custom React hooks for real-time data subscriptions and caching
 *
 * Generated: July 26, 2025
 * Integration: Dashboard components → Firestore real-time data
 */

import { DashboardDataService, type DashboardData } from "@/lib/services/dashboard-data.service";
import { useCallback, useEffect, useState } from "react";

// Hook for real-time dashboard data
export const useRealTimeDashboardData = (userId: string | null) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    console.log(`🔄 Setting up real-time dashboard data for user: ${userId}`);
    setLoading(true); setError(null);
    let cancelled = false;

    // Prime with initial data
    void DashboardDataService.getUserDashboardData(userId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(err => { if (!cancelled) { console.error('Error fetching initial dashboard data:', err); setError('Failed to load dashboard data'); setLoading(false); } });

    // Subscribe for realtime updates (StrictMode-safe: re-subscribes on remount)
    const unsubscribe = DashboardDataService.subscribeToUserDashboardData(userId, upd => {
      if (!cancelled) { console.log('📊 Dashboard data updated in real-time'); setData(upd); setError(null); }
    });

    return () => {
      cancelled = true;
      console.log('🔌 Unsubscribing from dashboard data');
      unsubscribe();
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const freshData = await DashboardDataService.getUserDashboardData(userId);
      setData(freshData);
      setError(null);
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

// Hook for chart-specific data with caching
export const useChartData = (
  chartType: "seoTrend" | "keywords" | "backlinks" | "traffic",
  userId: string | null
) => {
  type SEOTrendPoint = { date: string; score: number };
  type KeywordVisibility = { score: number; top3: number; top10: number; top100: number };
  type BacklinkHistoryEntry = { month: string; new: number; lost: number };
  type TrafficSource = { name: string; value: number; fill: string };
  type ChartDataMap = {
    seoTrend: SEOTrendPoint[];
    keywords: KeywordVisibility;
    backlinks: BacklinkHistoryEntry[];
    traffic: TrafficSource[];
  };
  const [chartData, setChartData] = useState<ChartDataMap[typeof chartType] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchChartData = async () => {
      try {
        const dashboardData = await DashboardDataService.getUserDashboardData(userId);

        switch (chartType) {
          case "seoTrend":
            setChartData(dashboardData.seoScoreTrend);
            break;
          case "keywords":
            setChartData(dashboardData.keywordVisibility);
            break;
          case "backlinks":
            setChartData(dashboardData.backlinks.history);
            break;
          case "traffic":
            setChartData(dashboardData.trafficSources);
            break;
          default:
            setChartData(null);
        }
      } catch (error) {
        console.error(`Error fetching ${chartType} chart data:`, error);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchChartData();
  }, [chartType, userId]);

  return { chartData, loading };
};

// Hook for user metrics with tier-based access
export const useUserMetrics = (userId: string | null) => {
  const [metrics, setMetrics] = useState({
    seoScore: 0,
    trackedKeywords: 0,
    activeProjects: 0,
    domainAuthority: 0,
    totalBacklinks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const data = await DashboardDataService.getUserDashboardData(userId);
        setMetrics({
          seoScore: data.seoScore.current,
          trackedKeywords: data.trackedKeywords.current,
          activeProjects: data.activeProjects.current,
          domainAuthority: data.domainAuthority.score,
          totalBacklinks: data.backlinks.total
        });
      } catch (error) {
        console.error("Error fetching user metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, [userId]);

  return { metrics, loading };
};
