import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./base-page";

export class SerpViewPage extends BasePage {
  readonly urlInput: Locator;
  readonly keywordInput: Locator;
  readonly analyzeButton: Locator;
  readonly resultsContainer: Locator;
  readonly rankingMetrics: Locator;
  readonly competitorTable: Locator;

  constructor(page: Page) {
    super(page);
    this.urlInput = page.locator('[data-testid="url-input"]');
    this.keywordInput = page.locator('[data-testid="keyword-input"]');
    this.analyzeButton = page.locator('[data-testid="analyze-button"]');
    this.resultsContainer = page.locator('[data-testid="results-container"]');
    this.rankingMetrics = page.locator('[data-testid="ranking-metrics"]');
    this.competitorTable = page.locator('[data-testid="competitor-table"]');
  }

  async analyze(url: string, keyword: string) {
    await this.urlInput.fill(url);
    await this.keywordInput.fill(keyword);
    await this.analyzeButton.click();
    await this.waitForLoadingComplete();
  }

  async getRankingData() {
    await this.rankingMetrics.waitFor({ state: "visible" });
    return {
      position: await this.rankingMetrics
        .locator('[data-metric="position"]')
        .textContent(),
      visibility: await this.rankingMetrics
        .locator('[data-metric="visibility"]')
        .textContent(),
      competition: await this.rankingMetrics
        .locator('[data-metric="competition"]')
        .textContent(),
    };
  }

  async getCompetitors() {
    await this.competitorTable.waitFor({ state: "visible" });
    return this.competitorTable.locator("tr").all();
  }
}
