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
    config: unknown;
    className?: string;
}) {
    return <div className={`chart-container ${className}`}>{children}</div>;
}

export function ChartTooltip({
    content,
    className = ""
}: {
    content: (props: unknown) => React.ReactNode;
    className?: string;
}) {
    return null; // Placeholder implementation
}

export function ChartTooltipContent(props: { label: string; value: string | number }) {
    return (
        <div className="chart-tooltip">
            {props.label}: {props.value}
        </div>
    );
}

// Progress component
export function Progress({
    _value,
    className = ""
}: {
    _value: number;
    className?: string;
}) {
    return (
        <div className={`progress-container ${className}`}>
            <div
                className="progress-bar"
                style={{ width: `${_value}%` }}
            />
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
