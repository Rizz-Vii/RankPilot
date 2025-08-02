/**
 * Enhanced Card Components - Design System Compliant
 * Consistent card styling for dashboards and metrics
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/design-system/typography';
import { spacing } from '@/lib/design-system/spacing';
import { colors, getStatusColor } from '@/lib/design-system/colors';

interface MetricCardProps {
    title: string;
    _value: string | number;
    change?: {
        _value: string;
        trend: 'up' | 'down' | 'neutral';
    };
    icon?: React.ReactNode;
    subtitle?: string;
    status?: 'success' | 'warning' | 'error' | 'info';
}

export const EnhancedMetricCard: React.FC<MetricCardProps> = ({
    title,
    _value,
    change,
    icon,
    subtitle,
    status
}) => {
    const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up': return 'text-green-600';
            case 'down': return 'text-red-600';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className={cn(
            colors.background.card,
            spacing.component.lg,
            'rounded-xl shadow-sm hover:shadow-md transition-shadow'
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        typography.card.title,
                        'truncate'
                    )}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className={cn(
                            typography.card.subtitle,
                            'mt-1'
                        )}>
                            {subtitle}
                        </p>
                    )}
                </div>

                {icon && (
                    <div className="flex-shrink-0 ml-4">
                        <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            status ? getStatusColor(status, 'bg') : 'bg-gray-100'
                        )}>
                            <span className={cn(
                                'w-5 h-5',
                                status ? getStatusColor(status, 'text') : 'text-gray-600'
                            )}>
                                {icon}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="flex items-end justify-between">
                <div className="flex-1">
                    <div className={typography.card.value}>
                        {value}
                    </div>

                    {change && (
                        <div className={cn(
                            'flex items-center mt-2 text-sm',
                            getTrendColor(change.trend)
                        )}>
                            <span className="font-medium">
                                {change.value}
                            </span>
                            <span className="ml-1 text-xs text-gray-500">
                                from last month
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StatusCardProps {
    title: string;
    status: 'healthy' | 'warning' | 'critical';
    description?: string;
    lastUpdated?: string;
}

export const EnhancedStatusCard: React.FC<StatusCardProps> = ({
    title,
    status,
    description,
    lastUpdated
}) => {
    const getStatusConfig = (status: 'healthy' | 'warning' | 'critical') => {
        switch (status) {
            case 'healthy':
                return {
                    color: colors.health.healthy,
                    label: 'HEALTHY',
                    icon: '✓'
                };
            case 'warning':
                return {
                    color: colors.health.warning,
                    label: 'WARNING',
                    icon: '⚠'
                };
            case 'critical':
                return {
                    color: colors.health.critical,
                    label: 'CRITICAL',
                    icon: '✕'
                };
        }
    };

    const statusConfig = getStatusConfig(status);

    return (
        <div className={cn(
            colors.background.card,
            spacing.component.lg,
            'rounded-xl shadow-sm'
        )}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={typography.card.title}>
                    {title}
                </h3>

                <div className={cn(
                    statusConfig.color.badge,
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md'
                )}>
                    <span>{statusConfig.icon}</span>
                    <span className="text-xs font-semibold">
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            {description && (
                <p className={cn(
                    typography.card.subtitle,
                    'mb-4'
                )}>
                    {description}
                </p>
            )}

            {lastUpdated && (
                <p className={cn(
                    typography.ui.caption,
                    'border-t border-gray-100 pt-3'
                )}>
                    Last updated: {lastUpdated}
                </p>
            )}
        </div>
    );
};

interface ProjectCardProps {
    title: string;
    description: string;
    status: 'active' | 'planning' | 'completed';
    priority: 'high' | 'medium' | 'low';
    progress: number;
    metrics: {
        keywords: { current: number; target: number };
        traffic: { _value: string; trend: 'up' | 'down' };
    };
    team: Array<{ name: string; avatar?: string }>;
    dueDate: string;
}

export const EnhancedProjectCard: React.FC<ProjectCardProps> = ({
    title,
    description,
    status,
    priority,
    progress,
    metrics,
    team,
    dueDate
}) => {
    return (
        <div className={cn(
            colors.background.card,
            spacing.component.lg,
            'rounded-xl shadow-sm hover:shadow-md transition-shadow'
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        typography.card.title,
                        'mb-2'
                    )}>
                        {title}
                    </h3>
                    <p className={cn(
                        typography.card.subtitle,
                        'line-clamp-2'
                    )}>
                        {description}
                    </p>
                </div>

                <div className="flex gap-2 ml-4">
                    <span className={colors.projectStatus[status].bg + ' ' + colors.projectStatus[status].text + ' px-2 py-1 rounded-md text-xs font-medium'}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <span className={
                        (priority === 'low' 
                            ? 'bg-gray-100 text-gray-800' // Default styling for 'low' priority
                            : colors.projectStatus[priority].bg + ' ' + colors.projectStatus[priority].text) + 
                        ' px-2 py-1 rounded-md text-xs font-medium'
                    }>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className={typography.ui.label}>Progress</span>
                    <span className={typography.card.metric}>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className={typography.card.metric}>Keywords</div>
                    <div className={typography.card.value + ' text-lg'}>
                        {metrics.keywords.current}/{metrics.keywords.target}
                    </div>
                </div>
                <div>
                    <div className={typography.card.metric}>Traffic</div>
                    <div className={cn(
                        typography.card.value + ' text-lg',
                        metrics.traffic.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    )}>
                        {metrics.traffic.value}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex -space-x-2">
                    {team.slice(0, 3).map((member, _index) => (
                        <div
                            key={index}
                            className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center"
                        >
                            <span className="text-xs font-medium">
                                {member.name.charAt(0)}
                            </span>
                        </div>
                    ))}
                    {team.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">
                                +{team.length - 3}
                            </span>
                        </div>
                    )}
                </div>

                <span className={typography.ui.caption}>
                    Due {dueDate}
                </span>
            </div>
        </div>
    );
};
