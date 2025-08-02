#!/usr/bin/env node

/**
 * Role-Based Test Runner
 *
 * This script orchestrates the execution of role-based tests with proper
 * sequencing, user management, and comprehensive reporting.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class RoleBasedTestRunner {
  constructor() {
    this.testResults = {
      freeTier: { status: "pending", duration: 0, errors: [] },
      enterpriseTier: { status: "pending", duration: 0, errors: [] },
      overall: {
        status: "pending",
        totalDuration: 0,
        startTime: null,
        endTime: null,
      },
    };

    this.configFile = "playwright.config.role-based.ts";
    this.logFile = path.join("test-results", "role-based-test-run.log");
  }

  log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    console.log(logMessage);

    // Write to log file
    try {
      fs.appendFileSync(this.logFile, logMessage + "\n");
    } catch (_error) {
      // Ignore file write errors
    }
  }

  async checkPrerequisites() {
    this.log("🔍 Checking prerequisites...");

    // Check if dev server is running
    try {
      const { execSync } = require("child_process");
      execSync("curl -f http://localhost:3000 > /dev/null 2>&1", {
        stdio: "ignore",
      });
      this.log("✅ Development server is running");
    } catch (_error) {
      this.log("❌ Development server is not running", "ERROR");
      this.log(
        "💡 Please start the development server with: npm run dev",
        "INFO"
      );
      throw new Error("Development server not running");
    }

    // Check if role-based config exists
    if (!fs.existsSync(this.configFile)) {
      this.log(`❌ Config file ${this.configFile} not found`, "ERROR");
      throw new Error("Role-based config file missing");
    }

    // Ensure test results directory exists
    const testResultsDir = path.join(process.cwd(), "test-results");
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
      this.log("📁 Created test-results directory");
    }

    this.log("✅ All prerequisites satisfied");
  }

  async runFreeTierTests() {
    this.log("🆓 Starting Free Tier Tests...");
    const startTime = Date.now();

    try {
      this.testResults.freeTier.status = "running";

      const command = `npx playwright test --config=${this.configFile} --project=free-tier-worker`;
      this.log(`🚀 Executing: ${command}`);

      execSync(command, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_HTML_REPORT: "test-results/free-tier-report",
        },
      });

      this.testResults.freeTier.status = "passed";
      this.log("✅ Free Tier Tests completed successfully");
    } catch (_error) {
      this.testResults.freeTier.status = "failed";
      this.testResults.freeTier.errors.push(error.message);
      this.log(`❌ Free Tier Tests failed: ${error.message}`, "ERROR");
      throw error;
    } finally {
      this.testResults.freeTier.duration = Date.now() - startTime;
      this.log(
        `⏱️ Free Tier Tests duration: ${this.testResults.freeTier.duration}ms`
      );
    }
  }

  async runEnterpriseTierTests() {
    this.log("🏢 Starting Enterprise Tier Tests...");
    const startTime = Date.now();

    try {
      this.testResults.enterpriseTier.status = "running";

      const command = `npx playwright test --config=${this.configFile} --project=enterprise-tier-worker`;
      this.log(`🚀 Executing: ${command}`);

      execSync(command, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_HTML_REPORT: "test-results/enterprise-tier-report",
        },
      });

      this.testResults.enterpriseTier.status = "passed";
      this.log("✅ Enterprise Tier Tests completed successfully");
    } catch (_error) {
      this.testResults.enterpriseTier.status = "failed";
      this.testResults.enterpriseTier.errors.push(error.message);
      this.log(`❌ Enterprise Tier Tests failed: ${error.message}`, "ERROR");
      throw error;
    } finally {
      this.testResults.enterpriseTier.duration = Date.now() - startTime;
      this.log(
        `⏱️ Enterprise Tier Tests duration: ${this.testResults.enterpriseTier.duration}ms`
      );
    }
  }

  async runMobileTests() {
    this.log("📱 Starting Mobile Tests...");

    try {
      const commands = [
        `npx playwright test --config=${this.configFile} --project=mobile-free-tier`,
        `npx playwright test --config=${this.configFile} --project=mobile-enterprise-tier`,
      ];

      for (const command of commands) {
        this.log(`🚀 Executing: ${command}`);
        execSync(command, {
          stdio: "inherit",
          cwd: process.cwd(),
        });
      }

      this.log("✅ Mobile Tests completed successfully");
    } catch (_error) {
      this.log(`⚠️ Mobile Tests had issues: ${error.message}`, "WARN");
      // Don't fail the entire test run for mobile issues
    }
  }

  async runCompatibilityTests() {
    this.log("🌐 Starting Cross-Browser Compatibility Tests...");

    try {
      const command = `npx playwright test --config=${this.configFile} --project=firefox-compatibility`;
      this.log(`🚀 Executing: ${command}`);

      execSync(command, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      this.log("✅ Compatibility Tests completed successfully");
    } catch (_error) {
      this.log(`⚠️ Compatibility Tests had issues: ${error.message}`, "WARN");
      // Don't fail the entire test run for compatibility issues
    }
  }

  generateFinalReport() {
    this.log("📊 Generating final test report...");

    const report = {
      summary: {
        overallStatus: this.testResults.overall.status,
        totalDuration: this.testResults.overall.totalDuration,
        startTime: this.testResults.overall.startTime,
        endTime: this.testResults.overall.endTime,
      },
      freeTier: this.testResults.freeTier,
      enterpriseTier: this.testResults.enterpriseTier,
      metadata: {
        configFile: this.configFile,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
    };

    const reportPath = path.join(
      "test-results",
      "role-based-final-report.json"
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📝 Final report written to: ${reportPath}`);

    // Display summary
    console.log("\n🎯 TEST EXECUTION SUMMARY");
    console.log("=".repeat(50));
    console.log(
      `Free Tier Tests: ${this.testResults.freeTier.status.toUpperCase()}`
    );
    console.log(
      `Enterprise Tier Tests: ${this.testResults.enterpriseTier.status.toUpperCase()}`
    );
    console.log(
      `Overall Status: ${this.testResults.overall.status.toUpperCase()}`
    );
    console.log(`Total Duration: ${this.testResults.overall.totalDuration}ms`);
    console.log("=".repeat(50));
  }

  async run() {
    this.testResults.overall.startTime = new Date().toISOString();
    const overallStartTime = Date.now();

    try {
      this.log("🚀 Starting Role-Based Test Execution");

      // Prerequisites
      await this.checkPrerequisites();

      // Sequential execution of role-based tests
      await this.runFreeTierTests();
      await this.runEnterpriseTierTests();

      // Optional additional tests (don't fail main execution)
      await this.runMobileTests();
      await this.runCompatibilityTests();

      this.testResults.overall.status = "passed";
      this.log("🎉 All role-based tests completed successfully!");
    } catch (_error) {
      this.testResults.overall.status = "failed";
      this.log(`💥 Test execution failed: ${error.message}`, "ERROR");
      throw error;
    } finally {
      this.testResults.overall.endTime = new Date().toISOString();
      this.testResults.overall.totalDuration = Date.now() - overallStartTime;

      this.generateFinalReport();
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new RoleBasedTestRunner();

  runner
    .run()
    .then(() => {
      console.log("✅ Test execution completed successfully");
      process.exit(0);
    })
    .catch((_error) => {
      console.error("❌ Test execution failed:", _error);
      process.exit(1);
    });
}

module.exports = RoleBasedTestRunner;
