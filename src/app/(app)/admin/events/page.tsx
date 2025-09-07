// Ensure this route is not statically prerendered during export
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { FeatureGate } from "@/components/subscription/FeatureGate";

// Admin Event Explorer scaffold (T29 / DQ1)
// Displays system events once Event Backbone implemented.
export default function EventExplorerPage() {
  return (
    <FeatureGate feature="observability" adminOnly>
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Event Explorer (Scaffold)</h1>
        <p className="text-sm text-muted-foreground">
          This admin-only page will list recent canonical events (type, source,
          ts). Future: filters, CSV export.
        </p>
        <div className="border rounded-md p-4 bg-muted/30 text-sm">
          Event list placeholder – implement after Event Backbone (T26–T30).
        </div>
      </div>
    </FeatureGate>
  );
}
