"use client";

import { ChatBot } from "@/components/chat";
import { PerformanceIndicator, WebVitalsMonitor } from "@/components/performance/web-vitals-monitor";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import SiteFooter from "@/components/site-footer";
import { Toaster } from "@/components/ui/toaster";
import { UIProvider } from "@/context/UIContext";
import { Toaster as SonnerToaster } from "sonner";
import { DevHydrationSanitizer } from "@/components/dev/DevHydrationSanitizer";

export function ClientLayout({ children }: { children: React.ReactNode; }) {
  return (
    <UIProvider>
  <DevHydrationSanitizer />
      {children}
      <Toaster />
      <SonnerToaster position="top-right" richColors />
      <SiteFooter />
      <WebVitalsMonitor />
      <PerformanceIndicator />
      <PWAInstallPrompt />

      {/* AI Chatbot System - Global availability for all authenticated users */}
      <ChatBot />
    </UIProvider>
  );
}
