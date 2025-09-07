"use client";
export default function PublicError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold">We hit a snag</h2>
        <p className="text-muted-foreground">Please try again in a moment.</p>
        <button
          onClick={() => reset()}
          className="px-3 py-2 rounded bg-primary text-primary-foreground"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
