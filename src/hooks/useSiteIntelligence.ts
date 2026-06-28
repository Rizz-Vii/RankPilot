"use client";

/**
 * useSiteIntelligence — client hook for the unified /api/site-intelligence endpoint.
 *
 * The caller supplies only the analysis inputs; `userId`/`userPlan` are intentionally omitted and
 * resolved server-side from the Firebase ID token, so the client can't spoof identity or tier.
 * The returned report's items each carry data provenance ('measured' | 'estimated' | 'simulated')
 * which the UI is expected to render.
 */

import { useCallback, useState } from "react";

import { auth } from "@/lib/firebase";
import type {
  SiteIntelligenceReport,
  SiteIntelligenceRequest,
} from "@/lib/site-intelligence/types";

/** What the caller provides — server fills in userId/userPlan from the auth token. */
export type SiteIntelligenceInput = Omit<
  SiteIntelligenceRequest,
  "userId" | "userPlan"
>;

export interface UseSiteIntelligence {
  report: SiteIntelligenceReport | null;
  loading: boolean;
  error: string | null;
  run: (input: SiteIntelligenceInput) => Promise<SiteIntelligenceReport | null>;
  reset: () => void;
}

export function useSiteIntelligence(): UseSiteIntelligence {
  const [report, setReport] = useState<SiteIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (input: SiteIntelligenceInput) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You must be signed in to run an analysis.");
      }

      const res = await fetch("/api/site-intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      const json = (await res.json()) as {
        success?: boolean;
        report?: SiteIntelligenceReport;
        error?: string;
      };

      if (!res.ok || !json.success || !json.report) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      setReport(json.report);
      return json.report;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setLoading(false);
    setError(null);
  }, []);

  return { report, loading, error, run, reset };
}
