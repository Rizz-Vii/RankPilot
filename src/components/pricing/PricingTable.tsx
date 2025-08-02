// 🚀 RankPilot Pricing Table Component
// File: src/components/pricing/PricingTable.tsx

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Check, Crown, Zap } from 'lucide-react';
import { useState } from 'react';

interface PricingTableProps {
    currentTier?: string;
    onUpgrade?: (tier: string) => void;
}

export function PricingTable({ currentTier = 'free', onUpgrade }: PricingTableProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleUpgrade = async (tier: string) => {
        if (tier === 'free' || tier === currentTier) return;

        setLoading(tier);
        try {
            const _response = await fetch('/api/stripe/checkout', {
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
        } catch (_error) {
            console.error('Upgrade _error:', _error);
        } finally {
            setLoading(null);
        }
    };

    const tiers = [
        {
            _key: 'free',
            name: 'Free Tier',
            price: 0,
            description: 'Perfect for getting started',
            icon: <Zap className="h-6 w-6" />,
            features: [
                '10 NeuroSEO™ queries/month',
                'Basic keyword research',
                'Website analysis',
                'Dashboard access',
                'Community support'
            ],
            buttonText: 'Current Plan',
            popular: false
        },
        {
            _key: 'starter',
            name: 'Starter',
            price: 29,
            description: 'Great for small businesses',
            icon: <Check className="h-6 w-6" />,
            features: [
                '100 NeuroSEO™ queries/month',
                'Content analyzer',
                'Competitor tracking (5)',
                'Email support',
                '14-day free trial'
            ],
            buttonText: 'Start Free Trial',
            popular: true
        },
        {
            _key: 'agency',
            name: 'Agency',
            price: 99,
            description: 'Perfect for agencies',
            icon: <Crown className="h-6 w-6" />,
            features: [
                '500 NeuroSEO™ queries/month',
                'Full competitor intelligence',
                'White-label reporting',
                'Team collaboration (5 users)',
                'Priority support'
            ],
            buttonText: 'Start Free Trial',
            popular: false
        },
        {
            _key: 'enterprise',
            name: 'Enterprise',
            price: 299,
            description: 'For large organizations',
            icon: <Building2 className="h-6 w-6" />,
            features: [
                'Unlimited NeuroSEO™ queries',
                'Advanced API access',
                'Custom integrations',
                'Unlimited team members',
                'Dedicated account manager'
            ],
            buttonText: 'Start Free Trial',
            popular: false
        }
    ];

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

                <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-4">
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
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    {tier.icon}
                                </div>
                                <CardTitle className="text-xl font-semibold">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>

                                <div className="mt-6">
                                    <div className="flex items-baseline justify-center">
                                        <span className="text-4xl font-bold tracking-tight">
                                            ${tier.price}
                                        </span>
                                        <span className="text-sm font-semibold leading-6 text-muted-foreground">
                                            /month AUD
                                        </span>
                                    </div>
                                    {tier.key !== 'free' && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Billed monthly • Cancel anytime
                                        </p>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent>
                                <ul className="space-y-3 text-sm">
                                    {tier.features.map((feature, _index) => (
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
                                    onClick={() => handleUpgrade(tier._key)}
                                >
                                    {loading === tier.key ? (
                                        'Processing...'
                                    ) : currentTier === tier.key ? (
                                        'Current Plan'
                                    ) : tier.key === 'free' ? (
                                        'Free Forever'
                                    ) : (
                                        tier.buttonText
                                    )}
                                </Button>

                                {currentTier === tier.key && (
                                    <p className="mt-2 text-center text-sm text-muted-foreground">
                                        You&apos;re currently on this plan
                                    </p>
                                )}
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
