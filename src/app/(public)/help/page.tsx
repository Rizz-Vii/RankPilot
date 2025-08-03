"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  Users,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

const faqCategories = [
  {
    title: "Getting Started",
    icon: Book,
    faqs: [
      {
        question: "How do I set up my first NeuroSEO™ analysis?",
        answer:
          "Navigate to your dashboard, click 'New Analysis', enter your website URL and target keywords, then select your analysis type. Results typically take 2-5 minutes.",
      },
      {
        question: "What's the difference between subscription tiers?",
        answer:
          "Free tier includes basic analysis for 3 URLs/month. Starter adds advanced features and 50 URLs. Agency tier includes white-label options and priority support.",
      },
      {
        question: "How accurate are the AI recommendations?",
        answer:
          "Our NeuroSEO™ engines achieve 94% accuracy in SEO recommendations, validated against thousands of successful optimization cases.",
      },
    ],
  },
  {
    title: "NeuroSEO™ Suite",
    icon: HelpCircle,
    faqs: [
      {
        question: "How does the AI Visibility Engine work?",
        answer:
          "It analyzes how search engines understand your content, identifies gaps in topical coverage, and suggests optimizations for better AI comprehension.",
      },
      {
        question: "What makes NeuralCrawler™ different?",
        answer:
          "Unlike traditional crawlers, NeuralCrawler™ uses AI to understand page context and user intent, providing insights beyond basic technical analysis.",
      },
      {
        question: "Can I customize the analysis parameters?",
        answer:
          "Yes, you can adjust analysis depth, target keywords, competitor comparisons, and geographic focus for each analysis.",
      },
    ],
  },
  {
    title: "Billing & Plans",
    icon: Users,
    faqs: [
      {
        question: "How does the free trial work?",
        answer:
          "Get full access to all NeuroSEO™ engines for 7 days with up to 10 website analyses. No credit card required.",
      },
      {
        question: "Can I change plans anytime?",
        answer:
          "Yes, upgrade or downgrade your plan anytime. Changes take effect immediately with prorated billing.",
      },
      {
        question: "Do you offer team and agency discounts?",
        answer:
          "Yes, we offer volume discounts for teams over 5 users and special agency pricing with white-label options.",
      },
    ],
  },
];

const supportChannels = [
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Get instant help from our AI assistant or human agents",
    availability: "24/7 AI • Human: Mon-Fri 9am-6pm PST",
    action: "Start Chat",
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Detailed technical support and account assistance",
    availability: "Response within 4 hours",
    action: "Send Email",
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Priority phone support for Enterprise customers",
    availability: "Mon-Fri 9am-6pm PST",
    action: "Schedule Call",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <motion.section
        className="pt-32 pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={0}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-2xl">
              <HelpCircle className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            How Can We Help?
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Find answers to common questions, access detailed guides, or get
            personalized support from our team of SEO and AI experts.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                placeholder="Search for help articles, guides, or FAQs..."
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700">
                Search
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Support Channels */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={1}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Support
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the support channel that works best for your needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {supportChannels.map((channel, index) => (
              <motion.div
                key={channel.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 2}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <channel.icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{channel.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 mb-4">{channel.description}</p>
                    <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
                      <Clock className="h-4 w-4 mr-1" />
                      {channel.availability}
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      {channel.action}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={5}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Quick answers to the most common questions about RankPilot
            </p>
          </motion.div>

          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={categoryIndex + 6}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <category.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-2xl">
                        {category.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {category.faqs.map((faq, faqIndex) => (
                        <div
                          key={faqIndex}
                          className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0"
                        >
                          <h4 className="font-semibold text-lg text-gray-900 mb-2">
                            {faq.question}
                          </h4>
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={9}
      >
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">Still Need Help?</h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                Our team of SEO and AI experts is here to help you succeed. Get
                personalized assistance with strategy, implementation, or
                technical questions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contact Expert Support
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-blue-600"
                >
                  <Book className="mr-2 h-5 w-5" />
                  Browse Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
