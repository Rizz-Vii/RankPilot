import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base-page";

export class LinkViewPage extends BasePage {
  readonly linkInput: Locator;
  readonly analyzeButton: Locator;
  readonly resultsContainer: Locator;
  readonly metricCards: Locator;
  readonly backlinksTable: Locator;
  readonly exportButton: Locator;
  readonly batchInput: Locator;
  readonly saveButton: Locator;
  readonly compareButton: Locator;
  readonly historyButton: Locator;
  readonly statusIndicator: Locator;
  readonly comparisonView: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.linkInput = page.locator('[data-testid="link-input"]');
    this.analyzeButton = page.locator('[data-testid="analyze-button"]');
    this.resultsContainer = page.locator('[data-testid="results-container"]');
    this.metricCards = page.locator('[data-testid="metric-card"]');
    this.backlinksTable = page.locator('[data-testid="backlinks-table"]');
    this.exportButton = page.locator('[data-testid="export-button"]');
    this.batchInput = page.locator('[data-testid="batch-input"]');
    this.saveButton = page.locator('[data-testid="save-button"]');
    this.compareButton = page.locator('[data-testid="compare-button"]');
    this.historyButton = page.locator('[data-testid="history-button"]');
    this.statusIndicator = page.locator('[data-testid="status-indicator"]');
    this.comparisonView = page.locator('[data-testid="comparison-view"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  override async navigateTo(path?: string) {
    await this.page.goto(path || "/link-view");
  }

  async analyzeDomain(url: string) {
    await this.analyzeSingleLink(url);
  }

  async analyzeSingleLink(url: string) {
    await this.linkInput.fill(url);
    await this.analyzeButton.click();
    await this.waitForLoadingComplete();
  }

  async analyzeBatchLinks(urls: string[]) {
    await this.batchInput.fill(urls.join("\n"));
    await this.analyzeButton.click();
    await this.waitForLoadingComplete();
  }

  async getMetricValue(metricName: string) {
    return this.page.locator(
      `[data-testid="metric-${metricName.toLowerCase()}"]`
    );
  }

  async getLinkStatus() {
    return this.statusIndicator;
  }

  async getBatchProgress() {
    return this.page.locator('[data-testid="batch-progress"]');
  }

  async getBatchResults() {
    return this.page.locator('[data-testid="batch-result-item"]').all();
  }

  async saveToHistory() {
    await this.saveButton.click();
  }

  async navigateToHistory() {
    await this.historyButton.click();
  }

  async addToComparison() {
    await this.compareButton.click();
  }

  async viewComparison() {
    await this.page.goto("/link-view/compare");
  }

  async getComparisonChart() {
    return this.page.locator('[data-testid="comparison-chart"]');
  }

  async getComparisonMetrics() {
    return this.page.locator('[data-testid="comparison-metrics"]');
  }

  async getErrorDetails() {
    return this.errorMessage;
  }

  public override async waitForLoadingComplete() {
    await this.page.waitForSelector('[data-testid="loading-indicator"]', {
      state: "hidden",
    });
  }
}
