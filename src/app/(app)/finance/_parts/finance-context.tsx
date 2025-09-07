"use client";
import React, { createContext, useContext } from "react";
import type { AggregatedFinanceMetrics } from "@/lib/services/finance-metrics.service";

interface FinanceContextValue {
  data: AggregatedFinanceMetrics | null;
  months: number;
  refreshing: boolean;
}
const FinanceContext = createContext<FinanceContextValue | undefined>(
  undefined
);
export const FinanceContextProvider: React.FC<
  React.PropsWithChildren<FinanceContextValue>
> = ({ data, months, refreshing, children }) => (
  <FinanceContext.Provider value={{ data, months, refreshing }}>
    {children}
  </FinanceContext.Provider>
);
export function useFinanceContext() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinanceContext must be inside provider");
  return ctx;
}
