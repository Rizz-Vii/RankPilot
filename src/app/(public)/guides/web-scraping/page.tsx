import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Code, Database } from "lucide-react";

export const metadata: Metadata = {
  title: "Web Scraping for SEO Guide | RankPilot",
  description:
    "Learn how to use web scraping techniques for competitive SEO analysis and research.",
};

export default function WebScrapingGuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/guides"
        className="inline-flex items-center text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Guides
      </Link>

      <h1 className="text-4xl font-bold mb-4">Web Scraping for SEO Guide</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Discover how to ethically gather competitive intelligence and SEO data
        through web scraping.
      </p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Database className="w-6 h-6 mr-2 text-green-500" />
            What is Web Scraping for SEO?
          </h2>
          <p>
            Web scraping for SEO involves programmatically extracting data from
            websites to analyze competitors, track rankings, monitor content
            changes, and gather market intelligence.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="font-medium text-amber-800">
              ⚠️ Always respect robots.txt files and website terms of service!
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            SEO Use Cases for Web Scraping
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Competitor Analysis</h3>
              <ul className="text-sm list-disc pl-4">
                <li>Meta tags and descriptions</li>
                <li>Content structure and keywords</li>
                <li>Internal linking patterns</li>
                <li>Page load speeds and performance</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Content Research</h3>
              <ul className="text-sm list-disc pl-4">
                <li>Popular content topics</li>
                <li>Content gaps in your niche</li>
                <li>Trending keywords and phrases</li>
                <li>Content length and format analysis</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Technical SEO</h3>
              <ul className="text-sm list-disc pl-4">
                <li>Schema markup usage</li>
                <li>Site structure analysis</li>
                <li>Broken link detection</li>
                <li>Image optimization tracking</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">SERP Monitoring</h3>
              <ul className="text-sm list-disc pl-4">
                <li>Ranking position tracking</li>
                <li>Featured snippet analysis</li>
                <li>Local search results</li>
                <li>SERP feature monitoring</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Popular Tools and Technologies
          </h2>

          <h3 className="text-xl font-medium mb-3">Programming Languages:</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Python:</strong> BeautifulSoup, Scrapy, Requests
            </li>
            <li>
              <strong>JavaScript:</strong> Puppeteer, Playwright, Cheerio
            </li>
            <li>
              <strong>R:</strong> rvest, xml2 packages
            </li>
            <li>
              <strong>PHP:</strong> Simple HTML DOM Parser, Goutte
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">No-Code Solutions:</h3>
          <ul className="list-disc pl-6">
            <li>
              <strong>Octoparse:</strong> Visual web scraping tool
            </li>
            <li>
              <strong>ParseHub:</strong> Machine learning-powered scraper
            </li>
            <li>
              <strong>WebHarvy:</strong> Point-and-click scraping
            </li>
            <li>
              <strong>Import.io:</strong> Data extraction platform
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Ethical Scraping Guidelines
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-green-600">
                ✅ Best Practices
              </h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Check and respect robots.txt</li>
                <li>Read terms of service carefully</li>
                <li>Use reasonable request delays</li>
                <li>Identify your bot in User-Agent</li>
                <li>Don't overload servers</li>
                <li>Cache data to minimize requests</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-red-600">❌ Avoid</h3>
              <ul className="list-disc pl-6 text-sm">
                <li>Ignoring robots.txt rules</li>
                <li>Making too many concurrent requests</li>
                <li>Scraping personal or private data</li>
                <li>Republishing copyrighted content</li>
                <li>Using scraped data for spam</li>
                <li>Circumventing anti-bot measures</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Getting Started with Python
          </h2>
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Code className="w-5 h-5 mr-2" />
              Basic Python Example
            </h3>
            <pre className="text-sm overflow-x-auto">
              {`import requests
from bs4 import BeautifulSoup
import time

def scrape_title_and_meta(url):
    # Add delay to be respectful
    time.sleep(1)
    
    headers = {
        'User-Agent': 'SEO-Bot/1.0 (Educational Purpose)'
    }
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.find('title').text.strip()
        description = soup.find('meta', attrs={'name': 'description'})
        
        return {
            'title': title,
            'description': description['content'] if description else None
        }
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

# Usage
data = scrape_title_and_meta('https://example.com')
print(_data)`}
            </pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibent mb-4">
            Handling Dynamic Content
          </h2>
          <p>
            Many modern websites use JavaScript to load content dynamically. For
            these sites, you'll need browser automation tools:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Puppeteer (Node.js):</strong> Controls headless Chrome
            </li>
            <li>
              <strong>Playwright:</strong> Cross-browser automation
            </li>
            <li>
              <strong>Selenium:</strong> Web driver for multiple browsers
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Legal Considerations</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Important Legal Points:</h3>
            <ul className="list-disc pl-6 text-sm">
              <li>Web scraping exists in a legal gray area</li>
              <li>Public data is generally okay to scrape</li>
              <li>Always respect copyright and terms of service</li>
              <li>Consider reaching out for API access instead</li>
              <li>Consult legal counsel for commercial use</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Automated SEO Analysis
          </h2>
          <div className="bg-gradient-to-r from-primary/10 to-blue-50 border border-primary/20 rounded-lg p-6">
            <p className="mb-4">
              Skip the complexity of building your own scrapers. RankPilot
              provides ethical, automated SEO analysis with built-in competitive
              intelligence.
            </p>
            <Link
              href="/competitors"
              className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Competitor Analysis
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
