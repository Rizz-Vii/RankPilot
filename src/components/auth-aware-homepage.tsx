// src/components/auth-aware-homepage.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Link2, Target } from "lucide-react";
import { useRealTimeDashboardData, useUserMetrics } from "@/hooks/use-dashboard-data";

export function AuthAwareHero() {
  const { user, loading } = useAuth();
  // ALWAYS call hooks in consistent order – pass null when unauthenticated so internal guards short‑circuit
  const userId = user?.uid || null;
  const { data: rtData, loading: rtLoading } = useRealTimeDashboardData(userId);
  const { metrics, loading: metricsLoading } = useUserMetrics(userId);

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded w-96 mx-auto mb-4"></div>
          <div className="h-6 bg-muted rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Logged-in user version
  if (user) {
    // Map to existing, real aggregated fields (avoid referencing non-existent properties)
    const activeProjects = rtData?.activeProjects?.current ?? 0;
    const avgSeoScore = metrics?.seoScore ?? rtData?.seoScore?.current ?? 0;
    const seoDisplay = typeof avgSeoScore === "number" ? `${avgSeoScore.toFixed(0)}%` : "—";
    const newBacklinks = rtData?.backlinks?.newLast30Days ?? 0;
    return (
      <motion.section
        className="text-center py-24 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
  <h2 className="text-4xl font-bold mb-4">Welcome back{user.displayName ? `, ${user.displayName}` : ""}! 👋</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Your unified growth intelligence hub is updating in real time—technical health, semantic opportunities & authority momentum all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button size="lg" asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button size="lg" variant="outline" asChild>
            <Link href="/neuroseo" className="flex items-center gap-2">
              Run NeuroSEO™ Analysis
            </Link>
          </Button>
        </div>

        {/* Quick Stats or Recent Activity */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          { (rtLoading || metricsLoading) && [0,1,2].map(i => (
            <div key={i} className="p-6 border rounded-lg animate-pulse flex flex-col items-center gap-2" aria-busy="true" aria-label="Loading metric">
              <div className="h-5 w-5 rounded bg-muted" />
              <div className="h-7 w-14 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          ))}
          { !(rtLoading || metricsLoading) && [
            { label: 'Active Projects', value: activeProjects, icon: Target },
            { label: 'SEO Performance', value: seoDisplay, icon: BarChart3 },
            { label: 'New Backlinks (30d)', value: newBacklinks, icon: Link2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-6 border rounded-lg flex flex-col items-center gap-2" role="group" aria-label={`${label} metric`}>
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <div className="text-2xl font-bold text-primary tabular-nums" aria-live="polite">{value}</div>
              <div className="text-sm text-muted-foreground text-center">{label}</div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  // Anonymous user version (existing hero)
  return (
    <motion.section
      className="text-center py-24 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        The All‑in‑One NeuroSEO™ Growth Platform
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        One unified AI stack for technical audits, content intelligence, keyword strategy,
        competitive monitoring, revenue impact tracking, and automation. Ship fixes faster,
        compound organic growth, and prove ROI—without juggling 6+ tools.
      </p>
      <div className="flex items-center justify-center mb-6 gap-3 flex-wrap">
        <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium badge-glow">
          No credit card required
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent-foreground font-medium badge-glow">
          7‑Day Free Trial
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium badge-glow">
          Cancel anytime
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" asChild className="micro-hover-lift">
          <Link href="/register" className="flex items-center gap-2">
            Start Free Trial – Launch in 60s
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="micro-hover-lift">
          <Link href="/features">Explore Features</Link>
        </Button>
      </div>
    </motion.section>
  );
}
