/**
 * AI Component Lazy Loader
 * RankPilot - Progressive AI Component Loading
 */

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useAIComponentLoader, useProgressiveLoader } from '../../hooks/use-web-vitals';
import { LoadingSpinner } from '../ui/loading-spinner';

interface AILazyWrapperProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    dependencies?: string[];
    minHeight?: string;
    className?: string;
}

/**
 * Wrapper for AI components with lazy loading and progressive enhancement
 */
export function AILazyWrapper({
    children,
    fallback,
    dependencies = [],
    minHeight = '200px',
    className = ''
}: AILazyWrapperProps) {
    const { isVisible, setRef } = useAIComponentLoader();
    const { loadingStage, isReady } = useProgressiveLoader(dependencies);

    return (
        <div
            ref={setRef}
            className={`${className} transition-all duration-300`}
            style={{ minHeight: !isVisible ? minHeight : 'auto' }}
        >
            {isVisible ? (
                <Suspense fallback={fallback || <AILoadingFallback />}>
                    {isReady ? children : <ProgressiveLoader stage={loadingStage} />}
                </Suspense>
            ) : (
                <div className="flex items-center justify-center" style={{ height: minHeight }}>
                    <div className="text-center text-muted-foreground">
                        <div className="animate-pulse">🤖</div>
                        <div className="text-sm mt-2">AI Component Loading...</div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Progressive loading indicator showing stages
 */
function ProgressiveLoader({ stage }: { stage: number; }) {
    const stages = [
        { label: 'Initializing', icon: '⚙️' },
        { label: 'Loading Resources', icon: '📦' },
        { label: 'Optimizing', icon: '⚡' },
        { label: 'Ready', icon: '✅' },
    ];

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className="text-4xl mb-4 animate-spin">
                {stages[stage]?.icon || '🔄'}
            </div>
            <div className="text-muted-foreground">
                {stages[stage]?.label || 'Loading...'}
            </div>
            <div className="w-48 bg-muted rounded-full h-2 mt-4">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((stage + 1) / stages.length) * 100}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Default AI loading fallback
 */
function AILoadingFallback() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <div className="text-muted-foreground mt-4">Loading AI Component...</div>
            </div>
        </div>
    );
}

/**
 * Memory-optimized AI component wrapper
 */
export function MemoryOptimizedAI({
    children,
    maxMemory = 100 * 1024 * 1024, // 100MB default
    onMemoryWarning,
}: {
    children: React.ReactNode;
    maxMemory?: number;
    onMemoryWarning?: () => void;
}) {
    const [memoryUsage, setMemoryUsage] = useState(0);

    useEffect(() => {
        const checkMemory = () => {
            const perf: any = performance as any;
            if (perf && perf.memory && typeof perf.memory.usedJSHeapSize === 'number') {
                const usage = perf.memory.usedJSHeapSize as number;
                setMemoryUsage(usage);
                if (usage > maxMemory && onMemoryWarning) onMemoryWarning();
            }
        };

        const interval = setInterval(checkMemory, 5000);
        return () => clearInterval(interval);
    }, [maxMemory, onMemoryWarning]);

    return (
        <div className="relative">
            {children}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-2 right-2 text-xs bg-black/75 text-white px-2 py-1 rounded">
                    Memory: {(memoryUsage / 1024 / 1024).toFixed(1)}MB
                </div>
            )}
        </div>
    );
}

/**
 * Error boundary for AI components
 */
interface AIErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class AIErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode; },
    AIErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ReactNode; }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('AI Component Error:', error, errorInfo);

        // Send to monitoring service
        const w = typeof window !== 'undefined' ? (window as any) : undefined;
        if (w && typeof w.gtag === 'function') {
            w.gtag('event', 'exception', {
                description: `AI Component Error: ${error.message}`,
                fatal: false,
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-destructive text-4xl mb-4">⚠️</div>
                    <div className="text-muted-foreground font-medium">AI Component Error</div>
                    <div className="text-muted-foreground text-sm mt-2">
                        Something went wrong loading this AI feature
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
