// src/app/(public)/layout.tsx
import SiteHeader from "@/components/site-header";
import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow">{children}</main>
    </div>
  );
}
