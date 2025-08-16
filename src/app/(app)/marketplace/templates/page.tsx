import React from 'react';
import FeatureGate from '@/components/feature-gate';

// Marketplace Discovery UI Skeleton (T40 / DQ3)
export default function TemplateMarketplacePage() {
  return (
    <FeatureGate feature="marketplace_templates" requiredTier="enterprise">
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Template Marketplace (Scaffold)</h1>
        <p className="text-sm text-muted-foreground">Static placeholder. Will list published templates with filters (kind, popularity, new).</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => (
            <div key={i} className="border rounded-md p-4 bg-muted/30 h-24 flex items-center justify-center text-xs text-muted-foreground">Template Card Placeholder {i}</div>
          ))}
        </div>
      </div>
    </FeatureGate>
  );
}
