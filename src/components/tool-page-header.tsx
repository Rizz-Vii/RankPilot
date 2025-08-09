"use client";
import React from "react";
import Breadcrumb from "@/components/breadcrumb";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ToolPageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  badges?: { label: string; variant?: "outline" | "secondary" | "default"; className?: string }[];
  showBreadcrumb?: boolean;
}

export function ToolPageHeader({
  title,
  description,
  children,
  className,
  badges,
  showBreadcrumb = true,
}: ToolPageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      {showBreadcrumb && (
        <div className="mb-4"><Breadcrumb /></div>
      )}
      <div className="flex flex-col gap-3 text-center md:text-left md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground font-body max-w-2xl mx-auto md:mx-0">
              {description}
            </p>
          )}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              {badges.map((b, i) => (
                <Badge key={i} variant={b.variant || "secondary"} className={cn("font-body", b.className)}>
                  {b.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 justify-center md:justify-end">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
