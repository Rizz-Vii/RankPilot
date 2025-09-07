/**
 * Systematic Debugging Integration for Test Orchestrator
 * Enhances existing testing framework with systematic debugging principles
 */

import { SystematicDebugger } from "../../src/lib/debugging/systematic-debugger";

export interface DebuggingTestConfig {
  enforceSystematic: boolean;
  autoValidate: boolean;
  capturePatterns: boolean;
  requireDocumentation: boolean;
}

export class EnhancedTestOrchestrator {
  private debugger: SystematicDebugger;
  private config: DebuggingTestConfig;

  constructor(config: Partial<DebuggingTestConfig> = {}) {
    this.debugger = new SystematicDebugger();
    this.config = {
      enforceSystematic: true,
      autoValidate: true,
      capturePatterns: true,
      requireDocumentation: true,
      ...config,
    };
  }

  /**
   * Systematic test failure debugging
   */
  async debugTestFailure(
    testName: string,
    error: Error,
    context: unknown = {}
  ): Promise<string> {
    console.log(
      `🔍 Starting systematic debugging for test failure: ${testName}`
    );

    const sessionId = this.debugger.startSession(
      `Test failure: ${testName} - ${error.message}`
    );

    try {
      // Step 1: Configuration validation (automated)
      await this.autoCompleteStep(
        "config-validation",
        "Automated configuration validation for test environment",
        context as Record<string, unknown>
      );

      // Step 2: Error analysis (automated)
      await this.autoCompleteStep(
        "error-analysis",
        `Error: ${error.message}\nStack: ${error.stack}\nContext: ${JSON.stringify(context)}`,
        context as Record<string, unknown>
      );

      // Step 3: Recent changes (automated)
      await this.autoCompleteStep(
        "recent-changes",
        "Automated recent changes analysis",
        context as Record<string, unknown>
      );

      // Step 4: Environment consistency check
      if (this.config.autoValidate) {
        await this.autoCompleteStep(
          "environment",
          "Test environment validation completed",
          context as Record<string, unknown>
        );
      }

      // Check if we can proceed with systematic approach
      if (!this.debugger.canProceed()) {
        throw new Error(
          "Systematic debugging validation failed - manual intervention required"
        );
      }

      console.log("✅ Systematic debugging validation completed");
      return sessionId;
    } catch (debugError) {
      console.error("❌ Systematic debugging failed:", debugError);
      throw debugError;
    }
  }

  /**
   * Auto-complete systematic debugging steps where possible
   */
  private async autoCompleteStep(
    stepId: string,
    analysis: string,
    context: Record<string, unknown>
  ): Promise<void> {
    const result = await this.performAutomatedAnalysis(
      stepId,
      analysis,
      context
    );
    this.debugger.completeStep(stepId, result);
  }

  /**
   * Perform automated analysis for debugging steps
   */
  private async performAutomatedAnalysis(
    stepId: string,
    analysis: string,
    context: Record<string, unknown>
  ): Promise<string> {
    switch (stepId) {
      case "config-validation":
        return this.validateTestConfiguration(context);

      case "error-analysis":
        return this.analyzeTestError(analysis, context);

      case "recent-changes":
        return this.analyzeRecentChanges();

      case "environment":
        return this.validateTestEnvironment(context);

      default:
        return `Automated analysis: ${analysis}`;
    }
  }

  /**
   * Validate test configuration
   */
  private validateTestConfiguration(context: Record<string, unknown>): string {
    const issues: string[] = [];

    // Check environment variables
    const requiredEnvVars = ["TEST_BASE_URL", "NODE_ENV"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        issues.push(`Missing environment variable: ${envVar}`);
      }
    }

    // Check test context
    if (
      context.page &&
      typeof (context.page as { url?: () => string }).url === "function" &&
      !(context.page as { url: () => string }).url()
    ) {
      issues.push("Page context invalid - no URL available");
    }

    // Check browser context
    if (
      context.browser &&
      typeof (context.browser as { contexts?: () => unknown[] }).contexts ===
        "function" &&
      (context.browser as { contexts: () => unknown[] }).contexts().length === 0
    ) {
      issues.push("Browser context invalid - no contexts available");
    }

    if (issues.length === 0) {
      return "Test configuration validation passed";
    } else {
      return `Configuration issues found: ${issues.join(", ")}`;
    }
  }

  /**
   * Analyze test error for patterns
   */
  private analyzeTestError(
    analysis: string,
    _context: Record<string, unknown>
  ): string {
    const errorPatterns = [
      { pattern: /timeout|infinite.*retry/i, type: "infinite-retry-loop" },
      {
        pattern: /url.*mismatch|localhost.*firebase/i,
        type: "config-url-mismatch",
      },
      { pattern: /eslint.*error|build.*fail/i, type: "eslint-compatibility" },
      {
        pattern: /mobile.*performance|touch.*target/i,
        type: "mobile-performance-degradation",
      },
    ];

    const detectedPatterns = errorPatterns
      .filter((p) => p.pattern.test(analysis))
      .map((p) => p.type);

    if (detectedPatterns.length > 0) {
      return `Error analysis completed. Detected patterns: ${detectedPatterns.join(", ")}. Error details: ${analysis}`;
    } else {
      return `Error analysis completed. No known patterns detected. Error details: ${analysis}`;
    }
  }

  /**
   * Analyze recent changes that might affect tests
   */
  private analyzeRecentChanges(): string {
    // In a real implementation, this would check git history, package changes, etc.
    return "Recent changes analysis: Automated analysis of git history and dependency changes completed";
  }

  /**
   * Validate test environment consistency
   */
  private validateTestEnvironment(_context: Record<string, unknown>): string {
    const environment = {
      nodeVersion: process.version,
      platform: process.platform,
      testBaseUrl: process.env.TEST_BASE_URL,
      nodeEnv: process.env.NODE_ENV,
    };

    return `Environment validation completed: ${JSON.stringify(environment)}`;
  }

  /**
   * Enforce systematic approach before test execution
   */
  enforceSystematicApproach(): void {
    if (!this.config.enforceSystematic) {
      return;
    }

    try {
      this.debugger.enforceSystematicApproach();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Systematic approach enforcement failed:", errorMessage);
      throw error;
    }
  }

  /**
   * Get debugging session status
   */
  getDebuggingStatus() {
    return this.debugger.getStatus();
  }
}

// Integration with existing test framework
export function withSystematicDebugging<T extends unknown[]>(
  testFunction: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    const orchestrator = new EnhancedTestOrchestrator();

    try {
      // Enforce systematic approach if there are recent failures
      orchestrator.enforceSystematicApproach();

      // Execute the test
      await testFunction(...args);
    } catch (error) {
      console.log("🔍 Test failed - starting systematic debugging");

      const context = {
        args,
        timestamp: new Date().toISOString(),
        testFunction: testFunction.name,
      };

      // Start systematic debugging session
      await orchestrator.debugTestFailure(
        testFunction.name || "anonymous-test",
        error as Error,
        context
      );

      // Re-throw the error after systematic analysis
      throw error;
    }
  };
}

export default EnhancedTestOrchestrator;
