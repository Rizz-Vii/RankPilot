/**
 * UX Enhancement Integration Example
 * Demonstrates how to use all 5 UX enhancement libraries together
 * Perfect for immediate implementation in NeuroSEO™ components
 */

"use client";

import "./integration-example.css";
import React, { useEffect, useState } from "react";
import { useProgressiveOnboarding } from "./progressive-onboarding";
import {
  useAnalysisMicroInteractions,
  triggerMicroInteraction,
} from "./micro-interactions";
import { useEmotionalUXMapping } from "./emotional-ux-mapping";
import { useGamification } from "./gamification-system";
import { useMobileRetention } from "./mobile-retention-optimizer";

interface UXEnhancedComponentProps {
  userId: string;
  userTier: "free" | "starter" | "agency" | "enterprise" | "admin";
  children: React.ReactNode;
  feature?: string;
  currentStage?: string;
}

export const UXEnhancedComponent: React.FC<UXEnhancedComponentProps> = ({
  userId,
  userTier,
  children,
  feature = "neuroseo-dashboard",
  currentStage = "discovery",
}) => {
  // Initialize all UX enhancement hooks
  const onboarding = useProgressiveOnboarding(
    userId,
    "neuroseoSuite",
    userTier
  );
  const microInteractions = useAnalysisMicroInteractions();
  const emotionalMapping = useEmotionalUXMapping(userId, currentStage);
  const gamification = useGamification(userId);
  const mobileOptimization = useMobileRetention();

  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<
    "curiosity" | "confidence"
  >("curiosity");

  useEffect(() => {
    // Apply mobile optimizations on component mount
    mobileOptimization.applyMobileOptimizations();

    // Check if onboarding should be shown
    if (onboarding.nextStep && !onboarding.isComplete) {
      setIsOnboardingVisible(true);
    }

    // Track initial emotional state
    emotionalMapping.trackEmotion("curiosity", {
      feature,
      userTier,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleActionComplete = (
    action: string,
    metadata: Record<string, unknown> = {}
  ) => {
    // Track gamification action
    const { newAchievements, levelUp } = gamification.trackAction(action, {
      feature,
      ...metadata,
    });

    // Trigger micro-interaction
    triggerMicroInteraction("medium", {
      haptic: true,
      sound: "analysis-complete",
    });

    // Update emotional state based on success
    setCurrentEmotion("confidence");
    emotionalMapping.trackEmotion("confidence", {
      action,
      achievements: newAchievements.length,
      levelUp,
    });

    // Show achievement notifications if any
    if (newAchievements.length > 0) {
      newAchievements.forEach((achievement) => {
        console.log(`🎉 Achievement unlocked: ${achievement.title}`);
        // In real implementation, show toast notification
      });
    }

    if (levelUp) {
      console.log(`🚀 Level up! You're now level ${gamification.stats.level}`);
      // In real implementation, show level up animation
    }
  };

  const handleOnboardingStepComplete = (stepId: string) => {
    onboarding.markComplete(stepId);

    // Track as gamification action
    handleActionComplete("onboarding_step_completed", { stepId });

    // Move to next step or hide onboarding
    if (onboarding.isComplete) {
      setIsOnboardingVisible(false);
      emotionalMapping.trackEmotion("mastery", {
        onboardingComplete: true,
        completionPercentage: onboarding.completionPercentage,
      });
    }
  };

  // Get mobile audit status
  const touchTargetStatus = mobileOptimization.getTouchTargetStatus();
  const streakInfo = gamification.getStreakInfo();

  return (
    <div className="ux-enhanced-container">
      {/* Progress indicators */}
      <div className="mb-4 space-y-2">
        {/* Onboarding progress */}
        {!onboarding.isComplete && (
          <div className="bg-primary/10 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary">
                Getting Started Progress
              </span>
              <span className="text-xs text-primary/90">
                {onboarding.completionPercentage}% complete
              </span>
            </div>
            <div className="w-full bg-primary/25 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300 progress-bar"
                data-progress={onboarding.completionPercentage}
              />
            </div>
          </div>
        )}

        {/* Gamification status */}
  <div className="bg-success/10 p-3 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-success">
              Level {gamification.stats.level} • {streakInfo.message}
            </span>
            <div className="text-xs text-success/90">
              {gamification.stats.totalPoints} points •{" "}
              {streakInfo.encouragement}
            </div>
          </div>
          <span className="text-2xl">{streakInfo.emoji}</span>
        </div>

        {/* Mobile compliance status */}
        {touchTargetStatus.percentage < 100 && (
          <div className="bg-warning/10 p-3 rounded-lg">
            <span className="text-sm text-warning">
              Mobile Optimization: {touchTargetStatus.percentage}% compliant
            </span>
            <div className="text-xs text-warning/90">
              {touchTargetStatus.nonCompliantTargets.length} elements need 48px
              touch targets
            </div>
          </div>
        )}
      </div>

      {/* Onboarding overlay */}
      {isOnboardingVisible && onboarding.nextStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {onboarding.nextStep.title}
              </h3>
              <p className="text-muted-foreground mt-2">
                {onboarding.nextStep.description}
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                Estimated time:{" "}
                {Math.round(onboarding.nextStep.estimatedTime / 60)} minutes
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() =>
                  handleOnboardingStepComplete(onboarding.nextStep!.id)
                }
                className="tool-link bg-primary text-primary-foreground px-4 py-2 rounded-lg flex-1"
              >
                Continue
              </button>
              <button
                onClick={() => setIsOnboardingVisible(false)}
                className="tool-link bg-muted text-foreground px-4 py-2 rounded-lg"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content with emotional styling */}
      <div
        className={`transition-all duration-300 ${
          currentEmotion === "confidence"
            ? "bg-success/10 border-success/30"
            : "bg-primary/10 border-primary/30"
        } border rounded-lg p-4`}
      >
        {children}
      </div>

      {/* Action buttons with micro-interactions */}
      <div className="mt-4 flex space-x-3">
        <button
          onClick={() => handleActionComplete("analysis_completed")}
          onMouseEnter={() =>
            triggerMicroInteraction("light", {
              haptic: true,
            })
          }
          className="tool-link bg-primary text-primary-foreground px-6 py-3 rounded-lg"
          disabled={microInteractions.currentState === "processing"}
        >
          {microInteractions.currentState === "processing" ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            "Start Analysis"
          )}
        </button>

        <button
          onClick={() => {
            const auditResults = mobileOptimization.runAudit();
            console.log("Mobile audit:", auditResults);
            handleActionComplete("mobile_audit_completed", {
              score: auditResults.overallScore,
            });
          }}
          className="tool-link bg-secondary text-secondary-foreground px-6 py-3 rounded-lg"
        >
          Run Mobile Audit
        </button>
      </div>

      {/* Debug information (development only) */}
      {process.env.NODE_ENV === "development" && (
  <details className="mt-4 p-3 bg-muted rounded text-xs">
          <summary className="cursor-pointer font-medium">
            UX Enhancement Debug Info
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(
              {
                onboarding: {
                  completionPercentage: onboarding.completionPercentage,
                  nextStep: onboarding.nextStep?.id,
                  isComplete: onboarding.isComplete,
                },
                gamification: {
                  level: gamification.stats.level,
                  points: gamification.stats.totalPoints,
                  streak: gamification.stats.currentStreak,
                },
                microInteractions: {
                  currentState: microInteractions.currentState,
                },
                mobileOptimization: {
                  compliance: touchTargetStatus.percentage,
                  nonCompliantCount:
                    touchTargetStatus.nonCompliantTargets.length,
                },
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
};

// Example usage component for NeuroSEO™ Dashboard
export const EnhancedNeuroSEODashboard: React.FC<{
  userId: string;
  userTier: "free" | "starter" | "agency" | "enterprise" | "admin";
}> = ({ userId, userTier }) => {
  return (
    <UXEnhancedComponent
      userId={userId}
      userTier={userTier}
      feature="neuroseo-dashboard"
      currentStage="analysis"
    >
      <div className="space-y-4">
  <h2 className="text-2xl font-bold text-foreground">
          NeuroSEO™ Analysis Dashboard
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="tool-card bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">AI Visibility Engine</h3>
            <p className="text-muted-foreground text-sm">
              Track how AI models cite and reference your content
            </p>
          </div>

          <div className="tool-card bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">TrustBlock™</h3>
            <p className="text-muted-foreground text-sm">
              Optimize E-A-T signals for better search rankings
            </p>
          </div>
        </div>

        <div className="tool-card bg-white p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Competitive Analysis</h3>
          <p className="text-muted-foreground text-sm">
            Compare your SEO performance against competitors
          </p>
        </div>
      </div>
    </UXEnhancedComponent>
  );
};

export default UXEnhancedComponent;
