// src/app/(app)/performance/page.tsx
"use client";

import { PerformanceDashboard } from "@/components/performance-dashboard";
import Breadcrumb from "@/components/breadcrumb";
import _MobileToolLayout from "@/components/mobile-tool-layout";
import { Activity as _Activity } from "lucide-react";

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Breadcrumb />
      </div>
      <PerformanceDashboard />
    </div>
  );
}
