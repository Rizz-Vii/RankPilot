"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MobileToolLayoutProps {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
  showBackButton?: boolean;
  className?: string;
}

export default function MobileToolLayout({
  title,
  description,
  icon,
  children,
  showBackButton = true,
  className,
}: MobileToolLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b md:hidden">
        <div className="flex items-center justify-between p-4">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-12 w-12 min-h-[48px] min-w-[48px] mobile-button"
            >
              <Link href="/dashboard" aria-label="Back to dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}

          <div className="flex items-center gap-2 flex-1 justify-center">
            {icon && <div className="text-primary">{icon}</div>}
            <h1 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-12 w-12 min-h-[48px] min-w-[48px] mobile-button"
          >
            <Link href="/dashboard" aria-label="Home">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Desktop Header - Hidden on mobile */}
      <div className="hidden md:block p-6 border-b">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-2">
            {icon && <div className="text-primary text-2xl">{icon}</div>}
            <h1 className="text-3xl font-bold font-headline text-foreground">
              {title}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">{description}</p>
        </motion.div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {/* Mobile Content */}
        <div className="md:hidden">
          <div className="p-4 space-y-4">
            {/* Tool Description Card - Mobile */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="space-y-4">{children}</div>
          </div>
        </div>

        {/* Desktop Content */}
        <div className="hidden md:block p-6">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized card component for tool sections
export function MobileToolCard({
  title,
  description,
  children,
  className,
  icon,
  collapsible = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  collapsible?: boolean;
}) {
  return (
    <Card className={cn("shadow-sm border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// Mobile-optimized results card
export function MobileResultsCard({
  title,
  subtitle,
  children,
  actions,
  icon,
  loading = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-md border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {icon && (
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {title}
                </CardTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && <div className="ml-2 flex-shrink-0">{actions}</div>}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
