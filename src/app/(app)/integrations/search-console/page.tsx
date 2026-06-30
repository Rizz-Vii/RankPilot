"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisItem } from "@/lib/site-intelligence/types";
import { useCallback, useEffect, useState } from "react";

interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export default function SearchConsoleIntegrationPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(true);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [activeSite, setActiveSite] = useState<string | null>(null);
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await user?.getIdToken?.();
      return fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [user]
  );

  // Surface the OAuth redirect outcome (?gsc=connected|denied|expired|error).
  useEffect(() => {
    const status =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("gsc")
        : null;
    if (!status) return;
    const map: Record<string, { title: string; variant?: "destructive" }> = {
      connected: { title: "Google Search Console connected" },
      denied: { title: "Connection cancelled", variant: "destructive" },
      expired: {
        title: "Connection expired — please retry",
        variant: "destructive",
      },
      error: { title: "Connection failed — please retry", variant: "destructive" },
    };
    const m = map[status];
    if (m) toast({ title: m.title, variant: m.variant });
  }, [toast]);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch("/api/integrations/gsc/data");
      const j = await res.json();
      setConnected(!!j.connected);
    } catch {
      setConnected(false);
    }
  }, [user, authedFetch]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const connect = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/integrations/gsc/start");
      if (res.status === 503) {
        setConfigured(false);
        toast({
          title: "Not configured yet",
          description:
            "The owner must set the Google OAuth client credentials before connecting.",
          variant: "destructive",
        });
        return;
      }
      const j = await res.json();
      if (j.authUrl) window.location.href = j.authUrl as string;
    } catch {
      toast({ title: "Could not start connection", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/integrations/gsc/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      setSites(Array.isArray(j.sites) ? j.sites : []);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (connected) loadSites();
  }, [connected, loadSites]);

  const loadSiteData = async (siteUrl: string) => {
    setActiveSite(siteUrl);
    setLoading(true);
    setItems([]);
    try {
      const res = await authedFetch("/api/integrations/gsc/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl }),
      });
      const j = await res.json();
      if (j.error) {
        toast({
          title: "Query failed",
          description: String(j.error),
          variant: "destructive",
        });
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Search Console</h1>
        <p className="text-muted-foreground">
          Connect your own Search Console to get{" "}
          <span className="font-semibold text-green-600">measured</span> results
          — real impressions, clicks, and positions, not estimates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Connection
            {connected ? (
              <span className="text-xs rounded-full bg-green-500/15 text-green-600 px-2 py-0.5">
                Connected
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            Read-only access to your verified properties. Your top queries render
            as <strong>measured</strong> data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected === null ? (
            <p className="text-muted-foreground text-sm">Checking connection…</p>
          ) : !connected ? (
            <div className="space-y-2">
              <Button onClick={connect} disabled={loading || !user}>
                {loading ? "Starting…" : "Connect Google Search Console"}
              </Button>
              {!configured && (
                <p className="text-sm text-amber-600">
                  Not configured yet — the project owner must set
                  GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {sites.length === 0 && !loading ? (
                  <p className="text-sm text-muted-foreground">
                    No verified sites found in this Search Console account.
                  </p>
                ) : (
                  sites.map((s) => (
                    <Button
                      key={s.siteUrl}
                      variant={activeSite === s.siteUrl ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadSiteData(s.siteUrl)}
                    >
                      {s.siteUrl}
                    </Button>
                  ))
                )}
              </div>

              {loading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}

              {items.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Top queries for {activeSite} (last 28 days) ·{" "}
                    <span className="text-green-600 font-medium">Measured</span>
                  </p>
                  <ul className="space-y-2">
                    {items.map((it) => (
                      <li
                        key={it.id}
                        className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{it.title}</span>
                          <span className="text-[10px] uppercase tracking-wide rounded bg-green-500/15 text-green-600 px-1.5 py-0.5">
                            measured
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {it.description}
                        </p>
                        {it.recommendation ? (
                          <p className="text-sm mt-1">→ {it.recommendation}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
