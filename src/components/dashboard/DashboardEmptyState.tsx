"use client";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Friendly empty-state for the business dashboards when a real user has no data yet (demo off).
 * Replaces blank charts with a clear "what to do next" message + optional connect CTA.
 */
export default function DashboardEmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { label: string; href: string };
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-base font-semibold">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        {cta ? (
          <a
            href={cta.href}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {cta.label}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
