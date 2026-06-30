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
import {
  INTEGRATIONS,
  type IntegrationCategory,
  type IntegrationDef,
} from "@/lib/integrations/registry";
import { useCallback, useEffect, useState } from "react";

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  search: "Search",
  payments: "Payments",
  ecommerce: "E-commerce",
  pos: "Point of Sale",
  ads: "Advertising",
  analytics: "Analytics",
  accounting: "Accounting",
  crm: "CRM",
  reviews: "Reviews & Local",
  social: "Social",
};

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Record<string, boolean | null>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken?.();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const native = INTEGRATIONS.filter((i) => i.via === "native" && i.statusUrl);
    const next: Record<string, boolean | null> = {};
    await Promise.all(
      native.map(async (i) => {
        try {
          const r = await fetch(i.statusUrl as string, { headers });
          const j = await r.json();
          next[i.key] = !!j.connected;
        } catch {
          next[i.key] = false;
        }
      })
    );
    setStatus(next);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = Array.from(
    new Set(INTEGRATIONS.map((i) => i.category))
  ) as IntegrationCategory[];

  return (
    <main className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Connections</h1>
        <p className="max-w-2xl text-muted-foreground">
          Connect your accounts to power one command center — total revenue,
          spend, and visibility across every avenue, in{" "}
          <span className="font-semibold text-green-600">measured</span> data.
          More connectors arrive through our unified integration layer.
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[cat] || cat}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((i) => (
              <IntegrationCard key={i.key} def={i} connected={status[i.key]} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function IntegrationCard({
  def,
  connected,
}: {
  def: IntegrationDef;
  connected?: boolean | null;
}) {
  const live = def.via === "native";
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{def.name}</span>
          {!live ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Coming soon
            </span>
          ) : connected ? (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-600">
              Connected
            </span>
          ) : connected === false ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Not connected
            </span>
          ) : null}
        </CardTitle>
        <CardDescription className="text-xs">
          Feeds: {def.contributes.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {live ? (
          <a href={def.manageHref || "#"}>
            <Button size="sm" variant={connected ? "outline" : "default"}>
              {connected ? "Manage" : "Connect"}
            </Button>
          </a>
        ) : (
          <Button size="sm" variant="outline" disabled>
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
