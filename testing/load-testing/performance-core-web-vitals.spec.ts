/**
 * RankPilot Performance Testing - Load & Speed Analysis
 * Tests application performance, Core Web Vitals, and load handling
 */

import { test } from "@playwright/test";

// Production URLs
const BASE_URL = "http://localhost:3000";

// Performance benchmarks (based on Core Web Vitals)
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals (Google recommended)
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 }, // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift

  // Additional performance metrics
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TBT: { good: 200, needsImprovement: 600 }, // Total Blocking Time
  TTI: { good: 3800, needsImprovement: 7300 }, // Time to Interactive

  // Custom application metrics
  homepageLoad: { good: 3000, needsImprovement: 5000 },
  apiResponse: { good: 500, needsImprovement: 1000 },
  searchResponse: { good: 800, needsImprovement: 1500 },
};

// Load testing scenarios
const LOAD_SCENARIOS = {
  concurrentUsers: [1, 5, 10, 25, 50],
  requestRates: [10, 25, 50, 100], // requests per minute
  duration: 60, // seconds
  rampUpTime: 10, // seconds
};

const performanceDiagnostics = {
  metrics: {} as Record<string, number>,
  violations: [] as string[],
  recommendations: [] as string[],
};

test.describe("RankPilot Performance Testing - Load & Speed Analysis", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(25000);
  });

  test.describe("Core Web Vitals - Google Performance Metrics", () => {
    test("Largest Contentful Paint (LCP) - Loading Performance", async ({
      page,
    }) => {
      console.log("🎯 Testing Largest Contentful Paint (LCP)...");

      await page.goto(BASE_URL);

      try {
        // Measure LCP using Performance API
        const lcpValue = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            let lcp = 0;

            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              lcp = lastEntry.startTime;
            });

            observer.observe({ entryTypes: ["largest-contentful-paint"] });

            // Fallback: wait for page load and estimate
            setTimeout(() => {
              if (lcp === 0) {
                // Estimate based on load timing
                const navigation = performance.getEntriesByType(
                  "navigation"
                )[0] as PerformanceNavigationTiming;
                lcp = navigation.loadEventEnd - navigation.fetchStart;
              }
              observer.disconnect();
              resolve(lcp);
            }, 10000);
          });
        });

        console.log(`   LCP: ${lcpValue.toFixed(2)}ms`);

        // Assess LCP performance
        let lcpRating = "poor";
        if (lcpValue <= PERFORMANCE_THRESHOLDS.LCP.good) {
          lcpRating = "good";
        } else if (lcpValue <= PERFORMANCE_THRESHOLDS.LCP.needsImprovement) {
          lcpRating = "needs-improvement";
        }

        console.log(`   LCP Rating: ${lcpRating}`);

        performanceDiagnostics.metrics.LCP = lcpValue;

        if (lcpRating === "poor") {
          performanceDiagnostics.violations.push(
            `Poor LCP: ${lcpValue.toFixed(2)}ms (should be < ${PERFORMANCE_THRESHOLDS.LCP.good}ms)`
          );
        }

        console.log("   ✅ LCP measurement completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `LCP measurement failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ LCP testing failed");
      }
    });

    test("First Input Delay (FID) - Interactivity", async ({ page }) => {
      console.log("⚡ Testing First Input Delay (FID)...");

      await page.goto(BASE_URL);

      try {
        // Simulate user interaction to measure FID
        const fidValue = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            let fid = 0;

            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              for (const entry of entries) {
                const fidEntry = entry as any;
                if (fidEntry.processingStart > fidEntry.startTime) {
                  fid = fidEntry.processingStart - fidEntry.startTime;
                  break;
                }
              }
            });

            observer.observe({ entryTypes: ["first-input"] });

            // Simulate user interaction
            setTimeout(() => {
              const button = document.querySelector("button, a");
              if (button) {
                (button as HTMLElement).click();
              }
            }, 2000);

            // Resolve after interaction
            setTimeout(() => {
              observer.disconnect();
              resolve(fid);
            }, 5000);
          });
        });

        console.log(`   FID: ${fidValue.toFixed(2)}ms`);

        // Assess FID performance
        let fidRating = "poor";
        if (fidValue <= PERFORMANCE_THRESHOLDS.FID.good) {
          fidRating = "good";
        } else if (fidValue <= PERFORMANCE_THRESHOLDS.FID.needsImprovement) {
          fidRating = "needs-improvement";
        }

        console.log(`   FID Rating: ${fidRating}`);

        performanceDiagnostics.metrics.FID = fidValue;

        if (fidRating === "poor") {
          performanceDiagnostics.violations.push(
            `Poor FID: ${fidValue.toFixed(2)}ms (should be < ${PERFORMANCE_THRESHOLDS.FID.good}ms)`
          );
        }

        console.log("   ✅ FID measurement completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `FID measurement failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ FID testing failed");
      }
    });

    test("Cumulative Layout Shift (CLS) - Visual Stability", async ({
      page,
    }) => {
      console.log("📐 Testing Cumulative Layout Shift (CLS)...");

      await page.goto(BASE_URL);

      try {
        // Measure CLS using Performance API
        const clsValue = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            let cls = 0;

            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              for (const entry of entries) {
                if (!(entry as any).hadRecentInput) {
                  cls += (entry as any).value;
                }
              }
            });

            observer.observe({ entryTypes: ["layout-shift"] });

            // Wait for page interactions
            setTimeout(() => {
              observer.disconnect();
              resolve(cls);
            }, 8000);
          });
        });

        console.log(`   CLS: ${clsValue.toFixed(4)}`);

        // Assess CLS performance
        let clsRating = "poor";
        if (clsValue <= PERFORMANCE_THRESHOLDS.CLS.good) {
          clsRating = "good";
        } else if (clsValue <= PERFORMANCE_THRESHOLDS.CLS.needsImprovement) {
          clsRating = "needs-improvement";
        }

        console.log(`   CLS Rating: ${clsRating}`);

        performanceDiagnostics.metrics.CLS = clsValue;

        if (clsRating === "poor") {
          performanceDiagnostics.violations.push(
            `Poor CLS: ${clsValue.toFixed(4)} (should be < ${PERFORMANCE_THRESHOLDS.CLS.good})`
          );
        }

        console.log("   ✅ CLS measurement completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `CLS measurement failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ CLS testing failed");
      }
    });
  });

  test.describe("Page Load Performance - Speed Analysis", () => {
    test("Homepage Load Time - Overall Performance", async ({ page }) => {
      console.log("🏠 Testing Homepage Load Time...");

      const startTime = Date.now();

      await page.goto(BASE_URL, { waitUntil: "load" });

      const loadTime = Date.now() - startTime;
      console.log(`   Homepage load time: ${loadTime}ms`);

      // Assess load time
      let loadRating = "poor";
      if (loadTime <= PERFORMANCE_THRESHOLDS.homepageLoad.good) {
        loadRating = "good";
      } else if (
        loadTime <= PERFORMANCE_THRESHOLDS.homepageLoad.needsImprovement
      ) {
        loadRating = "needs-improvement";
      }

      console.log(`   Load time rating: ${loadRating}`);

      performanceDiagnostics.metrics.homepageLoad = loadTime;

      if (loadRating === "poor") {
        performanceDiagnostics.violations.push(
          `Slow homepage load: ${loadTime}ms (should be < ${PERFORMANCE_THRESHOLDS.homepageLoad.good}ms)`
        );
      }

      console.log("   ✅ Homepage load time measured");
    });

    test("First Contentful Paint (FCP) - Content Visibility", async ({
      page,
    }) => {
      console.log("🎨 Testing First Contentful Paint (FCP)...");

      await page.goto(BASE_URL);

      try {
        const fcpValue = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                resolve(entries[0].startTime);
              }
            });

            observer.observe({ entryTypes: ["paint"] });

            // Fallback timing
            setTimeout(() => {
              const navigation = performance.getEntriesByType(
                "navigation"
              )[0] as PerformanceNavigationTiming;
              resolve(navigation.responseEnd - navigation.fetchStart);
            }, 5000);
          });
        });

        console.log(`   FCP: ${fcpValue.toFixed(2)}ms`);

        // Assess FCP performance
        let fcpRating = "poor";
        if (fcpValue <= PERFORMANCE_THRESHOLDS.FCP.good) {
          fcpRating = "good";
        } else if (fcpValue <= PERFORMANCE_THRESHOLDS.FCP.needsImprovement) {
          fcpRating = "needs-improvement";
        }

        console.log(`   FCP Rating: ${fcpRating}`);

        performanceDiagnostics.metrics.FCP = fcpValue;

        if (fcpRating === "poor") {
          performanceDiagnostics.violations.push(
            `Poor FCP: ${fcpValue.toFixed(2)}ms (should be < ${PERFORMANCE_THRESHOLDS.FCP.good}ms)`
          );
        }

        console.log("   ✅ FCP measurement completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `FCP measurement failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ FCP testing failed");
      }
    });

    test("Time to Interactive (TTI) - Full Interactivity", async ({ page }) => {
      console.log("⚙️ Testing Time to Interactive (TTI)...");

      await page.goto(BASE_URL);

      try {
        const ttiValue = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            // Simple TTI estimation based on page load timing
            const navigation = performance.getEntriesByType(
              "navigation"
            )[0] as PerformanceNavigationTiming;
            const loadEventEnd = navigation.loadEventEnd;
            const domInteractive = navigation.domInteractive;

            // Estimate TTI as time when page becomes interactive
            const tti = Math.max(loadEventEnd, domInteractive + 1000); // Add buffer for script execution
            resolve(tti);
          });
        });

        console.log(`   TTI: ${ttiValue.toFixed(2)}ms`);

        // Assess TTI performance
        let ttiRating = "poor";
        if (ttiValue <= PERFORMANCE_THRESHOLDS.TTI.good) {
          ttiRating = "good";
        } else if (ttiValue <= PERFORMANCE_THRESHOLDS.TTI.needsImprovement) {
          ttiRating = "needs-improvement";
        }

        console.log(`   TTI Rating: ${ttiRating}`);

        performanceDiagnostics.metrics.TTI = ttiValue;

        if (ttiRating === "poor") {
          performanceDiagnostics.violations.push(
            `Poor TTI: ${ttiValue.toFixed(2)}ms (should be < ${PERFORMANCE_THRESHOLDS.TTI.good}ms)`
          );
        }

        console.log("   ✅ TTI measurement completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `TTI measurement failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ TTI testing failed");
      }
    });
  });

  test.describe("API Performance - Backend Response Times", () => {
    test("API Response Times - Health Check", async ({ page }) => {
      console.log("🏥 Testing API Response Times...");

      const startTime = Date.now();

      try {
        const response = await page.request.get(`${BASE_URL}/api/health`);
        const responseTime = Date.now() - startTime;

        console.log(`   Health check response time: ${responseTime}ms`);
        console.log(`   Response status: ${response.status()}`);

        // Assess API response time
        let apiRating = "poor";
        if (responseTime <= PERFORMANCE_THRESHOLDS.apiResponse.good) {
          apiRating = "good";
        } else if (
          responseTime <= PERFORMANCE_THRESHOLDS.apiResponse.needsImprovement
        ) {
          apiRating = "needs-improvement";
        }

        console.log(`   API response rating: ${apiRating}`);

        performanceDiagnostics.metrics.apiResponse = responseTime;

        if (apiRating === "poor") {
          performanceDiagnostics.violations.push(
            `Slow API response: ${responseTime}ms (should be < ${PERFORMANCE_THRESHOLDS.apiResponse.good}ms)`
          );
        }

        console.log("   ✅ API response time measured");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `API response test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ API response testing failed");
      }
    });

    test("Search Performance - Query Response Times", async ({ page }) => {
      console.log("🔍 Testing Search Performance...");

      await page.goto(`${BASE_URL}/dashboard`);

      try {
        // Look for search functionality
        const searchInput = page.locator(
          'input[type="search"], input[placeholder*="search"], [data-testid*="search"]'
        );

        if ((await searchInput.count()) > 0) {
          const startTime = Date.now();

          // Perform search
          await searchInput.first().fill("test query");
          await searchInput.first().press("Enter");

          // Wait for search results
          await page.waitForTimeout(2000);
          const searchTime = Date.now() - startTime;

          console.log(`   Search response time: ${searchTime}ms`);

          // Assess search performance
          let searchRating = "poor";
          if (searchTime <= PERFORMANCE_THRESHOLDS.searchResponse.good) {
            searchRating = "good";
          } else if (
            searchTime <= PERFORMANCE_THRESHOLDS.searchResponse.needsImprovement
          ) {
            searchRating = "needs-improvement";
          }

          console.log(`   Search performance rating: ${searchRating}`);

          performanceDiagnostics.metrics.searchResponse = searchTime;

          if (searchRating === "poor") {
            performanceDiagnostics.violations.push(
              `Slow search: ${searchTime}ms (should be < ${PERFORMANCE_THRESHOLDS.searchResponse.good}ms)`
            );
          }

          console.log("   ✅ Search performance measured");
        } else {
          console.log("   No search functionality found");
          console.log("   ✅ No search to test");
        }
      } catch (error) {
        performanceDiagnostics.violations.push(
          `Search performance test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Search performance testing failed");
      }
    });
  });

  test.describe("Resource Loading - Asset Optimization", () => {
    test("Resource Loading Analysis - Bundle Sizes", async ({ page }) => {
      console.log("📦 Testing Resource Loading...");

      await page.goto(BASE_URL);

      try {
        // Analyze loaded resources
        const resources = await page.evaluate(() => {
          const entries = performance.getEntriesByType("resource");
          const resourceStats = {
            totalSize: 0,
            jsSize: 0,
            cssSize: 0,
            imageSize: 0,
            fontSize: 0,
            otherSize: 0,
            requestCount: entries.length,
          };

          entries.forEach((entry: any) => {
            const size = entry.transferSize || 0;
            resourceStats.totalSize += size;

            if (entry.name.includes(".js")) {
              resourceStats.jsSize += size;
            } else if (entry.name.includes(".css")) {
              resourceStats.cssSize += size;
            } else if (/\.(jpg|jpeg|png|gif|webp|svg)/.test(entry.name)) {
              resourceStats.imageSize += size;
            } else if (/\.(woff|woff2|ttf|eot)/.test(entry.name)) {
              resourceStats.fontSize += size;
            } else {
              resourceStats.otherSize += size;
            }
          });

          return resourceStats;
        });

        console.log(`   Total resources: ${resources.requestCount}`);
        console.log(
          `   Total size: ${(resources.totalSize / 1024 / 1024).toFixed(2)} MB`
        );
        console.log(
          `   JavaScript: ${(resources.jsSize / 1024 / 1024).toFixed(2)} MB`
        );
        console.log(
          `   CSS: ${(resources.cssSize / 1024 / 1024).toFixed(2)} MB`
        );
        console.log(
          `   Images: ${(resources.imageSize / 1024 / 1024).toFixed(2)} MB`
        );
        console.log(
          `   Fonts: ${(resources.fontSize / 1024 / 1024).toFixed(2)} MB`
        );

        // Performance recommendations
        if (resources.totalSize > 5 * 1024 * 1024) {
          // 5MB
          performanceDiagnostics.recommendations.push(
            "Consider reducing total page size (currently > 5MB)"
          );
        }

        if (resources.jsSize > 2 * 1024 * 1024) {
          // 2MB
          performanceDiagnostics.recommendations.push(
            "Consider code splitting to reduce JavaScript bundle size"
          );
        }

        if (resources.imageSize > 1 * 1024 * 1024) {
          // 1MB
          performanceDiagnostics.recommendations.push(
            "Consider image optimization and lazy loading"
          );
        }

        console.log("   ✅ Resource loading analyzed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `Resource analysis failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Resource loading testing failed");
      }
    });

    test("Caching Analysis - Cache Headers", async ({ page }) => {
      console.log("💾 Testing Caching Analysis...");

      await page.goto(BASE_URL);

      try {
        // Analyze cache headers for static resources
        const cacheAnalysis = await page.evaluate(() => {
          const entries = performance.getEntriesByType("resource");
          const cacheStats = {
            cachedResources: 0,
            totalResources: entries.length,
            cacheHitRatio: 0,
          };

          entries.forEach((entry: any) => {
            // Check if resource was served from cache
            if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
              cacheStats.cachedResources++;
            }
          });

          cacheStats.cacheHitRatio =
            cacheStats.totalResources > 0
              ? (cacheStats.cachedResources / cacheStats.totalResources) * 100
              : 0;

          return cacheStats;
        });

        console.log(
          `   Cache hit ratio: ${cacheAnalysis.cacheHitRatio.toFixed(1)}%`
        );
        console.log(
          `   Cached resources: ${cacheAnalysis.cachedResources}/${cacheAnalysis.totalResources}`
        );

        // Assess caching effectiveness
        if (cacheAnalysis.cacheHitRatio < 50) {
          performanceDiagnostics.recommendations.push(
            "Consider improving cache headers for better performance"
          );
        }

        console.log("   ✅ Caching analysis completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `Cache analysis failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Caching analysis failed");
      }
    });
  });

  test.describe("Load Testing - Concurrent User Simulation", () => {
    test("Concurrent User Load - Basic Load Test", async ({ page }) => {
      console.log("👥 Testing Concurrent User Load...");

      // Simple load test with multiple concurrent requests
      const concurrentRequests = 10;
      const requestPromises = [];

      console.log(
        `   Testing with ${concurrentRequests} concurrent requests...`
      );

      const startTime = Date.now();

      // Create multiple concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(page.request.get(`${BASE_URL}/api/health`));
      }

      try {
        const responses = await Promise.all(requestPromises);
        const totalTime = Date.now() - startTime;

        const successfulRequests = responses.filter(
          (r) => r.status() === 200
        ).length;
        const failedRequests = concurrentRequests - successfulRequests;

        console.log(`   Total time: ${totalTime}ms`);
        console.log(
          `   Successful requests: ${successfulRequests}/${concurrentRequests}`
        );
        console.log(`   Failed requests: ${failedRequests}`);

        const successRate = (successfulRequests / concurrentRequests) * 100;
        console.log(`   Success rate: ${successRate.toFixed(1)}%`);

        // Assess load handling
        if (successRate < 90) {
          performanceDiagnostics.violations.push(
            `Poor concurrent load handling: ${successRate.toFixed(1)}% success rate`
          );
        }

        console.log("   ✅ Concurrent load test completed");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `Load test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Load testing failed");
      }
    });

    test("Memory Usage - Client-side Performance", async ({ page }) => {
      console.log("🧠 Testing Memory Usage...");

      await page.goto(BASE_URL);

      try {
        // Monitor memory usage over time
        const memoryUsage = await page.evaluate(() => {
          const memInfo = (performance as any).memory;
          return {
            used: memInfo?.usedJSHeapSize || 0,
            total: memInfo?.totalJSHeapSize || 0,
            limit: memInfo?.jsHeapSizeLimit || 0,
          };
        });

        const usedMB = (memoryUsage.used / 1024 / 1024).toFixed(2);
        const totalMB = (memoryUsage.total / 1024 / 1024).toFixed(2);
        const limitMB = (memoryUsage.limit / 1024 / 1024).toFixed(2);

        console.log(`   Memory used: ${usedMB} MB`);
        console.log(`   Memory total: ${totalMB} MB`);
        console.log(`   Memory limit: ${limitMB} MB`);

        const usagePercentage = (memoryUsage.used / memoryUsage.limit) * 100;
        console.log(`   Memory usage: ${usagePercentage.toFixed(1)}%`);

        // Check for memory issues
        if (usagePercentage > 80) {
          performanceDiagnostics.recommendations.push(
            "High memory usage detected - consider optimization"
          );
        }

        console.log("   ✅ Memory usage monitored");
      } catch (error) {
        performanceDiagnostics.violations.push(
          `Memory monitoring failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Memory usage testing failed");
      }
    });
  });

  test.describe("Performance Audit Summary - Overall Assessment", () => {
    test("Performance Audit Summary", async ({ page }) => {
      console.log("📊 Generating Performance Audit Summary...");

      await page.goto(BASE_URL);

      try {
        // Compile audit results
        const auditResults = {
          metrics: performanceDiagnostics.metrics,
          violations: performanceDiagnostics.violations.length,
          recommendations: performanceDiagnostics.recommendations.length,
          totalIssues:
            performanceDiagnostics.violations.length +
            performanceDiagnostics.recommendations.length,
        };

        console.log("\n=== PERFORMANCE AUDIT SUMMARY ===");

        // Display Core Web Vitals
        console.log("\n🎯 Core Web Vitals:");
        Object.entries(performanceDiagnostics.metrics).forEach(
          ([metric, value]) => {
            if (["LCP", "FID", "CLS"].includes(metric)) {
              const thresholds =
                PERFORMANCE_THRESHOLDS[
                  metric as keyof typeof PERFORMANCE_THRESHOLDS
                ];
              const rating =
                value <= thresholds.good
                  ? "✅ Good"
                  : value <= (thresholds as any).needsImprovement
                    ? "⚠️ Needs Improvement"
                    : "❌ Poor";
              console.log(`   ${metric}: ${value.toFixed(2)}ms - ${rating}`);
            }
          }
        );

        // Display other metrics
        console.log("\n📈 Additional Metrics:");
        Object.entries(performanceDiagnostics.metrics).forEach(
          ([metric, value]) => {
            if (!["LCP", "FID", "CLS"].includes(metric)) {
              console.log(`   ${metric}: ${value}ms`);
            }
          }
        );

        console.log(`\n🚨 Performance Violations: ${auditResults.violations}`);
        console.log(`💡 Recommendations: ${auditResults.recommendations}`);
        console.log(`📋 Total Issues: ${auditResults.totalIssues}`);

        // Overall performance score
        const goodMetrics = Object.entries(
          performanceDiagnostics.metrics
        ).filter(([metric, value]) => {
          const thresholds =
            PERFORMANCE_THRESHOLDS[
              metric as keyof typeof PERFORMANCE_THRESHOLDS
            ];
          return value <= thresholds.good;
        }).length;

        const totalMetrics = Object.keys(performanceDiagnostics.metrics).length;
        const performanceScore =
          totalMetrics > 0 ? (goodMetrics / totalMetrics) * 100 : 0;

        console.log(
          `\n🏆 Performance Score: ${performanceScore.toFixed(1)}% (${goodMetrics}/${totalMetrics} metrics good)`
        );

        // List violations
        if (performanceDiagnostics.violations.length > 0) {
          console.log("\n🚨 VIOLATIONS:");
          performanceDiagnostics.violations.forEach((violation, index) => {
            console.log(`   ${index + 1}. ${violation}`);
          });
        }

        // List recommendations
        if (performanceDiagnostics.recommendations.length > 0) {
          console.log("\n💡 RECOMMENDATIONS:");
          performanceDiagnostics.recommendations.forEach(
            (recommendation, index) => {
              console.log(`   ${index + 1}. ${recommendation}`);
            }
          );
        }

        console.log("\n✅ Performance audit completed");

        // Overall assessment
        const goodPerformance = performanceScore >= 80;
        console.log(`Good performance: ${goodPerformance}`);
      } catch (error) {
        console.log("❌ Performance audit summary failed");
        console.log(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  });
});
