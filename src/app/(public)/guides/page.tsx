import { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Globe,
  Code,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SEO Guides | RankPilot",
  description:
    "Comprehensive SEO guides and tutorials to improve your search engine optimization skills.",
};

export default function GuidesPage() {
  const guides = [
    {
      title: "Broken Link Analysis",
      description:
        "Learn how to find, analyze, and fix broken links to improve your SEO performance.",
      icon: ExternalLink,
      href: "/guides/broken-links",
      difficulty: "Intermediate",
      readTime: "8 min read",
    },
    {
      title: "XML Sitemap Optimization",
      description:
        "Master XML sitemaps to help search engines discover and index your content efficiently.",
      icon: Globe,
      href: "/guides/xml-sitemap",
      difficulty: "Beginner",
      readTime: "12 min read",
    },
    {
      title: "Web Scraping for SEO",
      description:
        "Discover how to ethically gather competitive intelligence and SEO data through web scraping.",
      icon: Code,
      href: "/guides/web-scraping",
      difficulty: "Advanced",
      readTime: "15 min read",
    },
    {
      title: "Learn SEO Fundamentals",
      description:
        "Comprehensive guide to learning SEO from basics to advanced strategies.",
      icon: BookOpen,
      href: "/guides/learn-seo",
      difficulty: "Beginner",
      readTime: "20 min read",
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">SEO Guides & Tutorials</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master search engine optimization with our comprehensive guides,
            from beginner basics to advanced techniques.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {guides.map((guide, index) => {
            const IconComponent = guide.icon;
            return (
              <Link
                key={index}
                href={guide.href}
                className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {guide.title}
                      </h3>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    <p className="text-muted-foreground mb-3 line-clamp-2">
                      {guide.description}
                    </p>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(guide.difficulty)}`}
                      >
                        {guide.difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {guide.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 bg-gradient-to-r from-primary/10 to-blue-50 border border-primary/20 rounded-lg p-8">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">
              Ready to Analyze Your Site?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Put your SEO knowledge into practice with RankPilot's
              comprehensive analysis tools. Get actionable insights to improve
              your search rankings.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/content-analyzer"
                className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
              >
                Start Content Analysis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/competitors"
                className="inline-flex items-center bg-secondary text-secondary-foreground px-6 py-3 rounded-md hover:bg-secondary/90 transition-colors"
              >
                Analyze Competitors
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
