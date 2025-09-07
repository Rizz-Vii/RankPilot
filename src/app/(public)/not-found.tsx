import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="min-h-[50vh] grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground">
          The page you requested doesn’t exist.
        </p>
        <Link href="/" className="px-3 py-2 rounded border">
          Go home
        </Link>
      </div>
    </div>
  );
}
