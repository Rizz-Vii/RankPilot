import { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  User,
  ArrowRight,
  TrendingUp,
  Bot,
  BarChart,
  Target,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SEO Blog | RankPilot",
  description:
    "Learn SEO strategies, tips, and best practices from industry experts. Stay updated with the latest search engine optimization trends.",
};

export default function BlogPage() {
  const posts = [
    {
      title: "Enterprise SEO Audit: Complete Guide for Large Websites",
      description:
        "Learn how to conduct comprehensive SEO audits for enterprise websites with our detailed guide covering technical analysis, content strategy, and implementation.",
      href: "/blog/enterprise-seo-audit",
      icon: TrendingUp,
      date: "July 15, 2024",
      author: "RankPilot Team",
      readTime: "15 min read",
      category: "Technical SEO",
    },
    {
      title: "AI SEO Tools: The Future of Search Optimization",
      description:
        "Discover how AI is revolutionizing SEO with automated analysis, content optimization, and predictive insights for better search rankings.",
      href: "/blog/ai-seo-tools",
      icon: Bot,
      date: "July 10, 2024",
      author: "RankPilot Team",
      readTime: "12 min read",
      category: "AI & Technology",
    },
    {
      title: "SEO Metrics That Actually Matter in 2024",
      description:
        "Cut through the noise and focus on SEO metrics that actually drive business results. Learn which KPIs matter most and how to track them effectively.",
      href: "/blog/seo-metrics",
      icon: BarChart,
      date: "July 5, 2024",
      author: "RankPilot Team",
      readTime: "10 min read",
      category: "Analytics",
    },
    {
      title: "Competitor Analysis: Uncover Your SEO Opportunities",
      description:
        "Turn your competitors' success into your advantage. Learn proven techniques for analyzing competitor SEO strategies and identifying opportunities.",
      href: "/blog/competitor-analysis",
      icon: Target,
      date: "June 28, 2024",
      author: "RankPilot Team",
      readTime: "14 min read",
      category: "Strategy",
    },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Technical SEO":
        return "bg-blue-100 text-blue-800";
      case "AI & Technology":
        return "bg-purple-100 text-purple-800";
      case "Analytics":
        return "bg-green-100 text-green-800";
      case "Strategy":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">SEO Blog</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay ahead of the SEO curve with insights, strategies, and best
            practices from industry experts and AI-powered analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {posts.map((post, index) => {
            const IconComponent = post.icon;
            return (
              <article
                key={index}
                className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${getCategoryColor(post.category)}`}
                    >
                      {post.category}
                    </span>
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  <Link href={post.href} className="block">
                    <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {post.description}
                    </p>
                  </Link>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <time dateTime={post.date}>{post.date}</time>
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>{post.author}</span>
                      </div>
                    </div>
                    <span>{post.readTime}</span>
                  </div>

                  <Link
                    href={post.href}
                    className="inline-flex items-center text-primary hover:text-primary/80 font-medium mt-4 group"
                  >
                    Read More
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-16 bg-gradient-to-r from-primary/10 to-blue-50 border border-primary/20 rounded-lg p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">
              Ready to Implement These Strategies?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Turn knowledge into action with RankPilot's AI-powered SEO
              analysis tools. Get personalized insights and recommendations for
              your website.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/content-analyzer"
                className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
              >
                Analyze Your Content
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/competitors"
                className="inline-flex items-center bg-secondary text-secondary-foreground px-6 py-3 rounded-md hover:bg-secondary/90 transition-colors"
              >
                Study Your Competitors
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">
            Subscribe for SEO Updates
          </h3>
          <p className="text-muted-foreground mb-6">
            Get the latest SEO insights and RankPilot updates delivered to your
            inbox.
          </p>
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
