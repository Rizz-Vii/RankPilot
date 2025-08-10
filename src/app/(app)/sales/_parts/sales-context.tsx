"use client";
import React, { createContext, useContext } from 'react';
import type { AggregatedSalesMetrics, SalesDealDoc, ForecastSnapshotDoc } from '@/lib/services/sales-metrics.service';

interface SalesContextValue { data: AggregatedSalesMetrics | null; range: '30d'|'90d'|'ytd'; refreshing: boolean; deals?: SalesDealDoc[]; forecast?: ForecastSnapshotDoc[]; }
const SalesContext = createContext<SalesContextValue | undefined>(undefined);
export const SalesContextProvider: React.FC<React.PropsWithChildren<SalesContextValue>> = ({ data, range, refreshing, deals, forecast, children }) => (
  <SalesContext.Provider value={{ data, range, refreshing, deals, forecast }}>{children}</SalesContext.Provider>
);
export function useSalesContext() { const ctx = useContext(SalesContext); if (!ctx) throw new Error('useSalesContext must be used within provider'); return ctx; }
