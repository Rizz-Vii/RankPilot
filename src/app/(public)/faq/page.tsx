// src/app/(public)/faq/page.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import {
    ArrowRight,
    HelpCircle,
    MessageSquare,
    Rocket,
    Shield,
    Users,
    Zap,
} from "lucide-react";
import Link from "next/link";

const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.6 },
    }),
};

const faqCategories = [
    {
        title: "Getting Started",
        icon: Rocket,
        questions: [
            {
                question: "Do I need a credit card to start?",
                answer: "No. Spin up a workspace free—upgrade only when you're ready to unlock automation & advanced engines. No credit card required for the 7-day free trial.",
            },
            {
                question: "How do I get started with RankPilot?",
                answer: "Simply sign up for a free account, connect your website, and let our AI engines begin analyzing your SEO performance. The setup takes less than 5 minutes.",
            },
            {
                question: "What makes RankPilot different from other SEO tools?",
                answer: "RankPilot uses a unified NeuroSEO™ approach with six coordinated AI engines that work together to provide actionable insights, rather than fragmented data from separate tools.",
            },
        ],
    },
    {
        title: "Pricing & Billing",
        icon: Shield,
        questions: [
            {
                question: "Can I change my plan later?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate any billing differences. No hidden fees or long-term contracts.",
            },
            {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, PayPal, and bank transfers for enterprise customers. All plans include a 7-day free trial with no credit card required.",
            },
            {
                question: "Is there a free trial?",
                answer: "Yes! All plans come with a 7-day free trial. No credit card required to start. You get full access to all features during the trial period.",
            },
            {
                question: "Can I cancel or downgrade anytime?",
                answer: "Yes. Self-serve downgrade/cancellation at any time—no lock-in, your data remains exportable. We don't believe in trapping customers with complex contracts.",
            },
        ],
    },
    {
        title: "Features & Capabilities",
        icon: Zap,
        questions: [
            {
                question: "What search surfaces are supported?",
                answer: "Google core + SERP features today; Bing, AI overviews and additional generative surfaces in active development. Our NeuroSEO™ engines are designed to adapt to emerging search technologies.",
            },
            {
                question: "How fast can we see impact?",
                answer: "Most teams surface high-impact technical & content fixes inside the first 48 hours and deploy prioritized actions within the first week. Our AI engines provide immediate insights and actionable recommendations.",
            },
            {
                question: "Do you support multiple websites?",
                answer: "Yes! The Agency and Enterprise plans support unlimited websites. You can manage multiple sites from a single dashboard and get consolidated reporting across all your properties.",
            },
            {
                question: "Can I collaborate with my team?",
                answer: "Yes! Agency and Enterprise plans include team collaboration features. You can invite team members, assign tasks, and share reports with customizable permissions.",
            },
        ],
    },
    {
        title: "Technical & Support",
        icon: MessageSquare,
        questions: [
            {
                question: "What kind of support do you provide?",
                answer: "Email support for all plans, priority email for Agency, and 24/7 phone support for Enterprise. We also provide comprehensive documentation, tutorials, and a community forum.",
            },
            {
                question: "Is my data secure?",
                answer: "Absolutely. We use enterprise-grade security with SOC 2 compliance in progress. Your data is encrypted in transit and at rest, and we never share your information with third parties.",
            },
            {
                question: "Do you offer API access?",
                answer: "Yes! Agency and Enterprise plans include API access. Our REST API allows you to integrate RankPilot data with your existing workflows and tools.",
            },
            {
                question: "Can I export my data?",
                answer: "Yes! You can export all your data at any time. We support CSV, PDF, and JSON formats. Your data remains yours - we don't believe in data lock-in.",
            },
        ],
    },
];

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        custom={0}
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <HelpCircle className="h-8 w-8 text-primary" />
                            <Badge variant="secondary">FAQ</Badge>
                        </div>
                        <h1 className="text-5xl font-bold mb-6">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                            Everything you need to know about RankPilot's NeuroSEO™ platform.
                            Can't find what you're looking for? Contact our support team.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" asChild>
                                <Link href="/register" className="flex items-center gap-2">
                                    Start Free Trial
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/contact">Contact Support</Link>
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Categories */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    {faqCategories.map((category, categoryIndex) => (
                        <motion.div
                            key={category.title}
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            custom={categoryIndex + 1}
                            className="mb-16"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <category.icon className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold">{category.title}</h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {category.questions.map((faq, faqIndex) => (
                                    <Card key={faqIndex} className="h-full">
                                        <CardHeader>
                                            <CardTitle className="text-lg leading-tight">
                                                {faq.question}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <CardDescription className="text-base leading-relaxed">
                                                {faq.answer}
                                            </CardDescription>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Still Need Help */}
            <section className="py-24 px-4 bg-muted/30">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        custom={5}
                    >
                        <Users className="h-12 w-12 text-primary mx-auto mb-6" />
                        <h2 className="text-3xl font-bold mb-6">
                            Still Have Questions?
                        </h2>
                        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                            Our support team is here to help you get the most out of RankPilot.
                            Contact us anytime for personalized assistance.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" asChild>
                                <Link href="/contact" className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Contact Support
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/docs">Browse Documentation</Link>
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Quick Links */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        custom={6}
                        className="text-center mb-12"
                    >
                        <h2 className="text-2xl font-bold mb-4">Explore More</h2>
                        <p className="text-muted-foreground">
                            Learn more about RankPilot's features and capabilities
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="text-center hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <Rocket className="h-8 w-8 text-primary mx-auto mb-2" />
                                <CardTitle>Features</CardTitle>
                                <CardDescription>
                                    Discover all the powerful tools in our NeuroSEO™ suite
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" asChild className="w-full">
                                    <Link href="/features">View Features</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="text-center hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                                <CardTitle>Pricing</CardTitle>
                                <CardDescription>
                                    Choose the perfect plan for your SEO needs
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" asChild className="w-full">
                                    <Link href="/pricing">View Pricing</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="text-center hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
                                <CardTitle>Documentation</CardTitle>
                                <CardDescription>
                                    Comprehensive guides and API documentation
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" asChild className="w-full">
                                    <Link href="/docs">View Docs</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </div>
    );
}
