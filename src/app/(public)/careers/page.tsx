"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Users,
  Zap,
  Brain,
  Code,
  TrendingUp,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

const jobOpenings = [
  {
    title: "Senior AI Engineer",
    department: "NeuroSEO™ Research",
    location: "Remote",
    type: "Full-time",
    description:
      "Lead development of next-generation AI models for SEO analysis and content optimization.",
    requirements: [
      "5+ years experience in machine learning",
      "Python, TensorFlow, or PyTorch expertise",
      "Experience with NLP and search algorithms",
      "PhD in Computer Science or related field preferred",
    ],
    tags: ["AI", "Machine Learning", "Python", "Research"],
  },
  {
    title: "Full-Stack Developer",
    department: "Platform Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Build scalable web applications and APIs for our AI-powered SEO platform.",
    requirements: [
      "3+ years React/Next.js experience",
      "Node.js and TypeScript proficiency",
      "Experience with Firebase or similar platforms",
      "Understanding of SEO principles",
    ],
    tags: ["React", "Next.js", "TypeScript", "Firebase"],
  },
  {
    title: "SEO Data Scientist",
    department: "Analytics",
    location: "Remote",
    type: "Full-time",
    description:
      "Analyze search data patterns and develop insights that drive our AI model improvements.",
    requirements: [
      "Advanced degree in Data Science or Statistics",
      "3+ years SEO or search marketing experience",
      "Python/R for data analysis",
      "Experience with large datasets and ML pipelines",
    ],
    tags: ["Data Science", "SEO", "Python", "Analytics"],
  },
  {
    title: "Technical Content Writer",
    department: "Developer Relations",
    location: "Remote",
    type: "Part-time",
    description:
      "Create technical documentation, tutorials, and educational content for developers.",
    requirements: [
      "Strong technical writing skills",
      "Understanding of SEO and AI concepts",
      "Experience with developer documentation",
      "Background in software development preferred",
    ],
    tags: ["Writing", "Documentation", "SEO", "Developer Relations"],
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Cutting-Edge Technology",
    description:
      "Work with the latest AI and machine learning technologies in the SEO space",
  },
  {
    icon: Users,
    title: "Remote-First Culture",
    description:
      "Fully distributed team with flexible working hours and locations",
  },
  {
    icon: Brain,
    title: "Learning & Growth",
    description:
      "Continuous learning budget and opportunities to attend conferences",
  },
  {
    icon: TrendingUp,
    title: "Equity & Growth",
    description:
      "Competitive salary with equity participation in our growing company",
  },
];

export default function CareersPage() {
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
            Build the Future of
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              AI-Powered SEO
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join our team of AI researchers, engineers, and SEO experts as we
            revolutionize how businesses approach search optimization with
            cutting-edge artificial intelligence.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Users className="mr-2 h-5 w-5" />
            View Open Positions
          </Button>
        </div>
      </motion.section>

      {/* Benefits Section */}
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
              Why Work at RankPilot?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We're building something revolutionary, and we want passionate
              people to join us on this journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 2}
              >
                <Card className="text-center h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Openings Section */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={6}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Open Positions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We're actively looking for talented individuals to join our
              growing team.
            </p>
          </motion.div>

          <div className="space-y-6">
            {jobOpenings.map((job, index) => (
              <motion.div
                key={job.title}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                custom={index + 7}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl mb-2">
                          {job.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {job.department}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {job.location}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {job.type}
                          </span>
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 shrink-0">
                        Apply Now
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{job.description}</p>

                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Key Requirements:
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                        {job.requirements.map((req, reqIndex) => (
                          <li key={reqIndex}>{req}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag, tagIndex) => (
                        <Badge
                          key={tagIndex}
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Application CTA */}
      <motion.section
        className="pb-16 px-4"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={11}
      >
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">
                Don't See Your Perfect Role?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                We're always looking for exceptional talent. Send us your resume
                and tell us how you'd like to contribute to the future of
                AI-powered SEO.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">
                  <Code className="mr-2 h-5 w-5" />
                  Send General Application
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-blue-600"
                >
                  Contact Talent Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
