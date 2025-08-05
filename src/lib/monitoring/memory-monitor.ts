/**
 * Memory Monitor - Production Memory Leak Detection and Monitoring
 * Helps track memory usage patterns and detect potential leaks
 */

export interface MemoryStats {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    timestamp: number;
}

export interface MemoryAlert {
    type: 'warning' | 'critical';
    message: string;
    stats: MemoryStats;
    timestamp: number;
}

export class MemoryMonitor {
    private static instance: MemoryMonitor | null = null;
    private monitoringInterval: ReturnType<typeof setInterval> | null = null;
    private memoryHistory: MemoryStats[] = [];
    private alertThresholds = {
        warning: 100 * 1024 * 1024, // 100MB
        critical: 200 * 1024 * 1024, // 200MB
    };
    private maxHistoryLength = 100; // Keep last 100 readings

    private constructor() {
        // Private constructor for singleton
    }

    static getInstance(): MemoryMonitor {
        if (!MemoryMonitor.instance) {
            MemoryMonitor.instance = new MemoryMonitor();
        }
        return MemoryMonitor.instance;
    }

    /**
     * Start memory monitoring
     */
    startMonitoring(intervalMs: number = 30000): void {
        if (this.monitoringInterval || typeof window === 'undefined' || !('memory' in performance)) {
            return;
        }

        console.log('[MemoryMonitor] Starting memory monitoring...');

        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, intervalMs);

        // Initial check
        this.checkMemoryUsage();
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('[MemoryMonitor] Memory monitoring stopped');
        }
    }

    /**
     * Get current memory stats
     */
    getCurrentMemoryStats(): MemoryStats | null {
        if (typeof window === 'undefined' || !('memory' in performance)) {
            return null;
        }

        const memory = (performance as any).memory;
        return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            timestamp: Date.now(),
        };
    }

    /**
     * Get memory usage trend
     */
    getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' {
        if (this.memoryHistory.length < 5) {
            return 'insufficient_data';
        }

        const recent = this.memoryHistory.slice(-5);
        const first = recent[0].usedJSHeapSize;
        const last = recent[recent.length - 1].usedJSHeapSize;
        const change = last - first;
        const threshold = 5 * 1024 * 1024; // 5MB threshold

        if (change > threshold) return 'increasing';
        if (change < -threshold) return 'decreasing';
        return 'stable';
    }

    /**
     * Get memory history
     */
    getMemoryHistory(): MemoryStats[] {
        return [...this.memoryHistory];
    }

    /**
     * Check memory usage and emit alerts if needed
     */
    private checkMemoryUsage(): void {
        const stats = this.getCurrentMemoryStats();
        if (!stats) return;

        // Add to history
        this.memoryHistory.push(stats);
        if (this.memoryHistory.length > this.maxHistoryLength) {
            this.memoryHistory.shift();
        }

        const usedMB = stats.usedJSHeapSize / (1024 * 1024);

        // Check for alerts
        if (stats.usedJSHeapSize > this.alertThresholds.critical) {
            this.emitAlert({
                type: 'critical',
                message: `Critical memory usage: ${usedMB.toFixed(2)}MB`,
                stats,
                timestamp: Date.now(),
            });
        } else if (stats.usedJSHeapSize > this.alertThresholds.warning) {
            this.emitAlert({
                type: 'warning',
                message: `High memory usage: ${usedMB.toFixed(2)}MB`,
                stats,
                timestamp: Date.now(),
            });
        }

        // Log periodic memory stats
        if (this.memoryHistory.length % 10 === 0) {
            const trend = this.getMemoryTrend();
            console.log(`[MemoryMonitor] Memory: ${usedMB.toFixed(2)}MB, Trend: ${trend}`);
        }
    }

    /**
     * Emit memory alert
     */
    private emitAlert(alert: MemoryAlert): void {
        console.warn(`[MemoryMonitor] ${alert.type.toUpperCase()}: ${alert.message}`);

        // Emit custom event for listeners
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('memoryAlert', {
                detail: alert
            }));
        }
    }

    /**
     * Force garbage collection if available (dev/debug only)
     */
    forceGarbageCollection(): void {
        if (typeof window !== 'undefined' && 'gc' in window) {
            console.log('[MemoryMonitor] Forcing garbage collection...');
            (window as any).gc();
        } else {
            console.warn('[MemoryMonitor] Garbage collection not available');
        }
    }

    /**
     * Get memory usage summary
     */
    getSummary(): {
        current: MemoryStats | null;
        trend: string;
        averageUsage: number;
        peakUsage: number;
        historyCount: number;
    } {
        const current = this.getCurrentMemoryStats();
        const trend = this.getMemoryTrend();

        let averageUsage = 0;
        let peakUsage = 0;

        if (this.memoryHistory.length > 0) {
            averageUsage = this.memoryHistory.reduce((sum, stat) => sum + stat.usedJSHeapSize, 0) / this.memoryHistory.length;
            peakUsage = Math.max(...this.memoryHistory.map(stat => stat.usedJSHeapSize));
        }

        return {
            current,
            trend,
            averageUsage: averageUsage / (1024 * 1024), // Convert to MB
            peakUsage: peakUsage / (1024 * 1024), // Convert to MB
            historyCount: this.memoryHistory.length,
        };
    }

    /**
     * Clean up monitor resources
     */
    dispose(): void {
        this.stopMonitoring();
        this.memoryHistory = [];
        console.log('[MemoryMonitor] Disposed');
    }
}

// Global instance
export const memoryMonitor = MemoryMonitor.getInstance();

// Auto-start monitoring in browser
if (typeof window !== 'undefined') {
    // Start monitoring when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            memoryMonitor.startMonitoring();
        });
    } else {
        memoryMonitor.startMonitoring();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        memoryMonitor.dispose();
    });
}
