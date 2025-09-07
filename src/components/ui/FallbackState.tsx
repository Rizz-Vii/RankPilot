"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, FileX, RefreshCw, Search } from "lucide-react";

interface FallbackStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    variant?:
      | "default"
      | "outline"
      | "secondary"
      | "ghost"
      | "link"
      | "destructive";
  };
  type?: "empty" | "error" | "loading" | "not-found";
  className?: string;
  showCard?: boolean;
}

const defaultIcons = {
  empty: FileX,
  error: AlertCircle,
  loading: RefreshCw,
  "not-found": Search,
};

const defaultMessages = {
  empty: {
    title: "No data available",
    description: "There's nothing to display here yet.",
  },
  error: {
    title: "Something went wrong",
    description: "We encountered an error while loading this content.",
  },
  loading: {
    title: "Loading...",
    description: "Please wait while we fetch your data.",
  },
  "not-found": {
    title: "Nothing found",
    description: "We couldn't find what you're looking for.",
  },
};

export function FallbackState({
  title,
  description,
  icon: Icon,
  action,
  type = "empty",
  className,
  showCard = true,
}: FallbackStateProps) {
  const FallbackIcon = Icon || defaultIcons[type];
  const defaultMessage = defaultMessages[type];

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center space-y-4 py-12",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full p-4 bg-muted/50",
          type === "error" && "bg-destructive/10",
          type === "loading" && "bg-primary/10"
        )}
      >
        <FallbackIcon
          className={cn(
            "h-8 w-8 text-muted-foreground",
            type === "error" && "text-destructive",
            type === "loading" && "text-primary animate-spin"
          )}
        />
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">
          {title || defaultMessage.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {description || defaultMessage.description}
        </p>
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card className="w-full">
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return content;
}

// Specialized fallback components
export function EmptyState(props: Omit<FallbackStateProps, "type">) {
  return <FallbackState {...props} type="empty" />;
}

export function ErrorState(props: Omit<FallbackStateProps, "type">) {
  return <FallbackState {...props} type="error" />;
}

export function LoadingState(props: Omit<FallbackStateProps, "type">) {
  return <FallbackState {...props} type="loading" />;
}

export function NotFoundState(props: Omit<FallbackStateProps, "type">) {
  return <FallbackState {...props} type="not-found" />;
}

export default FallbackState;
