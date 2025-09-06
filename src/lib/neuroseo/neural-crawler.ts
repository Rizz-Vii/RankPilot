/**
 * NeuralCrawler™ - Intelligent web content extraction and analysis
 * Part of the NeuroSEO™ Suite for RankPilot
 */

import type { Browser, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import * as urlMod from "url";
import type { CrawlerTask } from './types';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    canonical?: string;
  };
  technicalData: {
    loadTime: number;
    pageSize: number;
    headings: { [key: string]: string[] };
    images: Array<{ src: string; alt: string; title?: string }>;
    links: Array<{ href: string; text: string; isExternal: boolean }>;
    schema: unknown[];
    wordCount: number;
    titleLength: number;
    metaDescriptionLength: number;
    canonicalMismatch: boolean;
  };
  authorshipSignals: {
    hasAuthorBio: boolean;
    hasContactInfo: boolean;
    hasAboutPage: boolean;
    socialLinks: string[];
    expertiseSignals: string[];
  };
  semanticClassification: {
    contentType: string;
    topicCategories: string[];
    keyEntities: string[];
    readingLevel: number;
    contentDepth: "surface" | "moderate" | "comprehensive";
  };
  /**
   * Lightweight derived SEO metrics (Phase 0 heuristic) – populated client-side to avoid casts.
   * Replaced prior (result as unknown).seoMetrics usages.
   */
  seoMetrics?: {
    overallScore: number; // 0-100 composite
    technicalScore: number; // 0-100
    contentScore: number; // 0-100
  };
  /** Basic performance rollup (heuristic) */
  performance?: {
    overallScore: number; // 0-100 performance health
  };
  robotsAllowed?: boolean;
  fromCache?: boolean;
  /**
   * Crawler-level provenance to support explainability and public knowledge docs.
   * Minimal and privacy-safe: link texts/URLs, first heading, and sample missing-alt images.
   */
  provenance?: {
    firstH1?: string;
    externalAnchors: Array<{ href: string; text: string }>;
    missingAltSamples: string[];
  };
}

// Local diagnostics and error stats (in-module only)
const crawlerDiagnostics: { urlLib?: boolean } = {};
const crawlerErrorStats: { count: number; lastMessage: string | null } = {
  count: 0,
  lastMessage: null,
};

// Verify URL library presence for environment diagnostics
crawlerDiagnostics.urlLib = !!urlMod;

export interface CrawlOptions {
  includeImages?: boolean;
  followRedirects?: boolean;
  timeout?: number;
  userAgent?: string;
  extractSchema?: boolean;
  analyzeAuthorship?: boolean;
  respectRobots?: boolean;
  cacheTtlMs?: number;
}

export class NeuralCrawler {
  private browser: Browser | null = null;
  private cache: Map<string, { timestamp: number; result: CrawlResult; ttl: number; }> = new Map();
  // made public (was private) so prototype augmentation / interface merge can reference it safely
  public robotsCache: Map<string, { fetched: number; rules: RobotsRules; }> = new Map();
  private static DEFAULT_CACHE_TTL = 10 * 60 * 1000; // 10 min
  static ROBOTS_TTL = 60 * 60 * 1000; // 1 hour (public for helper access)
  // Lightweight task queue for background crawling
  private queue: Array<{ task: CrawlerTask; resolve: (r: CrawlResult) => void; reject: (e: unknown) => void }> = [];
  private active = 0;
  private readonly maxConcurrent = 2;
  private queuedUrls = new Set<string>();

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
  }

  async crawl(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    await this.initialize();

    // Cache lookup
    const ttl = options.cacheTtlMs ?? NeuralCrawler.DEFAULT_CACHE_TTL;
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return { ...cached.result, fromCache: true };
    }

    // Robots.txt compliance
    if (options.respectRobots !== false) {
      try {
        const allowed = await this.isAllowedByRobots(url, options.userAgent || 'RankPilot-NeuralCrawler/1.0');
        if (!allowed) {
          const placeholder: CrawlResult = {
            url,
            title: 'Robots Disallowed',
            content: '',
            metadata: {},
            technicalData: {
              loadTime: 0, pageSize: 0, headings: {}, images: [], links: [], schema: [],
              wordCount: 0, titleLength: 0, metaDescriptionLength: 0, canonicalMismatch: false
            },
            authorshipSignals: this.getDefaultAuthorshipSignals(),
            semanticClassification: { contentType: 'unknown', topicCategories: [], keyEntities: [], readingLevel: 0, contentDepth: 'surface' },
            robotsAllowed: false,
            fromCache: false
          };
          this.cache.set(url, { timestamp: Date.now(), result: placeholder, ttl });
          return placeholder;
        }
      } catch (e) {
        // Silent degradation; track error stats locally
        const msg = typeof e === "object" && e && "message" in (e as Record<string, unknown>) && typeof (e as { message?: unknown }).message === "string"
          ? (e as { message: string }).message
          : String(e);
        crawlerErrorStats.count++;
        crawlerErrorStats.lastMessage = msg;
      }
    }

    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      // Configure page
      await page.setExtraHTTPHeaders({
        "User-Agent": options.userAgent || "RankPilot-NeuralCrawler/1.0",
      });

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: options.timeout || 30000,
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status()}`);
      }

      const loadTime = Date.now() - startTime;

      // Extract basic content
      const title = await page.title();
      const content = (await page.textContent("body")) || "";

      // Extract metadata
      const metadata = await this.extractMetadata(page);

      // Extract technical data
      const technicalData = await this.extractTechnicalData(page, loadTime);

      // Extract authorship signals
      const authorshipSignals = options.analyzeAuthorship
        ? await this.extractAuthorshipSignals(page)
        : this.getDefaultAuthorshipSignals();

      // Perform semantic classification
      const semanticClassification = await this.performSemanticClassification(
        content,
        title
      );

      const result: CrawlResult = {
        url,
        title,
        content,
        metadata,
        technicalData,
        authorshipSignals,
        semanticClassification,
        seoMetrics: deriveSeoMetrics(technicalData, content, headingsWordCount(content)),
        performance: derivePerformanceMetrics(technicalData),
        robotsAllowed: true,
        fromCache: false,
        provenance: {
          firstH1: Array.isArray(technicalData.headings?.h1) && technicalData.headings.h1.length > 0
            ? technicalData.headings.h1[0]
            : undefined,
          externalAnchors: (technicalData.links || [])
            .filter((l: { href: string; text: string; isExternal: boolean }) => l.isExternal && /^https?:\/\//.test(l.href))
            .slice(0, 12)
            .map((l: { href: string; text: string }) => ({ href: l.href, text: l.text })),
          missingAltSamples: (technicalData.images || [])
            .filter((img: { src: string; alt: string }) => !img.alt || img.alt.trim().length === 0)
            .slice(0, 5)
            .map((img: { src: string }) => img.src),
        }
      };
      this.cache.set(url, { timestamp: Date.now(), result, ttl });
      return result;
    } finally {
      await page.close();
    }
  }

  private async extractMetadata(page: Page) {
    return await page.evaluate(() => {
      const getMetaContent = (name: string) => {
        const meta = document.querySelector(
          `meta[name="${name}"], meta[property="${name}"]`
        );
        return meta?.getAttribute("content") || undefined;
      };

      return {
        description: getMetaContent("description"),
        keywords: getMetaContent("keywords"),
        author: getMetaContent("author"),
        publishedTime:
          getMetaContent("article:published_time") ||
          getMetaContent("og:article:published_time"),
        modifiedTime:
          getMetaContent("article:modified_time") ||
          getMetaContent("og:article:modified_time"),
        canonical:
          document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href") || undefined,
      };
    });
  }

  private async extractTechnicalData(page: Page, loadTime: number) {
    const pageSize = await page.evaluate(() => {
      return new Blob([document.documentElement.outerHTML]).size;
    });

    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll(
        "h1, h2, h3, h4, h5, h6"
      );
      const headings: { [key: string]: string[] } = {};

      headingElements.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (!headings[tag]) headings[tag] = [];
        headings[tag].push(el.textContent?.trim() || "");
      });

      return headings;
    });

    const images = await page.evaluate(() => {
      const imgElements = document.querySelectorAll("img");
      return Array.from(imgElements).map((img) => ({
        src: img.src,
        alt: img.alt || "",
        title: img.title || undefined,
      }));
    });

    const links = await page.evaluate(() => {
      const linkElements = document.querySelectorAll("a[href]");
      return Array.from(linkElements).map((link) => ({
        href: link.getAttribute("href") || "",
        text: link.textContent?.trim() || "",
        isExternal:
          (link.getAttribute("href")?.startsWith("http") &&
            !link.getAttribute("href")?.includes(window.location.hostname)) ||
          false,
      }));
    });

    const schema = await page.evaluate(() => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      const schemaData: unknown[] = [];

      scripts.forEach((script) => {
        try {
          const data = JSON.parse(script.textContent || "");
          schemaData.push(data);
        } catch (e) {
          // Ignore invalid JSON; record local error count (narrow unknown safely)
          const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
            ? (e as { message: string }).message
            : String(e);
          (window as unknown as { __crawlerErrorStats?: { count: number; lastMessage: string | null } }).__crawlerErrorStats =
            (window as unknown as { __crawlerErrorStats?: { count: number; lastMessage: string | null } }).__crawlerErrorStats || { count: 0, lastMessage: null };
          (window as unknown as { __crawlerErrorStats: { count: number; lastMessage: string | null } }).__crawlerErrorStats.count++;
          (window as unknown as { __crawlerErrorStats: { count: number; lastMessage: string | null } }).__crawlerErrorStats.lastMessage = msg;
        }
      });

      return schemaData;
    });

    const wordCount = await page.evaluate(() => (document.body.innerText || '').split(/\s+/).filter(Boolean).length);
    const titleLength = (await page.title())?.length || 0;
    const metaDescriptionLength = (metadata => (metadata || '').length)(await page.evaluate(() => document.querySelector('meta[name="description"]')?.getAttribute('content') || ''));
    const canonicalUrl = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '');
    let canonicalMismatch = false;
    try {
      if (canonicalUrl) {
        const parsedOriginal = new URL(page.url());
        const parsedCanonical = new URL(canonicalUrl, page.url());
        canonicalMismatch = parsedOriginal.hostname !== parsedCanonical.hostname;
      }
    } catch { /* ignore */ }
    return {
      loadTime,
      pageSize,
      headings,
      images,
      links,
      schema,
      wordCount,
      titleLength,
      metaDescriptionLength,
      canonicalMismatch,
    };
  }

  private async extractAuthorshipSignals(page: Page) {
    return await page.evaluate(() => {
      // Check for author bio
      const authorBio = document.querySelector(
        '.author-bio, .author-info, [class*="author"]'
      );
      const hasAuthorBio = !!authorBio;

      // Check for contact information
      const contactInfo = document.querySelector(
        '[href^="mailto:"], [href^="tel:"], .contact'
      );
      const hasContactInfo = !!contactInfo;

      // Check for about page link
      const aboutLink = document.querySelector(
        'a[href*="about"], a[href*="team"]'
      );
      const hasAboutPage = !!aboutLink;

      // Extract social links
      const socialSelectors = [
        'a[href*="twitter.com"]',
        'a[href*="linkedin.com"]',
        'a[href*="facebook.com"]',
        'a[href*="instagram.com"]',
        'a[href*="youtube.com"]',
      ];
      const socialLinks = socialSelectors
        .map((selector) =>
          document.querySelector(selector)?.getAttribute("href")
        )
        .filter(Boolean) as string[];

      // Look for expertise signals
      const expertiseKeywords = [
        "expert",
        "specialist",
        "certified",
        "years of experience",
        "PhD",
        "MD",
      ];
      const bodyText = document.body.textContent?.toLowerCase() || "";
      const expertiseSignals = expertiseKeywords.filter((keyword) =>
        bodyText.includes(keyword.toLowerCase())
      );

      return {
        hasAuthorBio,
        hasContactInfo,
        hasAboutPage,
        socialLinks,
        expertiseSignals,
      };
    });
  }

  private getDefaultAuthorshipSignals() {
    return {
      hasAuthorBio: false,
      hasContactInfo: false,
      hasAboutPage: false,
      socialLinks: [],
      expertiseSignals: [],
    };
  }

  private async performSemanticClassification(content: string, title: string) {
    // Basic semantic classification (would be enhanced with AI in production)
    const wordCount = content.split(/\s+/).length;

    // Determine content type
    let contentType = "article";
    if (
      title.toLowerCase().includes("product") ||
      content.toLowerCase().includes("buy now")
    ) {
      contentType = "product";
    } else if (
      title.toLowerCase().includes("service") ||
      content.toLowerCase().includes("contact us")
    ) {
      contentType = "service";
    } else if (
      title.toLowerCase().includes("how to") ||
      title.toLowerCase().includes("guide")
    ) {
      contentType = "guide";
    }

    // Basic topic categorization (would use NLP in production)
    const topicCategories = this.extractTopicCategories(content);

    // Extract key entities (simplified)
    const keyEntities = this.extractKeyEntities(content);

    // Calculate reading level (simplified Flesch formula)
    const readingLevel = this.calculateReadingLevel(content);

    // Determine content depth
    let contentDepth: "surface" | "moderate" | "comprehensive" = "surface";
    if (wordCount > 1500) contentDepth = "comprehensive";
    else if (wordCount > 500) contentDepth = "moderate";

    return {
      contentType,
      topicCategories,
      keyEntities,
      readingLevel,
      contentDepth,
    };
  }

  private extractTopicCategories(content: string): string[] {
    const categories = [
      {
        terms: ["technology", "software", "programming", "code"],
        category: "Technology",
      },
      {
        terms: ["marketing", "seo", "advertising", "brand"],
        category: "Marketing",
      },
      {
        terms: ["business", "strategy", "finance", "startup"],
        category: "Business",
      },
      {
        terms: ["health", "medical", "wellness", "fitness"],
        category: "Health",
      },
      {
        terms: ["education", "learning", "course", "tutorial"],
        category: "Education",
      },
    ];

    const lowerContent = content.toLowerCase();
    return categories
      .filter((cat) => cat.terms.some((term) => lowerContent.includes(term)))
      .map((cat) => cat.category);
  }

  private extractKeyEntities(content: string): string[] {
    // Simplified entity extraction (would use NER in production)
    const words = content.split(/\s+/);

    // Look for capitalized words that might be entities
    const capitalizedWords = words.filter(
      (word) => /^[A-Z][a-z]{2,}/.test(word) && word.length > 3
    );

    // Remove duplicates and take top 10
    return [...new Set(capitalizedWords)].slice(0, 10);
  }

  private calculateReadingLevel(content: string): number {
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const syllables = this.countSyllables(content);

    // Flesch Reading Ease Score
    const score =
      206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(text: string): number {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .replace(/[aeiou]{2,}/g, "a")
        .replace(/[^aeiou]e$/g, "")
        .replace(/[^aeiou]/g, "").length || 1
    );
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  scheduleTask(task: CrawlerTask): void {
    // Deduplicate by URL
    if (this.queuedUrls.has(task.url)) return;
    this.queuedUrls.add(task.url);
    // Return a promise to allow consumers to await in future extension (not used currently)
    const p = new Promise<CrawlResult>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      void this.drainQueue();
    });
    // Fire-and-forget until consumers adopt the promise
    void p.then(() => { /* noop */ }).catch(() => { /* noop */ });
  }

  private async drainQueue() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;
      this.active++;
      try {
        const result = await this.crawl(item.task.url, { cacheTtlMs: NeuralCrawler.DEFAULT_CACHE_TTL });
        item.resolve(result);
      } catch (e) {
        item.reject(e);
      } finally {
        this.active--;
        this.queuedUrls.delete(item.task.url);
      }
    }
  }

}

// ---------------- Derived Heuristic Metric Helpers (Phase 0) ----------------
function headingsWordCount(content: string): number {
  return content.split(/\s+/).length;
}

function clampScore(v: number) { return Math.max(0, Math.min(100, Math.round(v))); }

function deriveSeoMetrics(tech: CrawlResult['technicalData'], content: string, wc: number) {
  // Simple heuristic blend: word count depth, title/meta lengths, heading richness
  const depthScore = wc >= 1200 ? 100 : wc >= 800 ? 85 : wc >= 400 ? 65 : 40;
  const titleScore = tech.titleLength > 15 && tech.titleLength < 65 ? 90 : 60;
  const metaScore = tech.metaDescriptionLength > 70 && tech.metaDescriptionLength < 165 ? 90 : 55;
  const headingVariety = Object.keys(tech.headings).length;
  const headingScore = headingVariety >= 4 ? 90 : headingVariety >= 2 ? 70 : 45;
  const technicalScore = clampScore((titleScore * 0.4 + metaScore * 0.4 + (tech.canonicalMismatch ? 40 : 85)) / 1.6);
  const contentScore = clampScore((depthScore * 0.6 + headingScore * 0.4));
  const overallScore = clampScore(technicalScore * 0.5 + contentScore * 0.5);
  return { overallScore, technicalScore, contentScore };
}

function derivePerformanceMetrics(tech: CrawlResult['technicalData']) {
  // Penalize high load time & large page size heuristically
  const load = tech.loadTime; // ms
  const sizeKb = tech.pageSize / 1024;
  let score = 100;
  if (load > 4000) score -= 35; else if (load > 2500) score -= 20; else if (load > 1500) score -= 10;
  if (sizeKb > 3000) score -= 25; else if (sizeKb > 1500) score -= 15; else if (sizeKb > 800) score -= 5;
  if (tech.canonicalMismatch) score -= 5;
  return { overallScore: clampScore(score) };
}


// ---------------- Robots.txt Minimal Parser -----------------
interface RobotsRules { disallow: string[]; allow: string[]; }

function parseRobots(content: string, ua: string): RobotsRules {
  const lines = content.split(/\r?\n/);
  let active = false; const rules: RobotsRules = { disallow: [], allow: [] };
  const uaLower = ua.toLowerCase();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [fieldRaw, valueRaw] = line.split(':', 2);
    if (!valueRaw) continue;
    const field = fieldRaw.toLowerCase();
    const value = valueRaw.trim();
    if (field === 'user-agent') {
      const target = value.toLowerCase();
      active = (target === '*' || uaLower.includes(target));
    } else if (active && field === 'disallow') {
      if (value) rules.disallow.push(value);
    } else if (active && field === 'allow') {
      if (value) rules.allow.push(value);
    }
  }
  return rules;
}

function pathMatches(path: string, pattern: string): boolean {
  if (pattern === '/') return true;
  // Convert simple * wildcard
  const regex = new RegExp('^' + pattern.split('*').map(p => p.replace(/[-/\\^$+?.()|[\]{}]/g, r => '\\' + r)).join('.*'));
  return regex.test(path);
}

async function fetchRobots(domain: string): Promise<string | null> {
  try {
    const res = await fetch(domain + '/robots.txt', { method: 'GET' });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

// Augment instance type for the dynamically attached method (declaration merging approach)
export interface NeuralCrawler { isAllowedByRobots(url: string, ua: string): Promise<boolean>; }
// Define the method on the prototype (no any / safe typing)
NeuralCrawler.prototype.isAllowedByRobots = async function (this: NeuralCrawler, url: string, ua: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    const cached = this.robotsCache.get(origin);
    if (cached && (Date.now() - cached.fetched) < NeuralCrawler.ROBOTS_TTL) {
      return evaluateRules(cached.rules, parsed.pathname);
    }
    const txt = await fetchRobots(origin);
    if (!txt) return true; // no robots => allow
    const rules = parseRobots(txt, ua);
    this.robotsCache.set(origin, { fetched: Date.now(), rules });
    return evaluateRules(rules, parsed.pathname);
  } catch { return true; }
};

function evaluateRules(rules: RobotsRules, path: string): boolean {
  // Allow has precedence over disallow if more specific (length comparison)
  let disallowedMatch: string | null = null;
  for (const dis of rules.disallow) {
    if (pathMatches(path, dis)) {
      if (!disallowedMatch || dis.length > disallowedMatch.length) disallowedMatch = dis;
    }
  }
  let allowedMatch: string | null = null;
  for (const al of rules.allow) {
    if (pathMatches(path, al)) {
      if (!allowedMatch || al.length > allowedMatch.length) allowedMatch = al;
    }
  }
  if (disallowedMatch && allowedMatch) {
    return allowedMatch.length >= disallowedMatch.length; // more specific allow overrides
  }
  return !disallowedMatch;
}
