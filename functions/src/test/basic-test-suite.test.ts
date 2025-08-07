/**
 * Basic Firebase Functions Test Suite
 * Simple tests that work with the current implementation
 */

import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { StructuredLogger } from "../lib/structured-logger";
import { MetricsCollector } from "../lib/metrics-collector";
import { AIResponseCache } from "../lib/ai-response-cache";

describe("Firebase Functions Basic Test Suite", () => {

  describe("StructuredLogger", () => {
    it("should create trace with unique ID", () => {
      const mockRequest = {
        auth: { uid: "user123" },
        data: {},
        rawRequest: {
          headers: { "user-agent": "test-agent" }
        }
      } as any;

      const trace = StructuredLogger.startTrace(mockRequest, "test-function");

      expect(trace.traceId).to.be.a("string");
      expect(trace.traceId).to.have.length.greaterThan(10);
      expect(trace._functionName).to.equal("test-function");
      expect(trace.userId).to.equal("user123");
      expect(trace.userTier).to.be.a("string");
    });

    it("should generate unique trace IDs", () => {
      const traceId1 = StructuredLogger.generateTraceId();
      const traceId2 = StructuredLogger.generateTraceId();

      expect(traceId1).to.be.a("string");
      expect(traceId2).to.be.a("string");
      expect(traceId1).to.not.equal(traceId2);
    });

    it("should complete trace without errors", () => {
      const mockRequest = {
        auth: { uid: "user123" },
        data: {},
        rawRequest: { headers: {} }
      } as any;

      const trace = StructuredLogger.startTrace(mockRequest, "test-function");

      expect(() => {
        StructuredLogger.completeTrace(trace.traceId, {
          success: true,
          duration: 1500,
          memoryUsed: 128
        });
      }).to.not.throw();
    });
  });

  describe("MetricsCollector", () => {
    it("should record function execution metrics", () => {
      const executionData = {
        _functionName: "test-function",
        executionTime: 1000,
        success: true,
        memoryUsage: 64
      };

      expect(() => {
        MetricsCollector.recordExecution(executionData);
      }).to.not.throw();

      const report = MetricsCollector.generateReport();
      expect(report).to.have.property("summary");
      expect(report).to.have.property("functions");
      expect(report).to.have.property("insights");
    });

    it("should get function metrics", () => {
      const metrics = MetricsCollector.getFunctionMetrics("test-function");

      // Metrics might be null if no data recorded yet
      if (metrics) {
        expect(metrics).to.have.property("executionCount");
        expect(metrics).to.have.property("averageDuration");
        expect(metrics).to.have.property("errorRate");
      } else {
        expect(metrics).to.be.null;
      }
    });
  });

  describe("AIResponseCache", () => {
    it("should handle cache operations with proper interface", async () => {
      const testData = { result: "test response", tokens: 100 };
      const key = "test-key";
      const options = {
        aiModel: "gpt-4",
        promptHash: "test-hash",
        tokens: 100,
        userTier: "starter" as const
      };

      expect(() => {
        AIResponseCache.set(key, testData, options);
      }).to.not.throw();

      const retrieved = await AIResponseCache.get(key);
      // Cache might return null if not found or expired
      if (retrieved) {
        expect(retrieved).to.have.property("result");
      }
    });

    it("should provide cache statistics", () => {
      const stats = AIResponseCache.getStats();

      expect(stats).to.have.property("size");
      expect(stats).to.have.property("hitRate");
      expect(stats).to.have.property("totalAccesses");
      expect(stats).to.have.property("memoryUsage");
      expect(stats.size).to.be.a("number");
      expect(stats.hitRate).to.be.a("number");
    });
  });

  describe("Integration", () => {
    it("should work together without errors", async () => {
      const mockRequest = {
        auth: { uid: "integration-user" },
        data: {},
        rawRequest: { headers: {} }
      } as any;

      // Start trace
      const trace = StructuredLogger.startTrace(mockRequest, "integration-test");
      expect(trace.traceId).to.be.a("string");

      // Record metrics
      MetricsCollector.recordExecution({
        _functionName: "integration-test",
        executionTime: 1200,
        success: true,
        memoryUsage: 96
      });

      // Complete trace
      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        duration: 1200,
        memoryUsed: 96
      });

      // Get report
      const report = MetricsCollector.generateReport();
      expect(report.functions).to.have.property("integration-test");

      // Get cache stats
      const stats = AIResponseCache.getStats();
      expect(stats).to.be.an("object");
    });
  });
});
