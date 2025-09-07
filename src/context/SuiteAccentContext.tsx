"use client";
import React, { createContext, useContext } from "react";

export type SuiteAccent = "seo" | "sales" | "marketing" | "finance" | "none";

const SuiteAccentContext = createContext<SuiteAccent>("none");
export const useSuiteAccent = () => useContext(SuiteAccentContext);

interface ProviderProps {
  value: SuiteAccent;
  children: React.ReactNode;
}
export function SuiteAccentProvider({ value, children }: ProviderProps) {
  return (
    <SuiteAccentContext.Provider value={value}>
      {children}
    </SuiteAccentContext.Provider>
  );
}
