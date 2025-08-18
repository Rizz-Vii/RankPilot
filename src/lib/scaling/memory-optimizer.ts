/**
 * Dynamic Memory Allocation for Firebase Functions
 * Optimizes memory usage based on workload requirements
 */

interface MemoryConfig {
  component: string;
  memoryMB: number;
  timeoutSeconds: number;
  maxInstances: number;
}

export const memoryConfigurations: Record<string, MemoryConfig> = {
  'neuroseo-light': {
    component: 'NeuroSEO Light Analysis',
    memoryMB: 1024,
    timeoutSeconds: 60,
    maxInstances: 20,
  },
  'neuroseo-standard': {
    component: 'NeuroSEO Standard Analysis',
    memoryMB: 2048,
    timeoutSeconds: 180,
    maxInstances: 10,
  },
  'neuroseo-comprehensive': {
    component: 'NeuroSEO Comprehensive Analysis',
    memoryMB: 4096,
    timeoutSeconds: 300,
    maxInstances: 5,
  },
  'neuroseo-enterprise': {
    component: 'NeuroSEO Enterprise Analysis',
    memoryMB: 8192,
    timeoutSeconds: 600,
    maxInstances: 3,
  },
  'keyword-batch': {
    component: 'Bulk Keyword Processing',
    memoryMB: 2048,
    timeoutSeconds: 240,
    maxInstances: 8,
  },
  'competitor-analysis': {
    component: 'Competitor Analysis Engine',
    memoryMB: 3072,
    timeoutSeconds: 420,
    maxInstances: 6,
  },
};

export class MemoryOptimizer {
  /**
   * Get optimal memory configuration based on analysis type and user tier
   */
  static getOptimalConfig(
    _analysisType: string,
    userTier: 'free' | 'starter' | 'agency' | 'enterprise' | 'admin',
    complexity: 'low' | 'medium' | 'high' = 'medium'
  ): MemoryConfig {
    let baseConfig = memoryConfigurations['neuroseo-standard'];

    // Adjust based on analysis complexity
    if (complexity === 'high' || userTier === 'enterprise' || userTier === 'admin') {
      baseConfig = memoryConfigurations['neuroseo-comprehensive'];
    } else if (complexity === 'low' && (userTier === 'free' || userTier === 'starter')) {
      baseConfig = memoryConfigurations['neuroseo-light'];
    }

    // Enterprise users get dedicated high-memory instances
    if (userTier === 'enterprise' || userTier === 'admin') {
      return {
        ...baseConfig,
        memoryMB: memoryConfigurations['neuroseo-enterprise'].memoryMB,
        maxInstances: memoryConfigurations['neuroseo-enterprise'].maxInstances,
      };
    }

    return baseConfig;
  }

  /**
   * Generate Firebase Functions configuration based on memory requirements
   */
  static generateFunctionConfig(config: MemoryConfig) {
    return {
      memory: `${config.memoryMB}MB` as const,
      timeoutSeconds: config.timeoutSeconds,
      maxInstances: config.maxInstances,
      minInstances: 0,
      cpu: config.memoryMB >= 4096 ? 2 : 1,
    };
  }

  /**
   * Monitor memory usage and suggest optimizations
   */
  static analyzeMemoryUsage(metrics: {
    peakMemoryMB: number;
    averageMemoryMB: number;
    executionTimeMs: number;
    errorRate: number;
  }) {
    const suggestions = [];

    if (metrics.peakMemoryMB > metrics.averageMemoryMB * 2) {
      suggestions.push('Consider memory optimization - peak usage is high');
    }

    if (metrics.executionTimeMs > 60000 && metrics.peakMemoryMB < 2048) {
      suggestions.push('Increase memory allocation for better performance');
    }

    if (metrics.errorRate > 0.05) {
      suggestions.push('High error rate detected - check memory limits');
    }

    return {
      optimizationScore: this.calculateOptimizationScore(metrics),
      suggestions,
      recommendedConfig: this.getRecommendedConfig(metrics),
    };
  }

  private static calculateOptimizationScore(metrics: {
    peakMemoryMB: number;
    averageMemoryMB: number;
    executionTimeMs: number;
    errorRate: number;
  }): number {
    let score = 100;

    // Penalize high memory variance
    const memoryVariance = metrics.peakMemoryMB / metrics.averageMemoryMB;
    if (memoryVariance > 2) score -= 20;

    // Penalize long execution times
    if (metrics.executionTimeMs > 120000) score -= 15;

    // Penalize errors
    score -= metrics.errorRate * 100;

    return Math.max(0, score);
  }

  private static getRecommendedConfig(metrics: {
    peakMemoryMB: number;
    averageMemoryMB: number;
    executionTimeMs: number;
    errorRate: number;
  }): MemoryConfig {
    const targetMemory = Math.ceil(metrics.peakMemoryMB * 1.2); // 20% buffer
    
    const configKey = Object.keys(memoryConfigurations).find(key => 
      memoryConfigurations[key].memoryMB >= targetMemory
    ) || 'neuroseo-enterprise';

    return memoryConfigurations[configKey];
  }
}
