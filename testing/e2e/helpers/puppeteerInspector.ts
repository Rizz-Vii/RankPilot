import fs from "fs";
import path from "path";
import { getResultsDir, logE2EError } from "../hooks/error-logger";

// Minimal local interfaces to avoid importing Puppeteer types in type space
type ConsoleMessageLike = { type(): string; text(): string };
type HTTPRequestLike = {
  url(): string;
  failure(): { errorText?: string } | null;
};
type HTTPResponseLike = { ok(): boolean; url(): string; status(): number };
type BrowserLike = { newPage(): Promise<PageLike>; close(): Promise<void> };
type PageLike = {
  on(event: "console", handler: (msg: ConsoleMessageLike) => void): void;
  on(event: "requestfailed", handler: (req: HTTPRequestLike) => void): void;
  on(event: "response", handler: (res: HTTPResponseLike) => void): void;
  goto(
    url: string,
    opts: { waitUntil: "domcontentloaded"; timeout: number }
  ): Promise<void>;
  waitForNetworkIdle(opts: { timeout: number }): Promise<void>;
  content(): Promise<string>;
  screenshot(opts: { path: string; fullPage: boolean }): Promise<unknown>;
  evaluate<T>(fn: () => T): Promise<T>;
};

export async function captureWithPuppeteer(url: string, name: string) {
  const outDir = getResultsDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(outDir, `${name}-${ts}`);

  // Dynamic import keeps this helper optional at runtime and plays nice with ESM
  const puppeteer = require("puppeteer") as unknown as {
    launch: (opts: {
      headless: boolean;
      args: string[];
    }) => Promise<BrowserLike>;
  };

  const browser: BrowserLike = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page: PageLike = await browser.newPage();

  const consoleLogs: string[] = [];
  const networkErrors: Array<{
    url: string;
    errorText?: string;
    status?: number;
  }> = [];

  page.on("console", (msg: ConsoleMessageLike) => {
    if (msg.type() === "error")
      consoleLogs.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on("requestfailed", (req: HTTPRequestLike) => {
    networkErrors.push({ url: req.url(), errorText: req.failure()?.errorText });
  });
  page.on("response", async (res: HTTPResponseLike) => {
    if (!res.ok()) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    try {
      await page.waitForNetworkIdle({ timeout: 5000 });
    } catch {}

    const html = await page.content();
    fs.writeFileSync(`${base}.html`, html);

    await page.screenshot({ path: `${base}.png`, fullPage: true });

    if (consoleLogs.length)
      fs.writeFileSync(`${base}.console.log`, consoleLogs.join("\n"));
    if (networkErrors.length)
      fs.writeFileSync(
        `${base}.network.json`,
        JSON.stringify(networkErrors, null, 2)
      );

    // Evaluate a small state snapshot if available
    const state = await page.evaluate(() => {
      try {
        // Collect a few generic hints
        return {
          location: window.location.href,
          title: document.title,
          hasMain: !!document.querySelector("main"),
          errorText: Array.from(
            document.querySelectorAll('.error,[data-testid="error"]')
          )
            .slice(0, 3)
            .map((e) => e.textContent?.trim())
            .filter(Boolean),
        };
      } catch {
        return {};
      }
    });
    fs.writeFileSync(`${base}.state.json`, JSON.stringify(state, null, 2));

    logE2EError("puppeteer-capture", { url, base });
  } catch (e) {
    logE2EError("puppeteer-capture-failed", {
      url,
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    await browser.close();
  }
}

export default { captureWithPuppeteer };
