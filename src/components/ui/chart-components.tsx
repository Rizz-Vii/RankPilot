// Recharts components and shadcn/ui chart components
// Re-export from recharts for consistent usage

import React from 'react';

export {
    Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis,
    YAxis
} from 'recharts';

// Mock chart components for shadcn/ui compatibility
export function ChartContainer({
    children,
    config,
    className = ""
}: {
    children: React.ReactNode;
    config: any;
    className?: string;
}) {
    return <div className={`chart-container ${className}`}>{children}</div>;
}

export function ChartTooltip({
    content,
    className = ""
}: {
    content: (props: any) => React.ReactNode;
    className?: string;
}) {
    return null; // Placeholder implementation
}

export function ChartTooltipContent(props: any) {
    return (
        <div className="chart-tooltip">
            {props.label}: {props.value}
        </div>
    );
}


// Alert components
export function AlertCircle({
    className = "",
    size = 24
}: {
    className?: string;
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

// Simple Progress stub to maintain backward compatibility after refactor
export function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
    return (
        <div className={`w-full h-2 rounded bg-muted overflow-hidden ${className}`}> 
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
    );
}
