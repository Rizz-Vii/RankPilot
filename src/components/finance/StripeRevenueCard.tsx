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
import { useCallback, useEffect, useState } from "react";

interface Snapshot {
  mrr: number;
  arr: number;
  activeCustomers: number;
  arpu: number;
  churnRatePct: number;
  ltv: number | null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

/**
 * Per-user Stripe Connect: lets the signed-in user connect THEIR OWN Stripe and shows THEIR real
 * MRR/ARR (provenance 'measured'). Additive — leaves the rest of the demo dashboard untouched.
 */
export default function StripeRevenueCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
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

  useEffect(() => {
    const status =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("stripe")
        : null;
    if (!status) return;
    const map: Record<string, { title: string; variant?: "destructive" }> = {
      connected: { title: "Stripe connected" },
      denied: { title: "Connection cancelled", variant: "destructive" },
      expired: {
        title: "Connection expired — please retry",
        variant: "destructive",
      },
      error: { title: "Connection failed — please retry", variant: "destructive" },
    };
    if (map[status]) {
      toast({ title: map[status].title, variant: map[status].variant });
    }
  }, [toast]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch("/api/integrations/stripe/data");
      const j = await res.json();
      setConnected(!!j.connected);
      if (j.connected) {
        const r2 = await authedFetch("/api/integrations/stripe/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const j2 = await r2.json();
        if (j2.snapshot) setSnapshot(j2.snapshot as Snapshot);
      }
    } catch {
      setConnected(false);
    }
  }, [user, authedFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const connect = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/integrations/stripe/start");
      if (res.status === 503) {
        setConfigured(false);
        toast({
          title: "Not configured yet",
          description: "The owner must enable Stripe Connect first.",
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

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Real revenue (Stripe)
          {connected ? (
            <span className="text-xs rounded-full bg-green-500/15 text-green-600 px-2 py-0.5">
              Connected · Measured
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          Connect your own Stripe account to replace the demo numbers with your
          real MRR.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected === null ? (
          <p className="text-sm text-muted-foreground">Checking…</p>
        ) : !connected ? (
          <div className="space-y-2">
            <Button onClick={connect} disabled={loading || !user}>
              {loading ? "Starting…" : "Connect Stripe"}
            </Button>
            {!configured && (
              <p className="text-sm text-amber-600">
                Not configured yet — the owner must enable Stripe Connect
                (STRIPE_CONNECT_CLIENT_ID).
              </p>
            )}
          </div>
        ) : snapshot ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="MRR" value={money(snapshot.mrr)} />
            <Metric label="ARR" value={money(snapshot.arr)} />
            <Metric
              label="Active customers"
              value={String(snapshot.activeCustomers)}
            />
            <Metric label="ARPU" value={money(snapshot.arpu)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading your revenue…</p>
        )}
      </CardContent>
    </Card>
  );
}
