/**
 * Micro-interactions for NeuroSEO™ Analysis States
 * Research-backed: Improves user confidence and engagement
 * Uses existing semantic tokens for consistency
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type AnalysisState =
  | "idle"
  | "initializing"
  | "crawling"
  | "analyzing"
  | "processing"
  | "finalizing"
  | "complete"
  | "error";

export type MicroInteractionConfig = {
  duration: number;
  easing: string;
  haptic?: "light" | "medium" | "heavy";
  sound?: string;
};

export const analysisStateConfig: Record<
  AnalysisState,
  {
    label: string;
    description: string;
    icon: string;
    colorClass: string;
    bgClass: string;
    animation: string;
    estimatedDuration: number; // seconds
    microInteraction: MicroInteractionConfig;
  }
> = {
  idle: {
    label: "Ready",
    description: "Click to start analysis",
    icon: "play-circle",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/10",
    animation: "animate-pulse-subtle",
    estimatedDuration: 0,
    microInteraction: { duration: 200, easing: "ease-out" },
  },
  initializing: {
    label: "Initializing",
    description: "Preparing NeuroSEO™ engines...",
    icon: "loader",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    animation: "animate-spin-slow",
    estimatedDuration: 3,
    microInteraction: { duration: 300, easing: "ease-in-out", haptic: "light" },
  },
  crawling: {
    label: "Crawling",
    description: "NeuralCrawler™ extracting content...",
    icon: "search",
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
    animation: "animate-bounce-subtle",
    estimatedDuration: 15,
    microInteraction: {
      duration: 400,
      easing: "ease-in-out",
      haptic: "medium",
    },
  },
  analyzing: {
    label: "Analyzing",
    description: "SemanticMap™ processing content...",
    icon: "brain",
    colorClass: "text-purple-600",
    bgClass: "bg-purple-50",
    animation: "animate-glow",
    estimatedDuration: 20,
    microInteraction: {
      duration: 500,
      easing: "ease-in-out",
      haptic: "medium",
    },
  },
  processing: {
    label: "Processing",
    description: "AI Visibility Engine optimizing...",
    icon: "cpu",
    colorClass: "text-orange-600",
    bgClass: "bg-orange-50",
    animation: "animate-heartbeat",
    estimatedDuration: 12,
    microInteraction: { duration: 600, easing: "ease-in-out", haptic: "heavy" },
  },
  finalizing: {
    label: "Finalizing",
    description: "TrustBlock™ generating insights...",
    icon: "shield-check",
    colorClass: "text-green-600",
    bgClass: "bg-green-50",
    animation: "animate-slide-up",
    estimatedDuration: 5,
    microInteraction: { duration: 300, easing: "ease-out", haptic: "light" },
  },
  complete: {
    label: "Complete",
    description: "Analysis ready for review",
    icon: "check-circle",
    colorClass: "text-success-foreground",
    bgClass: "bg-success/10",
    animation: "animate-success-pulse",
    estimatedDuration: 0,
    microInteraction: {
      duration: 800,
      easing: "ease-out",
      haptic: "heavy",
      sound: "success",
    },
  },
  error: {
    label: "Error",
    description: "Analysis failed - please retry",
    icon: "alert-circle",
    colorClass: "text-destructive-foreground",
    bgClass: "bg-destructive/10",
    animation: "animate-shake",
    estimatedDuration: 0,
    microInteraction: {
      duration: 400,
      easing: "ease-out",
      haptic: "heavy",
      sound: "error",
    },
  },
};

export const useAnalysisMicroInteractions = () => {
  const [currentState, setCurrentState] = useState<AnalysisState>("idle");
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const triggerHapticFeedback = (type: "light" | "medium" | "heavy") => {
    if ("vibrate" in navigator && navigator.vibrate) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [200, 100, 200],
      };
      navigator.vibrate(patterns[type]);
    }
  };

  const playSound = (soundType: string) => {
    // Sound implementation would go here
    console.log(`Playing ${soundType} sound`);
  };

  const transitionToState = (newState: AnalysisState) => {
    const config = analysisStateConfig[newState];

    // Trigger micro-interaction
    if (config.microInteraction.haptic) {
      triggerHapticFeedback(config.microInteraction.haptic);
    }

    if (config.microInteraction.sound) {
      playSound(config.microInteraction.sound);
    }

    setCurrentState(newState);
    setProgress(0);
    setElapsedTime(0);
  };

  const updateProgress = (newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
  };

  useEffect(() => {
    if (
      currentState === "idle" ||
      currentState === "complete" ||
      currentState === "error"
    ) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentState]);

  const getEstimatedTimeRemaining = () => {
    const config = analysisStateConfig[currentState];
    return Math.max(0, config.estimatedDuration - elapsedTime);
  };

  return {
    currentState,
    progress,
    elapsedTime,
    config: analysisStateConfig[currentState],
    transitionToState,
    updateProgress,
    getEstimatedTimeRemaining,
  };
};

export interface AnalysisStateIndicatorProps {
  state: AnalysisState;
  progress?: number;
  className?: string;
}

export const getAnalysisStateClasses = (
  state: AnalysisState,
  progress?: number
) => {
  const config = analysisStateConfig[state];

  return {
    container: cn(
      "flex items-center gap-3 p-4 rounded-lg border transition-all duration-300",
      config.bgClass,
      config.animation
    ),
    icon: cn(
      "flex items-center justify-center w-8 h-8 rounded-full",
      config.colorClass,
      config.bgClass
    ),
    label: cn("font-medium", config.colorClass),
    description: "text-sm text-muted-foreground",
    progressBar: cn(
      "h-2 rounded-full transition-all duration-300 ease-out",
      config.colorClass.replace("text-", "bg-")
    ),
    config,
    progress: progress ? Math.round(progress) : undefined,
  };
};

export interface MicroInteractionButtonConfig {
  state?: AnalysisState;
  disabled?: boolean;
  hapticFeedback?: boolean;
  soundFeedback?: boolean;
}

export const getMicroInteractionButtonClasses = (
  config: MicroInteractionButtonConfig,
  isPressed: boolean = false
) => {
  const { disabled = false } = config;

  return cn(
    "relative overflow-hidden rounded-lg px-4 py-2 font-medium",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02] active:scale-[0.98]",
    "focus:outline-none focus:ring-2 focus:ring-primary/20",
    disabled && "opacity-50 cursor-not-allowed",
    isPressed && "scale-[0.98]"
  );
};

export const triggerMicroInteraction = (
  type: "light" | "medium" | "heavy",
  options: { haptic?: boolean; sound?: string } = {}
) => {
  // Haptic feedback
  if (options.haptic && "vibrate" in navigator && navigator.vibrate) {
    const patterns = {
      light: [50],
      medium: [100],
      heavy: [200, 100, 200],
    };
    navigator.vibrate(patterns[type]);
  }

  // Sound feedback
  if (options.sound) {
    console.log(`Playing ${options.sound} sound`);
    // Sound implementation would go here
  }
};
