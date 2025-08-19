import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Learn SEO Guide | RankPilot",
  description:
    "Comprehensive guide to learning SEO fundamentals and advanced techniques.",
};

export default function LearnSEOGuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/guides"
        className="inline-flex items-center text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Guides
      </Link>

      <h1 className="text-4xl font-bold mb-4">Learn SEO: Complete Guide</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Master search engine optimization from basics to advanced strategies.
      </p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-accent" />
            SEO Fundamentals
          </h2>
          <p>
            Search Engine Optimization (SEO) is the practice of optimizing your
            website to increase its visibility in search engine results pages
            (SERPs).
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">
            The Three Pillars of SEO:
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Technical SEO</h4>
              <p className="text-sm text-muted-foreground">
                Site speed, mobile-friendliness, crawlability, and indexability.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">On-Page SEO</h4>
              <p className="text-sm text-muted-foreground">
                Content optimization, keywords, meta tags, and internal linking.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Off-Page SEO</h4>
              <p className="text-sm text-muted-foreground">
                Backlinks, domain authority, and external signals.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Learning Path</h2>

          <div className="space-y-6">
            <div className="border-l-4 border-success pl-6">
              <h3 className="text-xl font-semibold mb-2">
                Beginner (0-3 months)
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Understand how search engines work</li>
                <li>Learn keyword research basics</li>
                <li>Master on-page optimization</li>
                <li>Set up Google Analytics & Search Console</li>
                <li>Create SEO-friendly content</li>
              </ul>
            </div>

            <div className="border-l-4 border-warning pl-6">
              <h3 className="text-xl font-semibold mb-2">
                Intermediate (3-6 months)
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Technical SEO audits</li>
                <li>Link building strategies</li>
                <li>Local SEO optimization</li>
                <li>Advanced keyword research</li>
                <li>Competitor analysis</li>
              </ul>
            </div>

            <div className="border-l-4 border-destructive pl-6">
              <h3 className="text-xl font-semibold mb-2">
                Advanced (6+ months)
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Enterprise SEO strategies</li>
                <li>International SEO</li>
                <li>Advanced analytics and attribution</li>
                <li>SEO automation and tools</li>
                <li>Algorithm updates and recovery</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Essential SEO Concepts
          </h2>

          <h3 className="text-xl font-medium mb-3">Keyword Research</h3>
          <p className="mb-4">
            Understanding what your audience searches for is the foundation of
            SEO.
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li>
              <strong>Search Intent:</strong> Informational, navigational,
              transactional, commercial
            </li>
            <li>
              <strong>Keyword Types:</strong> Head terms, long-tail, semantic
              keywords
            </li>
            <li>
              <strong>Metrics:</strong> Search volume, difficulty,
              cost-per-click
            </li>
            <li>
              <strong>Tools:</strong> Google Keyword Planner, Ahrefs, SEMrush
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Content Optimization</h3>
          <ul className="list-disc pl-6 mb-6">
            <li>
              <strong>Title Tags:</strong> Include primary keyword, keep under
              60 characters
            </li>
            <li>
              <strong>Meta Descriptions:</strong> Compelling summaries under 160
              characters
            </li>
            <li>
              <strong>Header Tags:</strong> Logical structure with H1, H2, H3
              hierarchy
            </li>
            <li>
              <strong>Content Quality:</strong> Comprehensive, original,
              user-focused
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Technical SEO</h3>
          <ul className="list-disc pl-6 mb-6">
            <li>
              <strong>Site Speed:</strong> Optimize images, minify code, use CDN
            </li>
            <li>
              <strong>Mobile-First:</strong> Responsive design and mobile
              usability
            </li>
            <li>
              <strong>Crawlability:</strong> XML sitemaps, robots.txt, internal
              linking
            </li>
            <li>
              <strong>HTTPS:</strong> Secure connections and SSL certificates
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Common SEO Mistakes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-destructive-foreground">
                ❌ Avoid These
              </h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Keyword stuffing</li>
                <li>Buying low-quality backlinks</li>
                <li>Ignoring mobile optimization</li>
                <li>Duplicate content issues</li>
                <li>Slow page load speeds</li>
                <li>Missing meta descriptions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-success-foreground">✅ Focus On</h3>
              <ul className="list-disc pl-6 text-sm">
                <li>User experience and intent</li>
                <li>High-quality, helpful content</li>
                <li>Natural link building</li>
                <li>Technical performance</li>
                <li>Regular content updates</li>
                <li>Data-driven decisions</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            SEO Tools and Resources
          </h2>

          <h3 className="text-xl font-medium mb-3">Free Tools:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Google Search Console:</strong> Monitor search performance
            </li>
            <li>
              <strong>Google Analytics:</strong> Track website traffic and
              behavior
            </li>
            <li>
              <strong>Google PageSpeed Insights:</strong> Analyze site speed
            </li>
            <li>
              <strong>Google Keyword Planner:</strong> Basic keyword research
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Premium Tools:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Ahrefs:</strong> Comprehensive SEO toolkit
            </li>
            <li>
              <strong>SEMrush:</strong> Competitive analysis and research
            </li>
            <li>
              <strong>Moz Pro:</strong> SEO software suite
            </li>
            <li>
              <strong>Screaming Frog:</strong> Technical SEO auditing
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Measuring SEO Success</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                Key Metrics
              </h3>
              <ul className="text-sm list-disc pl-4">
                <li>Organic traffic growth</li>
                <li>Keyword ranking positions</li>
                <li>Click-through rates (CTR)</li>
                <li>Conversion rates from organic</li>
                <li>Page load speed</li>
                <li>Core Web Vitals</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Reporting Tools</h3>
              <ul className="text-sm list-disc pl-4">
                <li>Google Analytics 4</li>
                <li>Google Search Console</li>
                <li>Data Studio dashboards</li>
                <li>Rank tracking tools</li>
                <li>SEO audit reports</li>
                <li>Custom tracking setups</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Start Your SEO Journey
          </h2>
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6">
            <p className="mb-4">
              Ready to put your SEO knowledge into practice? Use RankPilot's
              comprehensive analysis tools to audit your website and identify
              optimization opportunities.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/content-analyzer"
                className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Analyze Your Content
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/competitors"
                className="inline-flex items-center bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
              >
                Study Competitors
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
