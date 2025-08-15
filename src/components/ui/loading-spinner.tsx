/**
 * Loading Spinner Component
 * RankPilot - UI Loading States
 */

import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    color?: 'primary' | 'secondary' | 'white' | 'gray';
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
};

const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-muted-foreground',
    white: 'text-white',
    gray: 'text-muted-foreground',
};

export function LoadingSpinner({
    size = 'md',
    className,
    color = 'primary'
}: LoadingSpinnerProps) {
    return (
        <div
            className={cn(
                'animate-spin rounded-full border-2 border-current border-t-transparent',
                sizeClasses[size],
                colorClasses[color],
                className
            )}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}

export function LoadingDots({ className }: { className?: string; }) {
    return (
        <div className={cn('flex space-x-1', className)}>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
