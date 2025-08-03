"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Target, Brain, Zap, Globe, Award } from "lucide-react";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

const teamMembers = [
  {
    name: "AI Research Team",
    role: "NeuroSEO™ Development",
    description:
      "Pioneering the next generation of AI-powered SEO intelligence",
  },
  {
    name: "Engineering Team",
    role: "Platform Architecture",
    description: "Building scalable, secure infrastructure for enterprise SEO",
  },
  {
    name: "SEO Experts",
    role: "Strategy & Innovation",
    description: "20+ years combined experience in search engine optimization",
  },
];

const values = [
  {
    icon: Brain,
    title: "AI-First Innovation",
    description:
      "We believe artificial intelligence is the future of SEO, making complex analysis accessible to everyone.",
  },
  {
    icon: Target,
    title: "Results-Driven",
    description:
      "Every feature we build is designed to deliver measurable improvements in search rankings and organic traffic.",
  },
  {
    icon: Users,
    title: "Customer Success",
    description:
      "Your success is our success. We're committed to helping businesses achieve their SEO goals with cutting-edge AI.",
  },
  {
    icon: Globe,
    title: "Global Impact",
    description:
      "Making professional-grade SEO tools accessible to businesses worldwide, regardless of size or budget.",
  },
];

export default function AboutPage() {
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
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Revolutionizing SEO with
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              AI Intelligence
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            RankPilot is the world's first AI-native SEO platform, combining the
            power of 6 specialized NeuroSEO™ engines to deliver insights that
            traditional tools simply cannot match.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Zap className="mr-2 h-5 w-5" />
              Experience the Future of SEO
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Mission Section */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={1}
      >
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                  <p className="text-blue-100 text-lg mb-6">
                    To democratize enterprise-level SEO intelligence through AI,
                    making it accessible to businesses of all sizes while
                    maintaining the sophistication that drives real results.
                  </p>
                  <p className="text-blue-100">
                    We're not just building another SEO tool—we're creating the
                    future of search optimization, where AI does the heavy
                    lifting so you can focus on strategy and growth.
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="p-8 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <Award className="h-24 w-24 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Values Section */}
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
              Our Values
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do at RankPilot
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 3}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <value.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-xl">{value.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={7}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A passionate group of AI researchers, engineers, and SEO experts
              united by a vision to transform search optimization
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 8}
              >
                <Card className="text-center h-full">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <p className="text-blue-600 font-medium">{member.role}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{member.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={11}
      >
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gray-900 text-white">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-6">
                Ready to Transform Your SEO?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of businesses already using RankPilot's
                NeuroSEO™ Suite to dominate search results with AI-powered
                intelligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Start Free Trial
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Link href="/contact">Get in Touch</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
