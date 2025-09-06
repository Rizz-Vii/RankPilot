import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
// Load client components dynamically (client-only) to keep the shared chunk lean and avoid SSR coupling
// Import client components directly – they are client boundaries and will be code-split automatically
import { AuthAwareHero } from "@/components/auth-aware-homepage";
import HomeFeaturesGrid from "@/components/home/HomeFeaturesGrid";

// Force static generation for the public homepage to avoid SSR runtime variability
// Use ISR to refresh at most once per hour, while client islands hydrate as usual
export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour


export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main
        id="main-content"
        className="flex-grow flex flex-col items-center px-4 py-12 text-foreground"
      >
        {/* Hero with language selector */}
        <div className="w-full max-w-6xl flex flex-col items-stretch gap-4">
          {/* Client-only hero loaded lazily to avoid blocking server stream */}
          <AuthAwareHero />
        </div>

        {/* Feature Highlights loaded client-side to avoid framer-motion in shared chunk */}
        <HomeFeaturesGrid />

        {/* Screenshot */}
        <section className="section-gap-sm w-full max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Unified Growth & Visibility Command Center
          </h2>
          <p className="text-muted-foreground mb-6 max-w-3xl mx-auto">
            A single operating layer for audit telemetry, semantic expansion, competitive posture,
            execution velocity and outcome attribution. Remove data silos—align technical, content & strategy.
          </p>
          <Card className="rounded-xl overflow-hidden" aria-label="Product dashboard screenshot">
            <Image
              src="/images/CaptureDash.png"
              alt="RankPilot SEO analytics dashboard showing performance, keyword, and backlink panels"
              data-ai-hint="dashboard computer screen"
              width={1200}
              height={700}
              className="w-full h-full object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
            />
          </Card>
        </section>

        {/* About Us */}
        <section
          id="about"
          className="section-gap w-full max-w-4xl text-center"
        >
          <h2 className="text-3xl font-bold mb-6">What Makes NeuroSEO™ Different</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Integrated Data Fabric</h3>
              <p className="text-muted-foreground">
                Streaming ingestion + adaptive caching unify crawl diagnostics, SERP deltas,
                link graph signals, content semantics and performance telemetry into one ML-normalized layer.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Coordinated AI Engines</h3>
              <p className="text-muted-foreground">
                NeuralCrawler™, SemanticMap™, Visibility Engine, TrustBlock™, RewriteGen™, Forecast Core
                and the Orchestrator collaborate—ranking actions by marginal impact while preserving deterministic audit traceability.
              </p>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section
          className="section-gap-lg max-w-4xl w-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-10 text-primary-foreground text-center shadow-xl hover:shadow-2xl transition-shadow duration-300 micro-hover-lift"
        >
          <h2 className="text-3xl font-bold mb-4">Activate Compounding Organic Growth</h2>
          <p className="text-lg mb-6 opacity-90">
            Teams replace fragmented stacks with RankPilot—faster triage, smarter prioritization,
            tighter feedback loops and measurable revenue impact.
          </p>
          <div className="flex flex-col items-center gap-4">
            <PrimaryCta />
            <ul className="flex flex-wrap justify-center gap-3 text-[11px] font-medium opacity-90" aria-label="Trust badges">
              <li className="px-2 py-1 rounded bg-primary/20">SOC 2 in progress</li>
              <li className="px-2 py-1 rounded bg-primary/20">GDPR-aligned</li>
              <li className="px-2 py-1 rounded bg-primary/20">99.9% Uptime Target</li>
              <li className="px-2 py-1 rounded bg-primary/20">No CC required</li>
            </ul>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section-gap-lg text-center max-w-4xl w-full">
          <h2 className="text-3xl font-bold mb-10">Customer Outcomes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sophie M.",
                company: "Digital Surge",
                text: "Reduced audit cycles 70% and reallocated analyst hours to strategic initiatives within 2 weeks.",
              },
              {
                name: "James T.",
                company: "eCom Growth",
                text: "+40% organic revenue QoQ after implementing opportunity clusters & automated technical fixes.",
              },
              {
                name: "Leila A.",
                company: "SEO Freelance Pro",
                text: "Consolidated 5 legacy tools → single workspace; doubled monthly deliverable throughput.",
              },
            ].map((t, i) => (
              <div key={i}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground italic mb-4">
                      “{t.text}”
                    </p>
                    <p className="text-sm font-semibold">
                      — {t.name}, {t.company}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>
        {/* FAQ */}
        <section id="faq" className="section-gap max-w-3xl w-full text-left">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <FAQ
            question="Do I need a credit card to start?"
            answer="No. Spin up a workspace free—upgrade only when you’re ready to unlock automation & advanced engines."
          />
          <FAQ
            question="What search surfaces are supported?"
            answer="Google core + SERP features today; Bing, AI overviews and additional generative surfaces in active development."
          />
          <FAQ
            question="Can I cancel or downgrade?"
            answer="Yes. Self‑serve downgrade / cancellation at any time—no lock‑in, your data remains exportable."
          />
          <FAQ
            question="How fast can we see impact?"
            answer="Most teams surface high‑impact technical & content fixes inside the first 48 hours and deploy prioritized actions within the first week."
          />
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="section-gap mb-24 text-center max-w-6xl w-full"
        >
          <h2 className="text-3xl font-bold mb-6">Transparent, Value-Aligned Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard title="Starter" price="$19/mo" features={["Technical & Content Audits", "Keyword & Intent Mapping", "Core Dashboards"]} />
            <PricingCard title="Agency" price="$49/mo" features={["All Starter", "Automations & RewriteGen™", "Collaboration & Reporting"]} />
            <PricingCard title="Enterprise" price="Custom" features={["Advanced Data Export", "Dedicated Success Layer", "Security & Compliance Add‑Ons"]} />
          </div>
        </section>
      </main>
    </div>
  );
}

// Primary CTA with lightweight A/B variant (client-side persistence)
function PrimaryCta() {
  // Render static CTA server-side; enhance on client via a tiny script to avoid bundling state code in shared chunk
  return (
    <Button size="lg" variant="secondary" asChild className="micro-hover-lift">
      <Link href="/register" prefetch={false}>Start 7‑Day Free Trial</Link>
    </Button>
  );
}


function PricingCard({
  title,
  price,
  features,
}: {
  title: string;
  price: string;
  features: string[];
}) {
  const planParam = title.toLowerCase();
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-2xl font-semibold">{price}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="text-left space-y-2 text-muted-foreground">
          {features.map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild>
          <Link href={`/pricing?plan=${planParam}`}>Choose Plan</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="mb-6">
      <h4 className="text-lg font-semibold">{question}</h4>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  );
}

// (Structured data moved to src/seo/schema.ts to keep page exports minimal.)
