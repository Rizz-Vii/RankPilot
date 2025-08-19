/**
 * Web Vitals React Hooks
 * RankPilot - Performance Monitoring Integration
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WebVitalsMetric, WebVitalsState } from '../lib/performance/web-vitals';
import { performanceUtils } from '../lib/performance/web-vitals';

/**
 * Enhanced Web Vitals monitoring hook with real-time tracking
 */
export function useWebVitals() {
    const [vitals, setVitals] = useState<WebVitalsState>({
        cls: null,
        inp: null,
        fcp: null,
        lcp: null,
        ttfb: null,
        overallScore: 0,
        isLoading: true,
    }); const updateMetric = useCallback((metric: WebVitalsMetric) => {
        setVitals((prev: WebVitalsState) => {
            const updated = {
                ...prev,
                [metric.name.toLowerCase()]: metric,
                isLoading: false,
            };

            // Calculate new overall score
            updated.overallScore = performanceUtils.calculateScore(updated);

            return updated;
        });

        // Send to analytics if configured
        performanceUtils.sendToAnalytics(metric);
    }, []);

    useEffect(() => {
        // Initialize Web Vitals collection
        performanceUtils.initWebVitals(updateMetric);
    }, [updateMetric]);

    return vitals;
}

/**
 * AI Component Lazy Loading Hook
 */
export function useAIComponentLoader() {
    const [isVisible, setIsVisible] = useState(false);
    const [ref, setRef] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!ref) return;

        const observer = performanceUtils.createImageObserver((entry: IntersectionObserverEntry) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer?.unobserve(entry.target);
            }
        });

        if (observer) {
            observer.observe(ref);
        }

        return () => {
            if (observer && ref) {
                observer.unobserve(ref);
            }
        };
    }, [ref]);

    return { isVisible, setRef };
}

/**
 * Progressive Loading Hook for heavy AI components
 */
export function useProgressiveLoader(dependencies: string[] = []) {
    const [loadingStage, setLoadingStage] = useState(0);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const stages = [
            // Stage 1: Preload critical resources
            () => {
                dependencies.forEach(dep => {
                    performanceUtils.preloadResource(dep, 'script');
                });
                setLoadingStage(1);
            },
            // Stage 2: Schedule non-critical tasks
            () => {
                performanceUtils.scheduleIdleTask(() => {
                    setLoadingStage(2);
                });
            },
            // Stage 3: Component ready
            () => {
                setIsReady(true);
                setLoadingStage(3);
            },
        ];

        // Execute stages progressively
        stages[0]();

        const timer1 = setTimeout(stages[1], 100);
        const timer2 = setTimeout(stages[2], 500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [dependencies]);

    return { loadingStage, isReady };
}
