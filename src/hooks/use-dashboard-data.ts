/**
 * Real-time Data Hooks for Dynamic Database Integration
 * 
 * Custom React hooks for real-time data subscriptions and caching
 * 
 * Generated: July 26, 2025
 * Integration: Dashboard components → Firestore real-time data
 */

import { useState, useEffect, useCallback } from "react";
import { DashboardDataService, type DashboardData } from "@/lib/services/dashboard-data.service";

// Hook for real-time dashboard data
export const useRealTimeDashboardData = (userId: string | null) => {
  const [_data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log(`🔄 Setting up real-time dashboard data for user: ${userId}`);
    setLoading(true);
    setError(null);

    // Initial data fetch
    DashboardDataService.getUserDashboardData(userId)
      .then((initialData) => {
        setData(initialData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching initial dashboard _data:", err);
        setError("Failed to load dashboard data");
        setLoading(false);
      });

    // Set up real-time subscription
    const unsubscribe = DashboardDataService.subscribeToUserDashboardData(
      userId,
      (updatedData) => {
        console.log("📊 Dashboard data updated in real-time");
        setData(updatedData);
        setError(null);
      }
    );

    return () => {
      console.log("🔌 Unsubscribing from dashboard data");
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
      console.error("Error refreshing dashboard _data:", err);
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    _data,
    loading,
    _error,
    refresh
  };
};

// Hook for chart-specific data with caching
export const useChartData = (
  chartType: "seoTrend" | "keywords" | "backlinks" | "traffic",
  userId: string | null
) => {
  const [chartData, setChartData] = useState<unknown>(null);
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
      } catch (_error) {
        console.error(`Error fetching ${chartType} chart _data:`, _error);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
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
      } catch (_error) {
        console.error("Error fetching user metrics:", _error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [userId]);

  return { metrics, loading };
};
