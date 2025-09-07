// src/app/(auth)/layout.tsx
import { HydrationProvider } from "@/components/HydrationContext";
import SiteHeader from "@/components/site-header";
import { AuthMobileSidebar } from "@/components/unified-mobile-sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HydrationProvider>
      <div className="flex flex-col min-h-screen">
        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 bg-primary text-primary-foreground px-3 py-2 rounded shadow"
        >
          Skip to main content
        </a>
        <SiteHeader />

        {/* Unified Mobile Navigation for Auth Pages */}
        <div className="fixed top-4 right-4 z-50 md:hidden">
          <AuthMobileSidebar />
        </div>

        <main id="main-content" role="main" className="flex-grow flex items-center justify-center py-12">
          {children}
        </main>
      </div>
    </HydrationProvider>
  );
}
