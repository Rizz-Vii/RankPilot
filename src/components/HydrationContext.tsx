"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// Global hydration context to track client hydration across the app
const HydrationContext = createContext(false);

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return (
    <HydrationContext.Provider value={hydrated}>
      {children}
    </HydrationContext.Provider>
  );
}

export function useHydration() {
  return useContext(HydrationContext);
}
