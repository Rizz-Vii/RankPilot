import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "XML Sitemap Guide | RankPilot",
  description:
    "Learn how to create, optimize, and submit XML sitemaps for better search engine indexing.",
};

export default function XMLSitemapGuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/guides"
        className="inline-flex items-center text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Guides
      </Link>

      <h1 className="text-4xl font-bold mb-4">XML Sitemap Guide</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Master XML sitemaps to help search engines discover and index your
        content efficiently.
      </p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Globe className="w-6 h-6 mr-2 text-primary" />
            What is an XML Sitemap?
          </h2>
          <p>
            An XML sitemap is a file that lists all important pages on your
            website, helping search engines understand your site structure and
            find content more efficiently.
          </p>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 my-4">
            <p className="font-medium">
              Think of it as a roadmap for search engines!
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Benefits of XML Sitemaps
          </h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Faster Discovery:</strong> Help search engines find new
              content quickly
            </li>
            <li>
              <strong>Better Indexing:</strong> Ensure important pages get
              crawled
            </li>
            <li>
              <strong>SEO Insights:</strong> Track indexation status in Search
              Console
            </li>
            <li>
              <strong>Large Site Support:</strong> Essential for sites with 500+
              pages
            </li>
            <li>
              <strong>Content Updates:</strong> Signal when pages were last
              modified
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">XML Sitemap Structure</h2>
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
            <pre className="text-sm overflow-x-auto">
              {`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`}
            </pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>

          <h3 className="text-xl font-medium mb-3">What to Include:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Important pages (home, main categories, key content)</li>
            <li>Recently updated or new content</li>
            <li>Pages you want search engines to prioritize</li>
            <li>Canonical URLs only (avoid duplicates)</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">What to Exclude:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Pages with noindex tags</li>
            <li>Duplicate or thin content pages</li>
            <li>Admin, login, or private pages</li>
            <li>Pages that redirect to other URLs</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Priority and Change Frequency
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Priority Guidelines</h3>
              <ul className="text-sm space-y-1">
                <li>
                  <strong>1.0:</strong> Homepage
                </li>
                <li>
                  <strong>0.8:</strong> Main category pages
                </li>
                <li>
                  <strong>0.6:</strong> Important content pages
                </li>
                <li>
                  <strong>0.4:</strong> Regular blog posts
                </li>
                <li>
                  <strong>0.2:</strong> Archive pages
                </li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Change Frequency</h3>
              <ul className="text-sm space-y-1">
                <li>
                  <strong>Daily:</strong> News sites, blogs
                </li>
                <li>
                  <strong>Weekly:</strong> Product pages
                </li>
                <li>
                  <strong>Monthly:</strong> Service pages
                </li>
                <li>
                  <strong>Yearly:</strong> About, contact pages
                </li>
                <li>
                  <strong>Never:</strong> Archived content
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Submitting Your Sitemap
          </h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              <strong>Google Search Console:</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Add your sitemap URL in the Sitemaps section
              </p>
            </li>
            <li>
              <strong>Bing Webmaster Tools:</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Submit through the Sitemaps feature
              </p>
            </li>
            <li>
              <strong>Robots.txt:</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Add "Sitemap: https://yoursite.com/sitemap.xml"
              </p>
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Common Mistakes to Avoid
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-destructive-foreground">
                ❌ Common Errors
              </h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Including 404 or redirected pages</li>
                <li>Listing non-canonical URLs</li>
                <li>Forgetting to update lastmod dates</li>
                <li>Including blocked or noindex pages</li>
                <li>Exceeding 50,000 URLs per sitemap</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-success-foreground">
                ✅ Best Practices
              </h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Keep sitemaps under 10MB</li>
                <li>Use sitemap index for large sites</li>
                <li>Update regularly and automatically</li>
                <li>Monitor in Search Console</li>
                <li>Use absolute URLs only</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Analyze Your Site Structure
          </h2>
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
            <p className="mb-4">
              Use RankPilot's analysis tools to understand your site structure
              and identify pages that should be included in your XML sitemap.
            </p>
            <Link
              href="/content-analyzer"
              className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Analyze Site Structure
              <Search className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
