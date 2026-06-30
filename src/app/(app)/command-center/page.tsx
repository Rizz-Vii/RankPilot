"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import type { BusinessHealth } from "@/lib/integrations/registry";
import { useCallback, useEffect, useState } from "react";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Command Center — one view of the whole business: revenue, profit, and traffic across every
 * connected avenue, rolled up from the normalized BusinessHealth engine.
 */
export default function CommandCenterPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<BusinessHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken?.();
      const r = await fetch("/api/business-health", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setHealth((await r.json()) as BusinessHealth);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const hasData = !!health && health.channels.length > 0;

  return (
    <main className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Command Center</h1>
        <p className="max-w-2xl text-muted-foreground">
          Your whole business in one view — revenue, profit, and traffic across
          every connected avenue, in{" "}
          <span className="font-semibold text-green-600">measured</span> data.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="font-semibold">No connected avenues yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Connect your accounts (Search Console, Stripe, and more) to see
              your total revenue, profit, and traffic in one place.
            </p>
            <a
              href="/integrations/connections"
              className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Connect data sources
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Revenue (28d)" value={money(health!.totals.revenue)} />
            <Metric label="Cost" value={money(health!.totals.cost)} />
            <Metric label="Profit" value={money(health!.totals.profit)} />
            <Metric
              label="Sessions"
              value={health!.totals.sessions.toLocaleString()}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                By avenue ·{" "}
                <span className="text-green-600">{health!.provenance}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {health!.channels.map((c, i) => (
                  <li
                    key={`${c.channel}-${i}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{c.channel}</span>
                    <span className="text-muted-foreground">
                      {c.revenue != null
                        ? money(c.revenue)
                        : c.sessions != null
                          ? `${c.sessions.toLocaleString()} sessions`
                          : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
