import { NeuralCrawler } from "@/lib/neuroseo/neural-crawler";

// Fetch real page content for a small set of URLs for rewrite generation.
// Falls back to deterministic placeholder content if crawl fails or content empty.
export async function fetchRewriteSourceContents(
  urls: string[],
  opts?: { max?: number; timeoutMs?: number; deterministicFallback?: boolean }
) {
  const max = opts?.max ?? 3;
  const subset = urls.slice(0, max);
  const crawler = new NeuralCrawler();
  const results: Record<string, string> = {};
  for (const url of subset) {
    if (process.env.AUTOMATION_DISABLE_CRAWL) {
      results[url] = deterministicPlaceholder(url, opts?.deterministicFallback);
      continue;
    }
    try {
      const crawl = await crawler.crawl(url, {
        respectRobots: true,
        cacheTtlMs: 5 * 60_000,
      });
      const text =
        (crawl.title ? crawl.title + "\n\n" : "") + (crawl.content || "");
      results[url] =
        text.trim().length > 80
          ? truncate(text, 10_000)
          : deterministicPlaceholder(url, opts?.deterministicFallback);
    } catch {
      results[url] = deterministicPlaceholder(url, opts?.deterministicFallback);
    }
  }
  try {
    await crawler.close();
  } catch {
    /* ignore */
  }
  return results; // map url -> content
}

function deterministicPlaceholder(url: string, deterministic = true) {
  if (!deterministic) return `Placeholder content for ${url}`;
  // Simple deterministic hash-based lorem selection (avoid randomness for tests)
  const base = `Original source unavailable for ${url}. This deterministic placeholder preserves URL context for rewrite variant generation.`;
  return base;
}

function truncate(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max) + "\n...[truncated]";
}
