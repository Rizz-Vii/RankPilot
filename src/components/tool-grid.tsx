"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { navItems } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toolDescriptions: Record<string, string> = {
  "/dashboard": "View your SEO performance overview and key metrics",
  "/insights": "Get AI-powered insights and recommendations",
  "/content-brief": "Generate comprehensive content briefs",
  "/keyword-tool": "Research and analyze keyword opportunities",
  "/content-analyzer": "Analyze content performance and optimization",
  "/competitors": "Research competitor strategies and performance",
  "/serp-view": "Analyze search engine results pages",
  "/seo-audit": "Comprehensive SEO audit and recommendations",
  "/link-view": "Analyze backlink profiles and opportunities",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren",
    },
  },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      mass: 0.5,
    },
  },
};

interface ToolGridProps {
  className?: string;
  showAll?: boolean;
}

export default function ToolGrid({
  className,
  showAll = false,
}: ToolGridProps) {
  const { user, role } = useAuth();

  // Filter nav items based on user role and exclude dashboard if not showAll
  const visibleNavItems = navItems.filter((item) => {
    if (!showAll && item.href === "/dashboard") return false;
    return !item.adminOnly || (user && role === "admin");
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("tool-grid", className)}
    >
      {visibleNavItems.map((item, _index) => (
        <motion.div key={item.href} variants={cardVariants}>
          <Link href={item.href} className="block">
            <Card className="tool-card hover:border-primary/50 transition-all duration-200 cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="tool-card-icon text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="tool-card-title group-hover:text-primary transition-colors">
                      {item.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="tool-card-description">
                  {toolDescriptions[item.href] ||
                    `Access ${item.title} functionality`}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
