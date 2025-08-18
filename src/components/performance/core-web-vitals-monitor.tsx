/**
 * Core Web Vitals Monitor - Real-time Performance Tracking
 * Integrates with RankPilot performance monitoring infrastructure
 */

'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colors } from "@/lib/design-system/colors";
import { spacing } from "@/lib/design-system/spacing";
import { typography } from "@/lib/design-system/typography";
import { cn } from "@/lib/utils";
import { Activity, BarChart3, Clock, Zap } from "lucide-react";
import React, { useEffect, useState } from 'react';

interface WebVitalsMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    threshold: { good: number; poor: number; };
    unit: string;
    icon: React.ComponentType<{ className?: string; }>;
}

interface WebVitalsData {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay  
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
    fcp: number; // First Contentful Paint
}

const getMetricRating = (value: number, thresholds: { good: number; poor: number; }): 'good' | 'needs-improvement' | 'poor' => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
};

const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
        case 'good': return colors.status.success;
        case 'needs-improvement': return colors.status.warning;
        case 'poor': return colors.status.error;
    }
};

export function CoreWebVitalsMonitor() {
    const [vitals, setVitals] = useState<WebVitalsData | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Initialize Core Web Vitals monitoring
        const initWebVitals = async () => {
            try {
                const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

                type BasicMetric = { value: number };
                const base: WebVitalsData = { lcp: 0, fid: 0, cls: 0, ttfb: 0, fcp: 0 };
                const update = (patch: Partial<WebVitalsData>) => {
                    setVitals(prev => ({ ...(prev || base), ...patch }));
                };

                onCLS((metric: BasicMetric) => { update({ cls: metric.value }); });
                onINP((metric: BasicMetric) => { update({ fid: metric.value }); }); // INP used as FID proxy
                onFCP((metric: BasicMetric) => { update({ fcp: metric.value }); });
                onLCP((metric: BasicMetric) => { update({ lcp: metric.value }); });
                onTTFB((metric: BasicMetric) => { update({ ttfb: metric.value }); });

            } catch (error) {
                console.warn('Web Vitals not available:', error);
            }
        };

        initWebVitals();
    }, []);

    if (!mounted || !vitals) {
        return (
            <Card className={spacing.component.base}>
                <CardHeader>
                    <CardTitle className={typography.card.title}>
                        Core Web Vitals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                            <p className={typography.ui.helper}>Loading performance metrics...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const metrics: WebVitalsMetric[] = [
        {
            name: 'LCP',
            value: vitals.lcp || 0,
            rating: getMetricRating(vitals.lcp || 0, { good: 2500, poor: 4000 }),
            threshold: { good: 2500, poor: 4000 },
            unit: 'ms',
            icon: Clock,
        },
        {
            name: 'FID',
            value: vitals.fid || 0,
            rating: getMetricRating(vitals.fid || 0, { good: 100, poor: 300 }),
            threshold: { good: 100, poor: 300 },
            unit: 'ms',
            icon: Zap,
        },
        {
            name: 'CLS',
            value: vitals.cls || 0,
            rating: getMetricRating(vitals.cls || 0, { good: 0.1, poor: 0.25 }),
            threshold: { good: 0.1, poor: 0.25 },
            unit: '',
            icon: BarChart3,
        },
        {
            name: 'TTFB',
            value: vitals.ttfb || 0,
            rating: getMetricRating(vitals.ttfb || 0, { good: 800, poor: 1800 }),
            threshold: { good: 800, poor: 1800 },
            unit: 'ms',
            icon: Activity,
        },
    ];

    const overallScore = metrics.reduce((score, metric) => {
        const points = metric.rating === 'good' ? 25 : metric.rating === 'needs-improvement' ? 15 : 5;
        return score + points;
    }, 0);

    const overallRating = overallScore >= 90 ? 'good' : overallScore >= 60 ? 'needs-improvement' : 'poor';

    return (
        <Card className={spacing.component.base}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className={typography.card.title}>
                        Core Web Vitals
                    </CardTitle>
                    <Badge className={cn(
                        typography.ui.caption,
                        getRatingColor(overallRating).badge
                    )}>
                        Score: {overallScore}/100
                    </Badge>
                </div>
                <p className={typography.ui.helper}>
                    Real-time performance metrics for optimal user experience
                </p>
            </CardHeader>

            <CardContent className={spacing.stack.base}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.map((metric) => {
                        const MetricIcon = metric.icon;
                        const ratingColors = getRatingColor(metric.rating);

                        return (
                            <div
                                key={metric.name}
                                className={cn(
                                    "p-3 rounded-lg border-2 transition-all duration-200",
                                    ratingColors.border,
                                    ratingColors.bg
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <MetricIcon className={cn("h-4 w-4", ratingColors.text)} />
                                    <Badge className={cn(
                                        typography.ui.caption,
                                        ratingColors.badge
                                    )}>
                                        {metric.rating.toUpperCase()}
                                    </Badge>
                                </div>

                                <div>
                                    <p className={cn(typography.ui.caption, "font-medium mb-1")}>
                                        {metric.name}
                                    </p>
                                    <p className={cn(typography.card.value, "text-lg font-bold")}>
                                        {metric.name === 'CLS'
                                            ? metric.value.toFixed(3)
                                            : Math.round(metric.value)
                                        }{metric.unit}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className={typography.ui.helper}>
                        <strong>Performance Guidelines:</strong> LCP &lt; 2.5s, FID &lt; 100ms, CLS &lt; 0.1, TTFB &lt; 800ms
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

// Compact version for dashboard widgets
export function CoreWebVitalsWidget() {
    const [score, setScore] = useState<number | null>(null);
    const [rating, setRating] = useState<'good' | 'needs-improvement' | 'poor'>('good');

    useEffect(() => {
        const calculateScore = async () => {
            try {
                const { onCLS, onINP, onLCP } = await import('web-vitals');
                type BasicMetric = { value: number };
                let metrics: { cls: number; fid: number; lcp: number } = { cls: 0, fid: 0, lcp: 0 };
                let count = 0;

                const updateScore = () => {
                    count++;
                    if (count >= 3) { // Wait for all core metrics
                        const lcpScore = metrics.lcp <= 2500 ? 25 : metrics.lcp <= 4000 ? 15 : 5;
                        const fidScore = metrics.fid <= 100 ? 25 : metrics.fid <= 300 ? 15 : 5;
                        const clsScore = metrics.cls <= 0.1 ? 25 : metrics.cls <= 0.25 ? 15 : 5;

                        const totalScore = lcpScore + fidScore + clsScore + 25; // Base score for having vitals
                        setScore(totalScore);
                        setRating(totalScore >= 90 ? 'good' : totalScore >= 60 ? 'needs-improvement' : 'poor');
                    }
                };

                onCLS((metric: BasicMetric) => { metrics.cls = metric.value; updateScore(); });
                onINP((metric: BasicMetric) => { metrics.fid = metric.value; updateScore(); }); // INP as FID
                onLCP((metric: BasicMetric) => { metrics.lcp = metric.value; updateScore(); });

            } catch (error) {
                console.warn('Web Vitals widget not available:', error);
            }
        };

        calculateScore();
    }, []);

    const ratingColors = getRatingColor(rating);

    return (
        <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg",
            ratingColors.bg
        )}>
            <Activity className={cn("h-4 w-4", ratingColors.text)} />
            <span className={cn(typography.ui.caption, ratingColors.text)}>
                Web Vitals: {score !== null ? `${score}/100` : 'Loading...'}
            </span>
        </div>
    );
}

export default CoreWebVitalsMonitor;
