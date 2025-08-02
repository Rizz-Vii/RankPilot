/**
 * Memory Optimization Utilities for AI-Heavy Tests
 * Handles process cleanup, memory management, and resource optimization
 */

import { Page, Browser } from "@playwright/test";

export class MemoryOptimizer {
    private page: Page;
    private cleanupTasks: (() => Promise<void>)[] = [];

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Initialize memory optimization for AI-heavy pages
     */
    async initialize(): Promise<void> {
        // Set memory-efficient headers
        await this.page.setExtraHTTPHeaders({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        // Register cleanup on page events
        this.page.on('close', this.cleanup.bind(this));
        this.page.on('crash', this.emergencyCleanup.bind(this));
    }

    /**
     * Force garbage collection and memory cleanup
     */
    async forceGarbageCollection(): Promise<void> {
        try {
            await this.page.evaluate(() => {
                // Force garbage collection if available
                if (typeof window !== 'undefined' && (window as any).gc) {
                    (window as any).gc();
                }

                // Clear intervals and timeouts
                for (let i = 1; i < 99999; i++) {
                    window.clearTimeout(_i);
                    window.clearInterval(_i);
                }

                // Clear any cached data
                if (typeof window !== 'undefined' && window.caches) {
                    window.caches.keys().then(names => {
                        names.forEach(name => window.caches.delete(name));
                    });
                }
            });
        } catch (_error) {
            console.log(`⚠️ Garbage collection warning: ${error}`);
        }
    }

    /**
     * Optimize page for AI-heavy operations
     */
    async optimizeForAI(): Promise<void> {
        await this.page.evaluate(() => {
            // Disable automatic resource loading
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Cache-Control';
            meta.content = 'no-cache, no-store, must-revalidate';
            document.head.appendChild(meta);

            // Optimize memory for AI processing
            if ('performance' in window && 'memory' in (window.performance as any)) {
                console.log('Memory usage before optimization:', (window.performance as any).memory);
            }
        });
    }

    /**
     * Add a cleanup task to be executed later
     */
    addCleanupTask(task: () => Promise<void>): void {
        this.cleanupTasks.push(task);
    }

    /**
     * Execute all cleanup tasks
     */
    async cleanup(): Promise<void> {
        console.log(`🧹 Executing ${this.cleanupTasks.length} cleanup tasks...`);

        for (const task of this.cleanupTasks) {
            try {
                await task();
            } catch (_error) {
                console.log(`⚠️ Cleanup task _error: ${error}`);
            }
        }

        // Final garbage collection
        await this.forceGarbageCollection();
        this.cleanupTasks = [];
    }

    /**
     * Emergency cleanup for crashed pages
     */
    async emergencyCleanup(): Promise<void> {
        console.log('🚨 Emergency cleanup initiated due to page crash');

        try {
            // Force immediate cleanup without waiting for tasks
            await this.forceGarbageCollection();
            this.cleanupTasks = [];
        } catch (_error) {
            console.log(`⚠️ Emergency cleanup _error: ${error}`);
        }
    }

    /**
     * Monitor memory usage during test execution
     */
    async monitorMemory(): Promise<void> {
        try {
            const memoryInfo = await this.page.evaluate(() => {
                if ('performance' in window && 'memory' in (window.performance as any)) {
                    const memory = (window.performance as any).memory;
                    return {
                        usedJSHeapSize: memory.usedJSHeapSize,
                        totalJSHeapSize: memory.totalJSHeapSize,
                        jsHeapSizeLimit: memory.jsHeapSizeLimit
                    };
                }
                return null;
            });

            if (memoryInfo) {
                const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024);

                console.log(`📊 Memory: ${usedMB}MB used, ${totalMB}MB total, ${limitMB}MB limit`);

                // Trigger cleanup if memory usage is high
                if (usedMB > limitMB * 0.8) {
                    console.log('🚨 High memory usage detected, triggering cleanup...');
                    await this.forceGarbageCollection();
                }
            }
        } catch (_error) {
            console.log(`⚠️ Memory monitoring _error: ${error}`);
        }
    }

    /**
     * Create a memory-efficient page navigation strategy
     */
    async navigateWithOptimization(url: string, options: { timeout?: number } = {}): Promise<void> {
        const { timeout = 20000 } = options;

        // Pre-navigation cleanup
        await this.forceGarbageCollection();

        // Navigate with optimized settings
        await this.page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout
        });

        // Post-navigation optimization
        await this.page.waitForTimeout(2000);
        await this.optimizeForAI();
        await this.monitorMemory();
    }
}

/**
 * Process Manager for test execution
 */
export class ProcessManager {
    private static instance: ProcessManager;
    private activeProcesses: Set<number> = new Set();

    static getInstance(): ProcessManager {
        if (!ProcessManager.instance) {
            ProcessManager.instance = new ProcessManager();
        }
        return ProcessManager.instance;
    }

    /**
     * Register a process for tracking
     */
    registerProcess(pid: number): void {
        this.activeProcesses.add(pid);
    }

    /**
     * Kill all tracked processes
     */
    async killAllProcesses(): Promise<void> {
        console.log(`🔪 Killing ${this.activeProcesses.size} tracked processes...`);

        Array.from(this.activeProcesses).forEach((pid) => {
            try {
                process.kill(pid, 'SIGTERM');
                console.log(`✅ Killed process ${pid}`);
            } catch (_error) {
                console.log(`⚠️ Failed to kill process ${pid}: ${error}`);
            }
        });

        this.activeProcesses.clear();
    }

    /**
     * Force kill any remaining test processes
     */
    async forceKillTestProcesses(): Promise<void> {
        try {
            // Kill any remaining playwright/test processes
            const { exec } = require('child_process');
            await new Promise<void>((resolve) => {
                exec('pkill -f "playwright|npm.*test" || true', () => {
                    console.log('✅ Force killed test processes');
                    resolve();
                });
            });
        } catch (_error) {
            console.log(`⚠️ Force kill _error: ${error}`);
        }
    }
}
