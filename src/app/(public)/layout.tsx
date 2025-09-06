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
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <main className="flex-grow">{children}</main>
        </div>
      </HydrationProvider>
    </AuthProvider>
  );
}
