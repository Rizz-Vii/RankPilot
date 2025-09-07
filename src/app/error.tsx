"use client";
import EnhancedErrorBoundary from "@/components/ui/enhanced-error-boundary";
import Link from "next/link";

// Next.js will render this on errors in the root segment.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center gap-6 font-body">
          <div>
            <h1 className="text-3xl font-bold font-headline">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md font-body">
              An unexpected error occurred. You can try again or return to the
              dashboard. Error digest: {error.digest || "n/a"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium mobile-touch-target"
              aria-label="Try Again"
              role="button"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded border text-sm font-medium mobile-touch-target"
              aria-label="Home"
              role="link"
            >
              Home
            </Link>
          </div>
        </div>
      }
      showDetails
    >
      {/* If boundary recovers, we show nothing special here */}
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Recovered from error.</p>
      </div>
    </EnhancedErrorBoundary>
  );
}
