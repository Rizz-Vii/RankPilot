"use client";

import NeuroSEODashboard from "@/components/NeuroSEODashboard";
import { TutorialAccess } from "@/components/tutorials/TutorialAccess";
import { motion } from "framer-motion";
import { ToolPageHeader } from "@/components/tool-page-header";

export default function NeuroSEOPage() {
  return (
    <main className="container mx-auto py-6 space-y-8">
      <ToolPageHeader
        title="NeuroSEO™ Dashboard"
        description="Advanced AI-powered SEO analysis with 6 intelligent engines for comprehensive optimization."
        badges={[{ label: "Suite", variant: "secondary" }, { label: "AI", variant: "outline", className: "text-primary border-primary/40" }]}
        showBreadcrumb
      >
        <TutorialAccess
          feature="neuroseo"
          title="Learn NeuroSEO™"
          description="Master AI-powered SEO analysis with our comprehensive tutorials."
        />
      </ToolPageHeader>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <NeuroSEODashboard />
      </motion.section>
    </main>
  );
}
