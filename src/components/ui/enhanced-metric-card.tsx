/**
 * Enhanced Metric Card Component
 * Integrates design system with dashboard metrics
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colors, getTierBadgeColor } from "@/lib/design-system/colors";
import { spacing } from "@/lib/design-system/spacing";
import { typography } from "@/lib/design-system/typography";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EnhancedMetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: LucideIcon;
    tier?: "free" | "starter" | "agency" | "enterprise" | "admin";
    className?: string;
    description?: string;
    trend?: "up" | "down" | "neutral";
    loading?: boolean;
}

export function EnhancedMetricCard({
    title,
    value,
    change,
    icon: Icon,
    tier,
    className,
    description,
    trend,
    loading = false,
}: EnhancedMetricCardProps) {
    // Determine trend based on change if not explicitly provided
    const determinedTrend = trend || (change !== undefined ? (change > 0 ? "up" : change < 0 ? "down" : "neutral") : "neutral");

    // Get tier-specific styling
    const tierStyles = tier ? getTierBadgeColor(tier) : null;

    // Format change percentage
    const formatChange = (changeValue: number) => {
        const sign = changeValue >= 0 ? "+" : "";
        return `${sign}${Math.abs(changeValue)}%`;
    };

    if (loading) {
        return (
            <Card className={cn(
                "animate-pulse",
                spacing.touch.comfortable,
                className
            )}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-4 w-4 bg-gray-300 rounded"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-32"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn(
            "transition-all duration-200 hover:shadow-md hover:shadow-gray-100",
            spacing.touch.comfortable,
            "group",
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn(
                    typography.ui.label,
                    "group-hover:text-gray-900 transition-colors"
                )}>
                    {title}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {Icon && (
                        <Icon className={cn(
                            "h-4 w-4 text-muted-foreground transition-colors",
                            determinedTrend === "up" && "text-green-600",
                            determinedTrend === "down" && "text-red-600"
                        )} />
                    )}
                    {tier && (
                        <Badge
                            variant="secondary"
                            className={getTierBadgeColor(tier)}
                        >
                            {tier.toUpperCase()}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className={cn(
                    typography.heading.h3,
                    "font-bold text-gray-900 mb-1"
                )}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                </div>
                {change !== undefined && (
                    <p className={cn(
                        typography.ui.caption,
                        "flex items-center gap-1",
                        determinedTrend === "up" && colors.status.success.text,
                        determinedTrend === "down" && colors.status.error.text,
                        determinedTrend === "neutral" && "text-gray-500"
                    )}>
                        {determinedTrend === "up" && "↗"}
                        {determinedTrend === "down" && "↘"}
                        {determinedTrend === "neutral" && "→"}
                        <span>{formatChange(change)} from last month</span>
                    </p>
                )}
                {description && (
                    <p className={cn(
                        typography.ui.helper,
                        "mt-1"
                    )}>
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default EnhancedMetricCard;
