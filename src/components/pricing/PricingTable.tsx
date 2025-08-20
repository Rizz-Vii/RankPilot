// 🚀 RankPilot Pricing Table Component
// File: src/components/pricing/PricingTable.tsx

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { TierIcon, TierChip } from '@/components/tiers/tier-icons';
import { useState } from 'react';
import { STRIPE_PLANS } from '@/lib/stripe';

interface PricingTableProps {
    currentTier?: string;
    onUpgrade?: (tier: string) => void;
}

export function PricingTable({ currentTier = 'free', onUpgrade }: PricingTableProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleUpgrade = async (tier: string) => {
        if (tier === 'free' || tier === currentTier) return;

        setLoading(tier);
        if (onUpgrade) onUpgrade(tier);

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier,
                    successUrl: `${window.location.origin}/dashboard?upgraded=true`,
                    cancelUrl: `${window.location.origin}/pricing`
                }),
            });

            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            }
        } catch (error) {
            console.error('Upgrade error:', error);
        } finally {
            setLoading(null);
        }
    };

    const tiers = (['starter', 'agency', 'enterprise'] as const).map((key) => {
        const plan = STRIPE_PLANS[key];
        const meta = {
            starter: {
                description: 'Great for small businesses',
                icon: <TierIcon tier="starter" size={48} className="shadow-sm" />,
                popular: false,
            },
            agency: {
                description: 'Perfect for agencies',
                icon: <TierIcon tier="agency" size={48} className="shadow-sm" />,
                popular: true,
            },
            enterprise: {
                description: 'For large organizations',
                icon: <TierIcon tier="enterprise" size={48} className="shadow-sm" />,
                popular: false,
            },
        }[key];

        return {
            key,
            name: plan.name,
            price: plan.price.monthly,
            description: meta.description,
            icon: meta.icon,
            features: plan.features,
            buttonText: 'Start Free Trial',
            popular: meta.popular,
        };
    });

    return (
        <div className="py-24 bg-background">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Choose the right plan for your SEO needs
                    </p>
                    <p className="mt-6 text-lg leading-8 text-muted-foreground">
                        Start with our free tier and upgrade as your business grows. All plans include access to our AI-powered NeuroSEO™ analysis.
                    </p>
                </div>

                <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
                    {tiers.map((tier) => (
                        <Card
                            key={tier.key}
                            className={`relative ${tier.popular ? 'ring-2 ring-primary' : ''} ${currentTier === tier.key ? 'border-primary' : ''}`}
                        >
                            {tier.popular && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                                    Most Popular
                                </Badge>
                            )}

                            <CardHeader className="text-center">
                                <div className="mx-auto">{tier.icon}</div>
                                <CardTitle className="text-xl font-semibold">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>

                                <div className="mt-6">
                                    <div className="flex items-baseline justify-center">
                                        <span className="text-4xl font-bold tracking-tight">
                                            ${tier.price}
                                        </span>
                                        <span className="text-sm font-semibold leading-6 text-muted-foreground">
                                            /month USD
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        7-day free trial • Billed monthly • Cancel anytime
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <ul className="space-y-3 text-sm">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex items-start">
                                            <Check className="h-4 w-4 text-primary mt-0.5 mr-3 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className="w-full mt-8"
                                    variant={tier.popular ? 'default' : 'outline'}
                                    disabled={currentTier === tier.key || loading === tier.key}
                                    onClick={() => handleUpgrade(tier.key)}
                                >
                                    {loading === tier.key
                                        ? 'Processing...'
                                        : currentTier === tier.key
                                        ? 'Current Plan'
                                        : tier.buttonText}
                                </Button>

                                                                <div className="mt-4 flex items-center justify-center gap-2">
                                                                    <TierChip tier={tier.key} />
                                                                    {currentTier === tier.key && (
                                                                        <span className="text-xs text-muted-foreground">Current Plan</span>
                                                                    )}
                                                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        All plans include SSL encryption, 99.9% uptime SLA, and GDPR compliance.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Need a custom enterprise solution? <a href="/contact" className="text-primary hover:underline">Contact our sales team</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
