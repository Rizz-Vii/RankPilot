"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Key,
  Zap,
  Shield,
  Book,
  ExternalLink,
  Play,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

const apiEndpoints = [
  {
    method: "POST",
    endpoint: "/api/neuroseo/analyze",
    description: "Run comprehensive NeuroSEO™ analysis on URLs",
    parameters: ["urls", "keywords", "analysis_type"],
    _response: "Complete SEO analysis with AI insights",
  },
  {
    method: "GET",
    endpoint: "/api/neuroseo/status/{id}",
    description: "Check analysis status and retrieve results",
    parameters: ["analysis_id"],
    _response: "Analysis status and results when complete",
  },
  {
    method: "POST",
    endpoint: "/api/content/optimize",
    description: "AI-powered content optimization suggestions",
    parameters: ["content", "target_keywords", "intent"],
    _response: "Optimized content recommendations",
  },
  {
    method: "GET",
    endpoint: "/api/keywords/research",
    description: "Advanced keyword research with AI insights",
    parameters: ["seed_keywords", "location", "language"],
    _response: "Keyword opportunities with search volumes",
  },
];

const sdkExamples = [
  {
    language: "JavaScript",
    code: `import { RankPilot } from '@rankpilot/sdk';

const client = new RankPilot({
  apiKey: 'your-api-key'
});

// Run NeuroSEO analysis
const analysis = await client.neuroseo.analyze({
  urls: ['https://example.com'],
  keywords: ['ai seo', 'search optimization'],
  analysisType: 'comprehensive'
});

console.log(analysis.results);`,
  },
  {
    language: "Python",
    code: `from rankpilot import RankPilot

client = RankPilot(api_key="your-api-key")

# Run NeuroSEO analysis
analysis = client.neuroseo.analyze(
    urls=["https://example.com"],
    keywords=["ai seo", "search optimization"],
    analysis_type="comprehensive"
)

print(analysis.results)`,
  },
  {
    language: "cURL",
    code: `curl -X POST https://api.rankpilot.ai/v1/neuroseo/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": ["https://example.com"],
    "keywords": ["ai seo", "search optimization"],
    "analysis_type": "comprehensive"
  }'`,
  },
];

export default function ApiDocsPage() {
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
              <Code2 className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            RankPilot API Documentation
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Integrate the power of NeuroSEO™ into your applications with our
            comprehensive RESTful API. Built for developers, designed for scale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Key className="mr-2 h-5 w-5" />
              Get API Key
            </Button>
            <Button variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" />
              Try Interactive Demo
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Quick Start */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={1}
            className="mb-12"
          >
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Get API Key</h3>
                      <p className="text-blue-100 text-sm">
                        Sign up and generate your API key from the dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Make Request</h3>
                      <p className="text-blue-100 text-sm">
                        Use our SDKs or direct HTTP calls to access NeuroSEO™
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Get Results</h3>
                      <p className="text-blue-100 text-sm">
                        Receive AI-powered SEO insights in JSON format
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={2}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Core Endpoints
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Access the full power of NeuroSEO™ through these carefully
              designed API endpoints
            </p>
          </motion.div>

          <div className="space-y-4">
            {apiEndpoints.map((endpoint, index) => (
              <motion.div
                key={endpoint.endpoint}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 3}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={
                            endpoint.method === "GET" ? "secondary" : "default"
                          }
                          className={`${endpoint.method === "GET" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"} font-mono`}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-lg font-mono text-gray-800">
                          {endpoint.endpoint}
                        </code>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600">{endpoint.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {endpoint.parameters.map((param, paramIndex) => (
                            <Badge
                              key={paramIndex}
                              variant="outline"
                              className="text-xs"
                            >
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Examples */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={7}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              SDK Examples
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get started quickly with our official SDKs and code examples
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-1 gap-8">
            {sdkExamples.map((example, index) => (
              <motion.div
                key={example.language}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 8}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Code2 className="h-5 w-5" />
                        <span>{example.language}</span>
                      </CardTitle>
                      <Button variant="outline" size="sm">
                        Copy Code
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{example.code}</code>
                    </pre>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={11}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Secure & Reliable</h3>
                <p className="text-gray-600 text-sm">
                  Enterprise-grade security with 99.9% uptime SLA
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">High Performance</h3>
                <p className="text-gray-600 text-sm">
                  Sub-second response times with global CDN
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <Book className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">
                  Complete Documentation
                </h3>
                <p className="text-gray-600 text-sm">
                  Comprehensive guides and interactive examples
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
