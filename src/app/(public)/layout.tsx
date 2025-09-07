// src/app/(public)/layout.tsx
import { HydrationProvider } from "@/components/HydrationContext";
import SiteHeader from "@/components/site-header";
import { AuthProvider } from "@/context/AuthContext";

// Public marketing pages are static by default; dynamic client islands are allowed
export const dynamic = "force-static";
export const revalidate = false;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <HydrationProvider>
        <div className="flex flex-col min-h-[100dvh] sm:min-h-screen">
          {/* Skip link for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 bg-primary text-primary-foreground px-3 py-2 rounded shadow"
          >
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main-content" role="main" className="flex-grow">
            {children}
          </main>
        </div>
      </HydrationProvider>
    </AuthProvider>
  );
}
