/**
 * Web Vitals Monitor Component
 * RankPilot - Real-time Performance Monitoring
 */

'use client';

import { useWebVitals } from '../../hooks/use-web-vitals';

/**
 * Performance monitoring component for real-time tracking
 */
export function WebVitalsMonitor() {
    const vitals = useWebVitals();

    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    const getMetricColor = (rating: string) => {
        switch (rating) {
            case 'good': return 'text-success-foreground';
            case 'needs-improvement': return 'text-warning-foreground';
            case 'poor': return 'text-destructive-foreground';
            default: return 'text-muted-foreground';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-success-foreground';
        if (score >= 75) return 'text-warning-foreground';
        return 'text-destructive-foreground';
    };

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg font-mono text-xs z-50 min-w-[200px]">
            <div className="mb-2 font-bold">🚀 Core Web Vitals</div>
            <div className="space-y-1">
                {vitals.lcp && (
                    <div className={`flex justify-between ${getMetricColor(vitals.lcp.rating)}`}>
                        <span>LCP:</span>
                        <span>{vitals.lcp.value.toFixed(0)}ms</span>
                    </div>
                )}
                {vitals.inp && (
                    <div className={`flex justify-between ${getMetricColor(vitals.inp.rating)}`}>
                        <span>INP:</span>
                        <span>{vitals.inp.value.toFixed(0)}ms</span>
                    </div>
                )}
                {vitals.fcp && (
                    <div className={`flex justify-between ${getMetricColor(vitals.fcp.rating)}`}>
                        <span>FCP:</span>
                        <span>{vitals.fcp.value.toFixed(0)}ms</span>
                    </div>
                )}
                {vitals.cls && (
                    <div className={`flex justify-between ${getMetricColor(vitals.cls.rating)}`}>
                        <span>CLS:</span>
                        <span>{vitals.cls.value.toFixed(3)}</span>
                    </div>
                )}
                {vitals.ttfb && (
                    <div className={`flex justify-between ${getMetricColor(vitals.ttfb.rating)}`}>
                        <span>TTFB:</span>
                        <span>{vitals.ttfb.value.toFixed(0)}ms</span>
                    </div>
                )}
                <div className="border-t border-border pt-1 mt-2">
                    <div className="flex justify-between font-bold">
                        <span>Score:</span>
                        <span className={getScoreColor(vitals.overallScore)}>
                            {vitals.overallScore}/100
                        </span>
                    </div>
                </div>
                {vitals.isLoading && (
                    <div className="text-muted-foreground text-center mt-1">
                        Loading metrics...
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Lightweight performance indicator for production
 */
export function PerformanceIndicator() {
    const vitals = useWebVitals();

    if (vitals.isLoading || process.env.NODE_ENV === 'development') {
        return null;
    }

    return (
        <div className="fixed bottom-2 right-2 z-40">
            <div className={`
        w-3 h-3 rounded-full 
    ${vitals.overallScore >= 90 ? 'bg-success' :
            vitals.overallScore >= 75 ? 'bg-warning' : 'bg-destructive'}
      `}
                title={`Performance Score: ${vitals.overallScore}/100`}
            />
        </div>
    );
}
