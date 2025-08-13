// src/app/(auth)/layout.tsx
import SiteHeader from "@/components/site-header";
import { AuthMobileSidebar } from "@/components/unified-mobile-sidebar";
import { HydrationProvider } from "@/components/HydrationContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HydrationProvider>
      <div className="flex flex-col min-h-screen">
        <SiteHeader />

        {/* Unified Mobile Navigation for Auth Pages */}
        <div className="fixed top-4 right-4 z-50 md:hidden">
          <AuthMobileSidebar />
        </div>

        <main className="flex-grow flex items-center justify-center py-12">
          {children}
        </main>
      </div>
    </HydrationProvider>
  );
}
