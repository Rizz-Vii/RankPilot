import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Broken Link Analysis Guide | RankPilot",
  description:
    "Learn how to find, analyze, and fix broken links to improve your SEO performance.",
};

export default function BrokenLinksGuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/guides"
        className="inline-flex items-center text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Guides
      </Link>

      <h1 className="text-4xl font-bold mb-4">Broken Link Analysis Guide</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Master the art of finding and fixing broken links to boost your SEO
        performance.
      </p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-warning-foreground" />
            Why Broken Links Matter
          </h2>
          <p>
            Broken links can seriously damage your SEO efforts and user
            experience. They:
          </p>
          <ul className="list-disc pl-6">
            <li>Create poor user experience and increase bounce rates</li>
            <li>Waste crawl budget and confuse search engines</li>
            <li>Reduce page authority and link equity flow</li>
            <li>Signal to Google that your site may be poorly maintained</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Types of Broken Links</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Internal Broken Links</h3>
              <p className="text-sm text-muted-foreground">
                Links pointing to pages within your own website that no longer
                exist.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">External Broken Links</h3>
              <p className="text-sm text-muted-foreground">
                Links pointing to external websites that return 404 or other
                error codes.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Using RankPilot for Broken Link Analysis
          </h2>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-2 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-primary" />
              Step-by-Step Process
            </h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Navigate to the{" "}
                <Link
                  href="/link-view"
                  className="text-primary hover:underline"
                >
                  Link Analysis
                </Link>{" "}
                page
              </li>
              <li>Enter your website URL</li>
              <li>Click "Analyze Links" to start the scan</li>
              <li>Review the broken links report</li>
              <li>Export results for your development team</li>
            </ol>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            How to Fix Broken Links
          </h2>

          <h3 className="text-xl font-medium mb-3">For Internal Links:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Redirect:</strong> Set up 301 redirects to the most
              relevant existing page
            </li>
            <li>
              <strong>Update:</strong> Change the link to point to the correct
              URL
            </li>
            <li>
              <strong>Remove:</strong> Delete the link if it's no longer
              relevant
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">For External Links:</h3>
          <ul className="list-disc pl-6">
            <li>
              <strong>Find Alternative:</strong> Look for updated URLs or
              similar resources
            </li>
            <li>
              <strong>Archive Check:</strong> Use Wayback Machine to find
              archived versions
            </li>
            <li>
              <strong>Remove or Replace:</strong> Update with current, relevant
              resources
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-success-foreground">✅ Do</h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Monitor links regularly</li>
                <li>Set up automated monitoring</li>
                <li>Fix high-priority pages first</li>
                <li>Document your fixes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-destructive-foreground">❌ Don't</h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Ignore broken links for months</li>
                <li>Remove all external links</li>
                <li>Use temporary redirects (302)</li>
                <li>Link to unreliable sources</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
            <p className="mb-4">
              Ready to find and fix broken links on your website? Use
              RankPilot's powerful link analysis tool to get started.
            </p>
            <Link
              href="/link-view"
              className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Start Link Analysis
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
