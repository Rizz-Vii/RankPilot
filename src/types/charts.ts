// Chart Configuration Types and Components
// Generated: July 31, 2025

import type { ChartConfig } from './index';

// ============================================================================
// CHART CONFIGURATIONS
// ============================================================================

export const scoreChartConfig: ChartConfig = {
    score: {
        label: "Score",
        color: "hsl(var(--chart-1))",
    },
    status: {
        label: "Status",
        color: "hsl(var(--chart-2))",
    },
};

export const imageChartConfig: ChartConfig = {
    withAlt: {
        label: "With Alt Text",
        color: "hsl(var(--chart-1))",
    },
    missingAlt: {
        label: "Missing Alt Text",
        color: "hsl(var(--chart-2))",
    },
};

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

export const statusIcons = {
    pass: '✅',
    fail: '❌',
    warning: '⚠️',
};

export const statusColors = {
    pass: 'text-success-foreground',
    fail: 'text-destructive-foreground',
    warning: 'text-warning-foreground',
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};
