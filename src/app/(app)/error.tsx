"use client";
import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="h-full w-full grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold">App encountered an error</h2>
        <p className="text-muted-foreground">
          Your session is safe. Try again or return to dashboard.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="px-3 py-2 rounded bg-primary text-primary-foreground"
          >
            Retry
          </button>
          <Link href="/dashboard" className="px-3 py-2 rounded border">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
