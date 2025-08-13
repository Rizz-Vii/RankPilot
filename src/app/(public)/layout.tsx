// src/app/(public)/layout.tsx
import SiteHeader from "@/components/site-header";
import { HydrationProvider } from "@/components/HydrationContext";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HydrationProvider>
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow">{children}</main>
      </div>
    </HydrationProvider>
  );
}
