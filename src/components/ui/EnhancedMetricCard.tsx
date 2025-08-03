"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EnhancedMetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: LucideIcon;
    loading?: boolean;
    description?: string;
    className?: string;
    trend?: "up" | "down" | "neutral";
    prefix?: string;
    suffix?: string;
}

export function EnhancedMetricCard({
    title,
    value,
    change,
    icon: Icon,
    loading = false,
    description,
    className,
    trend,
    prefix = "",
    suffix = "",
}: EnhancedMetricCardProps) {
    const getTrendColor = () => {
        if (trend === "up" || (change !== undefined && change > 0)) return "text-green-600 dark:text-green-400";
        if (trend === "down" || (change !== undefined && change < 0)) return "text-red-600 dark:text-red-400";
        return "text-muted-foreground";
    };

    const formatChange = () => {
        if (change === undefined) return null;
        const sign = change >= 0 ? "+" : "";
        return `${sign}${change}${suffix}`;
    };

    if (loading) {
        return (
            <Card className={cn("", className)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    {Icon && <Skeleton className="h-4 w-4" />}
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-20" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("transition-shadow hover:shadow-md", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">
                    {prefix}{value}{suffix}
                </div>
                {(change !== undefined || description) && (
                    <div className="flex items-center gap-2 text-xs">
                        {change !== undefined && (
                            <span className={cn("font-medium", getTrendColor())}>
                                {formatChange()} from last month
                            </span>
                        )}
                        {description && (
                            <span className="text-muted-foreground">{description}</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default EnhancedMetricCard;
