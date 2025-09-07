import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="h-full w-full grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold">We couldn’t find that</h2>
        <p className="text-muted-foreground">
          The resource may have moved or you may not have access.
        </p>
        <Link href="/dashboard" className="px-3 py-2 rounded border">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
