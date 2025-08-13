
/**
 * Feature Gate Component - Robust Tier-Based Access Control
 * Fixes feature gating bugs by providing consistent frontend restrictions
 */

import { colors } from '@/lib/design-system/colors';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { canAccessFeature, FEATURE_ACCESS, TIER_HIERARCHY } from '@/lib/access-control';
import { Crown, Lock, Star, Zap } from 'lucide-react';
import React from 'react';

interface FeatureGateProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUpgrade?: boolean;
    className?: string;
}

/**
 * Frontend feature gating component that prevents premium features
 * from rendering for users without proper tier access
 */
export function FeatureGate({
    feature,
    children,
    fallback,
    showUpgrade = true,
    className
}: FeatureGateProps) {
    const { user } = useAuth();
    const { subscription, userAccess } = useSubscription();

    // Get feature configuration
    const featureConfig = FEATURE_ACCESS[feature];

    if (!featureConfig) {
        console.warn(`Unknown feature in FeatureGate: ${feature}`);
        return showUpgrade ? <UnknownFeatureCard feature={feature} /> : null;
    }

    // Check if user has access using the userAccess from useSubscription
    const hasAccess = userAccess ? canAccessFeature(userAccess, feature) : false;

    if (hasAccess) {
        return <div className={className}>{children}</div>;
    }

    // Show fallback or upgrade prompt
    if (fallback) {
        return <div className={className}>{fallback}</div>;
    }

    if (showUpgrade) {
        return (
            <div className={className}>
                <UpgradePrompt
                    feature={feature}
                    featureConfig={featureConfig}
                    currentTier={userAccess?.tier || 'free'}
                />
            </div>
        );
    }

    return null;
}

/**
 * Upgrade prompt component
 */
function UpgradePrompt({
    feature,
    featureConfig,
    currentTier
}: {
    feature: string;
    featureConfig: any;
    currentTier: string;
}) {
    const requiredTier = featureConfig.requiredTier || 'starter';
    const currentTierIndex = TIER_HIERARCHY.indexOf(currentTier as any);
    const requiredTierIndex = TIER_HIERARCHY.indexOf(requiredTier);

    const tierIcons = {
        free: null,
        starter: <Zap className="h-4 w-4" />,
        agency: <Crown className="h-4 w-4" />,
        enterprise: <Star className="h-4 w-4" />
    };

    const tierColors = {
        free: colors.projectStatus.completed.bg + ' ' + colors.projectStatus.completed.text,
        starter: colors.projectStatus.planning.bg + ' ' + colors.projectStatus.planning.text,
        agency: 'bg-purple-100 text-purple-800', // No direct mapping, keep as is or add to design system
        enterprise: 'bg-gold-100 text-gold-800' // No direct mapping, keep as is or add to design system
    };

    return (
        <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">Premium Feature</CardTitle>
                <CardDescription className="text-sm">
                    {featureConfig.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">Requires:</span>
                    <Badge variant="secondary" className={tierColors[requiredTier as keyof typeof tierColors]}>
                        {tierIcons[requiredTier as keyof typeof tierIcons]}
                        <span className="ml-1 capitalize">{requiredTier}</span>
                    </Badge>
                </div>

                {currentTierIndex < requiredTierIndex && (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Your current plan: <Badge variant="outline" className="capitalize">{currentTier}</Badge>
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => {
                                // Navigate to upgrade page
                                window.open('/upgrade', '_blank');
                            }}
                        >
                            Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Unknown feature card
 */
function UnknownFeatureCard({ feature }: { feature: string; }) {
    return (
        <Card className="border-destructive/25 bg-destructive/5">
            <CardHeader>
                <CardTitle className="text-destructive text-sm">
                    Development Error
                </CardTitle>
                <CardDescription className="text-xs">
                    Unknown feature: "{feature}". Please add it to FEATURE_ACCESS in access-control.ts
                </CardDescription>
            </CardHeader>
        </Card>
    );
}

/**
 * Higher-order component version of FeatureGate
 */
export function withFeatureGate<P extends object>(
    Component: React.ComponentType<P>,
    feature: string,
    fallback?: React.ReactNode
) {
    return function FeatureGatedComponent(props: P) {
        return (
            <FeatureGate feature={feature} fallback={fallback}>
                <Component {...props} />
            </FeatureGate>
        );
    };
}

/**
 * Hook for checking feature access in components
 */
export function useFeatureAccess(feature: string): {
    hasAccess: boolean;
    featureConfig: any;
    requiredTier: string | null;
} {
    const { user } = useAuth();
    const { subscription, userAccess } = useSubscription();

    const featureConfig = FEATURE_ACCESS[feature];

    if (!featureConfig) {
        console.warn(`Unknown feature in useFeatureAccess: ${feature}`);
        return { hasAccess: false, featureConfig: null, requiredTier: null };
    }

    const hasAccess = userAccess ? canAccessFeature(userAccess, feature) : false;

    return {
        hasAccess,
        featureConfig,
        requiredTier: featureConfig.requiredTier || null
    };
}
