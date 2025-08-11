"use client";
import React from 'react';
import EnhancedErrorBoundary from '@/components/ui/enhanced-error-boundary';

// Next.js will render this on errors in the root segment.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  return (
    <EnhancedErrorBoundary fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center gap-6">
        <div>
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground mt-2 max-w-md">An unexpected error occurred. You can try again or return to the dashboard. Error digest: {error.digest || 'n/a'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => reset()} className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium">Try Again</button>
          <a href="/" className="px-4 py-2 rounded border text-sm font-medium">Home</a>
        </div>
      </div>
    } showDetails>
      {/* If boundary recovers, we show nothing special here */}
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Recovered from error.</p>
      </div>
    </EnhancedErrorBoundary>
  );
}
