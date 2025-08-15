import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted font-body">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-10 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-2 mb-4 mobile-touch-target">
              <span className="text-primary font-semibold">Oops!</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 font-headline">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">404</span>
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-muted-foreground mb-3 font-body">
              Page not found
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-body">
              The page you’re looking for doesn’t exist or may have moved. Try the homepage or jump into one of our tools below.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-8">
            <Button asChild size="lg" className="w-full mobile-touch-target" aria-label="Go to Homepage" role="button">
              <Link href="/">Go to Homepage</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full mobile-touch-target" aria-label="Try Keyword Tool" role="button">
              <Link href="/keyword-tool">Try Keyword Tool</Link>
            </Button>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p>RankPilot • AI‑First SEO Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}
