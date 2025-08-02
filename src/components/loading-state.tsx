"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Loader2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  progress?: number;
  onCancel?: () => void;
  tips?: string[];
  showTips?: boolean;
  variant?: "default" | "compact" | "fullscreen";
  className?: string;
}

const loadingMessages = [
  "Analyzing your content...",
  "Processing SEO metrics...",
  "Gathering keyword insights...",
  "Generating recommendations...",
  "Almost there...",
];

const defaultTips = [
  "💡 Tip: Use long-tail keywords for better targeting",
  "🎯 Tip: Focus on user intent when creating content",
  "📊 Tip: Monitor your competitors' strategies",
  "🚀 Tip: Optimize for mobile-first indexing",
  "✨ Tip: Quality content always wins",
];

export default function LoadingState({
  isLoading,
  title = "Processing your request",
  subtitle,
  progress,
  onCancel,
  tips = defaultTips,
  showTips = true,
  variant = "default",
  className,
}: LoadingStateProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    // Announce loading state for screen readers
    const loadingAnnouncement = document.createElement("div");
    loadingAnnouncement.setAttribute("aria-live", "polite");
    loadingAnnouncement.setAttribute("aria-atomic", "true");
    loadingAnnouncement.classList.add("sr-only");
    loadingAnnouncement.textContent = `${title}. ${loadingMessages[0]}`;
    document.body.appendChild(loadingAnnouncement);

    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      const nextMessageIndex = (currentMessage + 1) % loadingMessages.length;
      setCurrentMessage(nextMessageIndex);
      loadingAnnouncement.textContent = `${title}. ${loadingMessages[nextMessageIndex]}`;
    }, 2000);

    // Cycle through tips
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 4000);

    // Simulate progress if not provided
    let progressInterval: NodeJS.Timeout;
    if (progress === undefined) {
      progressInterval = setInterval(() => {
        setDisplayProgress((prev) => {
          const newProgress = prev >= 90 ? prev : prev + Math.random() * 5;
          // Update loading announcement with progress
          if (
            Math.floor(newProgress) % 10 === 0 &&
            Math.floor(newProgress) !== Math.floor(prev)
          ) {
            loadingAnnouncement.textContent = `${Math.floor(newProgress)}% complete. ${loadingMessages[currentMessage]}`;
          }
          return newProgress;
        });
      }, 500);
    }

    return () => {
      clearInterval(messageInterval);
      clearInterval(tipInterval);
      if (progressInterval) clearInterval(progressInterval);
      document.body.removeChild(loadingAnnouncement);
    };
  }, [isLoading, progress, tips.length, title, currentMessage]);

  useEffect(() => {
    if (progress !== undefined) {
      setDisplayProgress(progress);
    }
  }, [progress]);

  if (!isLoading) return null;

  const FullscreenVariant = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md mx-auto shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <Sparkles className="h-12 w-12 text-primary" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Zap className="h-6 w-6 text-primary/60" />
              </motion.div>
            </motion.div>
          </div>

          <h3 className="text-xl font-semibold mb-2">{title}</h3>

          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground mb-6"
          >
            {loadingMessages[currentMessage]}
          </motion.p>

          <div className="space-y-4">
            <Progress value={displayProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {Math.round(displayProgress)}% complete
            </p>
          </div>

          {showTips && (
            <motion.div
              key={currentTip}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-muted/30 rounded-lg"
            >
              <p className="text-sm text-muted-foreground">
                {tips[currentTip]}
              </p>
            </motion.div>
          )}

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="mt-6 w-full"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const CompactVariant = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex items-center gap-3 p-4 bg-muted/30 rounded-lg",
        className
      )}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-5 w-5 text-primary" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {onCancel && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );

  const DefaultVariant = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={className}
    >
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
          </div>

          <h3 className="text-lg font-semibold mb-2">{title}</h3>

          {subtitle && <p className="text-muted-foreground mb-4">{subtitle}</p>}

          <motion.p
            key={currentMessage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground mb-4"
          >
            {loadingMessages[currentMessage]}
          </motion.p>

          <div className="space-y-2 mb-4">
            <Progress value={displayProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(displayProgress)}% complete
            </p>
          </div>

          {showTips && (
            <motion.div
              key={currentTip}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-muted/30 rounded text-left"
            >
              <p className="text-sm text-muted-foreground">
                {tips[currentTip]}
              </p>
            </motion.div>
          )}

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="mt-4"
              size="sm"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {variant === "fullscreen" && <FullscreenVariant />}
      {variant === "compact" && <CompactVariant />}
      {variant === "default" && <DefaultVariant />}
    </AnimatePresence>
  );
}

// Hook for managing loading states with timeout
export function useLoadingState(defaultTimeout = 15000) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [_error, setError] = useState<string | null>(null);

  const startLoading = () => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgress(100);
  };

  const setLoadingError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const updateProgress = (_value: number) => {
    setProgress(Math.min(100, Math.max(0, _value)));
  };

  return {
    isLoading,
    progress,
    _error,
    startLoading,
    stopLoading,
    setLoadingError,
    updateProgress,
  };
}
