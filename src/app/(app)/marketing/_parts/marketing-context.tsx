"use client";
import React, { createContext, useContext } from "react";
import type { AggregatedMarketingMetrics } from "@/lib/services/marketing-metrics.service";

interface MarketingContextValue {
  data: AggregatedMarketingMetrics | null;
  months: number;
  refreshing: boolean;
}
const MarketingContext = createContext<MarketingContextValue>({
  data: null,
  months: 6,
  refreshing: false,
});
export function MarketingContextProvider({
  data,
  months,
  refreshing,
  children,
}: React.PropsWithChildren<
  MarketingContextValue & { children: React.ReactNode }
>) {
  return (
    <MarketingContext.Provider value={{ data, months, refreshing }}>
      {children}
    </MarketingContext.Provider>
  );
}
export function useMarketingContext() {
  return useContext(MarketingContext);
}
