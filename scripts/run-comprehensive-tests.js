#!/usr/bin/env node

/**
 * RankPilot Comprehensive Test Runner
 * Executes all test suites in the correct order with proper reporting
 */

const { execSync, spawn: _spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class TestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      suites: [],
    };
    this.startTime = Date.now();
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const colors = {
      info: "\x1b[36m",
      success: "\x1b[32m",
      error: "\x1b[31m",
      warning: "\x1b[33m",
      reset: "\x1b[0m",
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runCommand(command, description, cwd = process.cwd()) {
    this.log(`🚀 Starting: ${description}`, "info");

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      try {
        const result = execSync(command, {
          cwd,
          stdio: "pipe",
          encoding: "utf8",
          timeout: 300000, // 5 minutes timeout
        });

        const duration = Date.now() - startTime;
        this.log(`✅ Completed: ${description} (${duration}ms)`, "success");

        resolve({
          success: true,
          output: result,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        this.log(`❌ Failed: ${description} (${duration}ms)`, "error");
        this.log(`   Error: ${error.message}`, "error");

        resolve({
          success: false,
          error: error.message,
          duration,
        });
      }
    });
  }

  async runTestSuite(suiteName, testFiles, description) {
    this.log(`\n🧪 Running Test Suite: ${suiteName}`, "info");
    this.log(`📝 Description: ${description}`, "info");

    const suiteStartTime = Date.now();
    const suiteResults = {
      name: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      total: testFiles.length,
      duration: 0,
      tests: [],
    };

    for (const testFile of testFiles) {
      const testPath = path.join(__dirname, "..", testFile);

      if (!fs.existsSync(testPath)) {
        this.log(`⚠️ Test file not found: ${testFile}`, "warning");
        suiteResults.skipped++;
        continue;
      }

      this.log(`   📄 Running: ${path.basename(testFile)}`, "info");

      // Run the test file
      const command = `npx playwright test ${testPath} --reporter=line`;
      const result = await this.runCommand(
        command,
        `Test: ${path.basename(testFile)}`
      );

      if (result.success) {
        suiteResults.passed++;
        suiteResults.tests.push({
          file: testFile,
          status: "passed",
          duration: result.duration,
        });
      } else {
        suiteResults.failed++;
        suiteResults.tests.push({
          file: testFile,
          status: "failed",
          error: result.error,
          duration: result.duration,
        });
      }
    }

    suiteResults.duration = Date.now() - suiteStartTime;
    this.testResults.suites.push(suiteResults);

    this.log(
      `📊 Suite Results: ${suiteResults.passed}/${suiteResults.total} passed`,
      "info"
    );

    return suiteResults;
  }

  async runAllTests() {
    this.log("🎯 Starting RankPilot Comprehensive Test Suite", "info");
    this.log("=".repeat(60), "info");

    // Test suites in order of execution
    const testSuites = [
      {
        name: "Phase 1: Critical API Coverage",
        description:
          "Testing core API endpoints for MCP, Agents, NeuroSEO, and Authentication",
        files: [
          "testing/api/mcp/mcp-integration.spec.ts",
          "testing/api/agents/agents-management.spec.ts",
          "testing/api/neuroseo/neuroseo-analysis.spec.ts",
          "testing/api/auth/authentication-authorization.spec.ts",
        ],
      },
      {
        name: "Phase 2: Component Testing",
        description:
          "Testing UI components including dashboard, forms, and settings",
        files: [
          "testing/components/ui/dashboard-components.spec.ts",
          "testing/components/ui/form-components.spec.ts",
          "testing/components/ui/settings-components.spec.ts",
          "testing/accessibility/wcag-compliance.spec.ts",
        ],
      },
      {
        name: "Phase 3: Integration & E2E",
        description: "Testing user journeys and cross-feature integration",
        files: [
          "testing/e2e/user-journeys.spec.ts",
          "testing/integration/cross-feature-integration.spec.ts",
        ],
      },
      {
        name: "Phase 4: Security & Edge Cases",
        description: "Testing security validation and error handling",
        files: [
          "testing/security/security-validation.spec.ts",
          "testing/error-handling/edge-cases.spec.ts",
        ],
      },
      {
        name: "Performance & Load Testing",
        description: "Testing performance metrics and load handling",
        files: ["testing/performance/load-testing.spec.ts"],
      },
    ];

    // Run each test suite
    for (const suite of testSuites) {
      const result = await this.runTestSuite(
        suite.name,
        suite.files,
        suite.description
      );

      this.testResults.passed += result.passed;
      this.testResults.failed += result.failed;
      this.testResults.skipped += result.skipped;
      this.testResults.total += result.total;
    }

    this.testResults.duration = Date.now() - this.startTime;

    this.generateReport();
  }

  generateReport() {
    this.log("\n" + "=".repeat(60), "info");
    this.log("📊 COMPREHENSIVE TEST RESULTS SUMMARY", "info");
    this.log("=".repeat(60), "info");

    // Overall statistics
    const successRate = (
      (this.testResults.passed / this.testResults.total) *
      100
    ).toFixed(2);

    this.log(`\n📈 Overall Statistics:`, "info");
    this.log(`   Total Tests: ${this.testResults.total}`, "info");
    this.log(`   Passed: ${this.testResults.passed}`, "success");
    this.log(
      `   Failed: ${this.testResults.failed}`,
      this.testResults.failed > 0 ? "error" : "info"
    );
    this.log(`   Skipped: ${this.testResults.skipped}`, "warning");
    this.log(
      `   Success Rate: ${successRate}%`,
      successRate >= "90" ? "success" : "warning"
    );
    this.log(
      `   Total Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`,
      "info"
    );

    // Suite breakdown
    this.log(`\n📋 Suite Breakdown:`, "info");
    this.testResults.suites.forEach((suite) => {
      const suiteSuccessRate = ((suite.passed / suite.total) * 100).toFixed(2);
      const _status = suite.failed > 0 ? "error" : "success";

      this.log(`   ${suite.name}:`, "info");
      this.log(`     Tests: ${suite.total}`, "info");
      this.log(`     Passed: ${suite.passed}`, "success");
      this.log(
        `     Failed: ${suite.failed}`,
        suite.failed > 0 ? "error" : "info"
      );
      this.log(
        `     Success Rate: ${suiteSuccessRate}%`,
        suiteSuccessRate >= "90" ? "success" : "warning"
      );
      this.log(`     Duration: ${(suite.duration / 1000).toFixed(2)}s`, "info");
    });

    // Detailed failure report
    const failedTests = this.testResults.suites
      .flatMap((suite) => suite.tests)
      .filter((test) => test.status === "failed");

    if (failedTests.length > 0) {
      this.log(`\n❌ Failed Tests Details:`, "error");
      failedTests.forEach((test) => {
        this.log(`   ${test.file}:`, "error");
        this.log(`     Error: ${test.error}`, "error");
        this.log(
          `     Duration: ${(test.duration / 1000).toFixed(2)}s`,
          "info"
        );
      });
    }

    // Recommendations
    this.log(`\n💡 Recommendations:`, "info");
    if (this.testResults.failed > 0) {
      this.log(
        `   • Review and fix ${this.testResults.failed} failed tests`,
        "warning"
      );
      this.log(`   • Check test environment and dependencies`, "warning");
      this.log(`   • Verify application stability`, "warning");
    }

    if (successRate < "90") {
      this.log(`   • Improve test coverage and reliability`, "warning");
      this.log(`   • Add more comprehensive test scenarios`, "warning");
    } else {
      this.log(`   • Excellent test coverage achieved!`, "success");
      this.log(`   • Consider adding more edge case tests`, "info");
    }

    // Save detailed report
    this.saveDetailedReport();

    this.log("\n🎉 Test execution completed!", "success");
  }

  saveDetailedReport() {
    const reportPath = path.join(
      __dirname,
      "..",
      "test-results",
      "comprehensive-test-report.json"
    );
    const reportDir = path.dirname(reportPath);

    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd(),
      },
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Detailed report saved to: ${reportPath}`, "info");
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.testResults.failed > 0) {
      recommendations.push({
        priority: "high",
        category: "Fixes",
        description: `Address ${this.testResults.failed} failed tests to improve stability`,
      });
    }

    const successRate =
      (this.testResults.passed / this.testResults.total) * 100;
    if (successRate < 90) {
      recommendations.push({
        priority: "medium",
        category: "Coverage",
        description: "Increase test coverage by adding more test scenarios",
      });
    }

    if (this.testResults.duration > 300000) {
      // 5 minutes
      recommendations.push({
        priority: "medium",
        category: "Performance",
        description: "Optimize test execution time for faster feedback",
      });
    }

    recommendations.push({
      priority: "low",
      category: "Maintenance",
      description: "Regularly review and update test suites for new features",
    });

    return recommendations;
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();

  try {
    // Pre-flight checks
    console.log("🔍 Running pre-flight checks...");

    // Check if Playwright is installed
    try {
      execSync("npx playwright --version", { stdio: "pipe" });
      runner.log("✅ Playwright is available", "success");
    } catch (_error) {
      runner.log("❌ Playwright not found. Installing...", "warning");
      await runner.runCommand(
        "npm install -g @playwright/test",
        "Install Playwright"
      );
      await runner.runCommand(
        "npx playwright install",
        "Install Playwright browsers"
      );
    }

    // Check if test files exist
    const testDir = path.join(__dirname, "..", "testing");
    if (!fs.existsSync(testDir)) {
      runner.log("❌ Test directory not found", "error");
      process.exit(1);
    }

    // Run all tests
    await runner.runAllTests();
  } catch (error) {
    runner.log(`💥 Test runner failed: ${error.message}`, "error");
    process.exit(1);
  }
}

// Handle process signals
process.on("SIGINT", () => {
  console.log("\n⏹️ Test execution interrupted by user");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

module.exports = TestRunner;
