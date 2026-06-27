/**
 * MetricsCollector — in-memory execution metrics for Firebase Functions.
 */

interface FunctionMetrics {
  executionCount: number;
  errorCount: number;
  errorRate: number;
  averageDuration: number;
  totalDuration: number;
  memoryPeak: number;
  lastExecution: number;
  businessMetrics: {
    aiTokensConsumed: number;
    cacheHitRate: number;
    userRequestsByTier: Record<string, number>;
  };
}

interface MetricsReport {
  summary: Record<string, unknown>;
  functions: Record<string, FunctionMetrics>;
  insights: string[];
}

const store = new Map<string, FunctionMetrics>();

function defaultMetrics(): FunctionMetrics {
  return {
    executionCount: 0,
    errorCount: 0,
    errorRate: 0,
    averageDuration: 0,
    totalDuration: 0,
    memoryPeak: 0,
    lastExecution: 0,
    businessMetrics: {
      aiTokensConsumed: 0,
      cacheHitRate: 0,
      userRequestsByTier: {},
    },
  };
}

export class MetricsCollector {
  static recordExecution(data: {
    _functionName: string;
    executionTime: number;
    success: boolean;
    memoryUsage: number;
  }): void {
    const m = store.get(data._functionName) ?? defaultMetrics();
    m.executionCount += 1;
    if (!data.success) m.errorCount += 1;
    m.totalDuration += data.executionTime;
    m.averageDuration = m.totalDuration / m.executionCount;
    m.errorRate = m.errorCount / m.executionCount;
    if (data.memoryUsage > m.memoryPeak) m.memoryPeak = data.memoryUsage;
    m.lastExecution = Date.now();
    store.set(data._functionName, m);
  }

  static getFunctionMetrics(functionName: string): FunctionMetrics | null {
    return store.get(functionName) ?? null;
  }

  static generateReport(): MetricsReport {
    const functions = Object.fromEntries(store.entries());
    const totalExec = [...store.values()].reduce(
      (s, m) => s + m.executionCount,
      0
    );
    const totalErr = [...store.values()].reduce((s, m) => s + m.errorCount, 0);
    const insights: string[] = [];
    for (const [name, m] of store.entries()) {
      if (m.errorRate > 0.1)
        insights.push(
          `High error rate on ${name}: ${(m.errorRate * 100).toFixed(1)}%`
        );
      if (m.averageDuration > 5000)
        insights.push(`Slow function ${name}: avg ${m.averageDuration}ms`);
    }
    return {
      summary: {
        totalExecutions: totalExec,
        totalErrors: totalErr,
        functionsTracked: store.size,
      },
      functions,
      insights,
    };
  }
}
