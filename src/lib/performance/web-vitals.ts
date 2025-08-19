/**
 * Core Web Vitals Enhancement System
 * RankPilot - Advanced Performance Monitoring & Optimization
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface WebVitalsMetric extends Metric {
    timestamp: number;
}

export interface WebVitalsState {
    cls: WebVitalsMetric | null;
    inp: WebVitalsMetric | null;
    fcp: WebVitalsMetric | null;
    lcp: WebVitalsMetric | null;
    ttfb: WebVitalsMetric | null;
    overallScore: number;
    isLoading: boolean;
}

/**
 * Performance enhancement utilities
 */
export const performanceUtils = {
    // Prefetch critical resources
    prefetchResource: (href: string, as: 'script' | 'style' | 'image' | 'fetch' = 'fetch') => {
        if (typeof window !== 'undefined') {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            link.as = as;
            document.head.appendChild(link);
        }
    },

    // Preload critical resources
    preloadResource: (href: string, as: 'script' | 'style' | 'image' | 'font' = 'script') => {
        if (typeof window !== 'undefined') {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = href;
            link.as = as;
            if (as === 'font') {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        }
    },

    // Lazy load images with intersection observer
    createImageObserver: (callback: (entry: IntersectionObserverEntry) => void) => {
        if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            return new IntersectionObserver((entries) => {
                entries.forEach(callback);
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01,
            });
        }
        return null;
    },

    // Memory optimization
    scheduleIdleTask: (task: () => void) => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(task);
        } else {
            setTimeout(task, 1);
        }
    },

    // Initialize Web Vitals collection
    initWebVitals: (callback: (metric: WebVitalsMetric) => void) => {
        const wrapCallback = (metric: Metric) => {
            const enhancedMetric: WebVitalsMetric = {
                ...metric,
                timestamp: Date.now(),
            };
            callback(enhancedMetric);
        };

        onCLS(wrapCallback);
        onINP(wrapCallback);
        onFCP(wrapCallback);
        onLCP(wrapCallback);
        onTTFB(wrapCallback);
    },

    // Send metric to analytics
    sendToAnalytics: (metric: WebVitalsMetric) => {
        if (typeof window !== 'undefined' && 'gtag' in window) {
            const win = window as unknown as { gtag?: (...args: unknown[]) => void };
            if (typeof win.gtag === 'function') {
                win.gtag('event', metric.name, {
                    event_category: 'Web Vitals',
                    value: Math.round(metric.value),
                    metric_id: metric.id,
                    metric_value: metric.value,
                    metric_delta: metric.delta,
                    metric_rating: metric.rating,
                });
            }
        }
    },

    // Calculate overall performance score
    calculateScore: (vitals: Partial<WebVitalsState>) => {
        const scores: number[] = [vitals.cls, vitals.inp, vitals.fcp, vitals.lcp, vitals.ttfb]
            .filter(Boolean)
            .map(metric => {
                switch (metric!.rating) {
                    case 'good': return 100;
                    case 'needs-improvement': return 75;
                    case 'poor': return 50;
                    default: return 0;
                }
            });

        return scores.length > 0
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : 0;
    },
};
