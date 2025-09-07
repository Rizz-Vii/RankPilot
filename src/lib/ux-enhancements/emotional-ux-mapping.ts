/**
 * Emotional UX Mapping System
 * Research-backed: 70% of decisions are emotional, 94% first impressions design-related
 * Maps user emotional states throughout journey for optimization
 */

import { z } from "zod";

export const EmotionalStateSchema = z.enum([
  "curiosity", // Initial interest, exploration
  "confusion", // User is lost or uncertain
  "frustration", // Blocked or experiencing friction
  "confidence", // User feels capable and in control
  "delight", // Positive surprise, exceeds expectations
  "trust", // User feels secure and confident in platform
  "mastery", // User feels competent and skilled
  "advocacy", // User wants to share and recommend
  "abandonment", // User is about to leave
]);

export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

export const UserJourneyStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  idealEmotions: z.array(EmotionalStateSchema),
  riskEmotions: z.array(EmotionalStateSchema),
  keyTouchpoints: z.array(z.string()),
  frictionPoints: z.array(z.string()),
  optimizationOpportunities: z.array(z.string()),
  metrics: z.array(z.string()),
});

export type UserJourneyStage = z.infer<typeof UserJourneyStageSchema>;

export const emotionalTriggers = {
  curiosity: {
    colors: ["bg-primary/10", "text-primary"],
    animations: ["animate-pulse-subtle", "animate-fade-in"],
    messaging: ["Discover", "Explore", "See what's possible"],
    microCopy: ["Click to reveal", "Uncover insights", "What will you find?"],
  },
  confusion: {
    colors: ["bg-warning/10", "text-warning-foreground"],
    animations: ["animate-help-bounce", "animate-guide-pulse"],
    messaging: ["Let us guide you", "Here's how it works", "Step by step"],
    microCopy: [
      "Need guidance?",
      "Let's clarify",
      "We'll help you through this",
    ],
  },
  frustration: {
    colors: ["bg-destructive/10", "text-destructive-foreground"],
    animations: ["animate-shake", "animate-warning"],
    messaging: ["Let us help", "We'll fix this", "Sorry about that"],
    microCopy: ["Need help?", "Try this instead", "We're here for you"],
  },
  confidence: {
    colors: ["bg-success/10", "text-success-foreground"],
    animations: ["animate-slide-up", "animate-success-pulse"],
    messaging: ["You're in control", "Perfect choice", "Excellent progress"],
    microCopy: ["Well done!", "You've got this", "Looking great"],
  },
  delight: {
    colors: ["bg-accent/10", "text-accent-foreground"],
    animations: ["animate-bounce-subtle", "animate-celebration"],
    messaging: ["Wow!", "Amazing results", "This is incredible"],
    microCopy: ["🎉", "✨ Magic!", "Better than expected"],
  },
  trust: {
    colors: ["bg-success/10", "text-success-foreground"],
    animations: ["animate-steady", "animate-secure"],
    messaging: ["Secure", "Protected", "Reliable"],
    microCopy: ["Your data is safe", "Verified", "Trusted by experts"],
  },
  mastery: {
    colors: ["bg-accent/10", "text-accent-foreground"],
    animations: ["animate-mastery-glow", "animate-expert-pulse"],
    messaging: ["Expert level", "You've mastered this", "Advanced user"],
    microCopy: ["Pro tip", "Expert insight", "You're an expert now"],
  },
  advocacy: {
    colors: ["bg-primary/10", "text-primary"],
    animations: ["animate-share-pulse", "animate-social-glow"],
    messaging: ["Share your success", "Tell others", "Spread the word"],
    microCopy: ["Share this", "Tell a friend", "Love to share?"],
  },
  abandonment: {
    colors: ["bg-warning/10", "text-warning-foreground"],
    animations: ["animate-retention-pulse", "animate-comeback"],
    messaging: ["Wait!", "Before you go", "One more thing"],
    microCopy: ["Stay with us", "Don't miss out", "Quick question?"],
  },
} as const;

export const neuroSEOJourneyMap: UserJourneyStage[] = [
  {
    id: "discovery",
    name: "Discovery",
    description: "User first learns about NeuroSEO™",
    idealEmotions: ["curiosity", "trust"],
    riskEmotions: ["confusion", "frustration"],
    keyTouchpoints: ["landing_page", "hero_section", "value_proposition"],
    frictionPoints: [
      "complex_terminology",
      "overwhelming_features",
      "unclear_pricing",
    ],
    optimizationOpportunities: [
      "Simplify AI terminology",
      "Progressive value revelation",
      "Social proof integration",
    ],
    metrics: ["bounce_rate", "time_on_page", "scroll_depth"],
  },
  {
    id: "trial_signup",
    name: "Trial Signup",
    description: "User decides to try NeuroSEO™",
    idealEmotions: ["confidence", "curiosity"],
    riskEmotions: ["confusion", "abandonment"],
    keyTouchpoints: ["signup_form", "tier_selection", "email_verification"],
    frictionPoints: ["long_form", "tier_confusion", "verification_delay"],
    optimizationOpportunities: [
      "Progressive form fields",
      "Clear tier comparison",
      "Instant access option",
    ],
    metrics: ["conversion_rate", "form_abandonment", "verification_time"],
  },
  {
    id: "first_analysis",
    name: "First Analysis",
    description: "User runs their first NeuroSEO™ analysis",
    idealEmotions: ["curiosity", "confidence", "delight"],
    riskEmotions: ["confusion", "frustration"],
    keyTouchpoints: ["url_input", "analysis_progress", "results_display"],
    frictionPoints: ["slow_analysis", "unclear_progress", "complex_results"],
    optimizationOpportunities: [
      "Real-time progress updates",
      "Contextual result explanations",
      "Quick wins highlighting",
    ],
    metrics: ["completion_rate", "analysis_time", "result_engagement"],
  },
  {
    id: "value_realization",
    name: "Value Realization",
    description: "User understands NeuroSEO™ value",
    idealEmotions: ["delight", "mastery", "trust"],
    riskEmotions: ["confusion", "frustration"],
    keyTouchpoints: [
      "insights_interpretation",
      "actionable_recommendations",
      "success_metrics",
    ],
    frictionPoints: [
      "complex_insights",
      "vague_recommendations",
      "unclear_impact",
    ],
    optimizationOpportunities: [
      "Simplified insight summaries",
      "Prioritized action items",
      "Impact visualization",
    ],
    metrics: [
      "insight_clarity_score",
      "recommendation_adoption",
      "user_satisfaction",
    ],
  },
  {
    id: "continued_usage",
    name: "Continued Usage",
    description: "User becomes regular NeuroSEO™ user",
    idealEmotions: ["mastery", "confidence", "trust"],
    riskEmotions: ["abandonment", "frustration"],
    keyTouchpoints: ["dashboard_return", "new_analyses", "progress_tracking"],
    frictionPoints: [
      "feature_discovery",
      "progress_clarity",
      "value_maintenance",
    ],
    optimizationOpportunities: [
      "Personalized dashboards",
      "Feature discovery prompts",
      "Progress celebrations",
    ],
    metrics: ["return_rate", "feature_adoption", "session_frequency"],
  },
  {
    id: "advocacy",
    name: "Advocacy",
    description: "User recommends NeuroSEO™ to others",
    idealEmotions: ["advocacy", "delight", "trust"],
    riskEmotions: ["abandonment"],
    keyTouchpoints: ["sharing_features", "referral_system", "testimonials"],
    frictionPoints: [
      "sharing_barriers",
      "referral_friction",
      "value_communication",
    ],
    optimizationOpportunities: [
      "Easy sharing mechanisms",
      "Incentivized referrals",
      "Success story templates",
    ],
    metrics: ["referral_rate", "sharing_frequency", "advocacy_score"],
  },
];

export class EmotionalUXMapper {
  private static readonly STORAGE_KEY = "rankpilot_emotional_state";

  static trackEmotionalState(
    userId: string,
    stage: string,
    emotion: EmotionalState,
    context: Record<string, unknown> = {}
  ): void {
    const timestamp = new Date().toISOString();
    const data = {
      userId,
      stage,
      emotion,
      context,
      timestamp,
    };

    // Store locally for immediate use
    if (typeof window !== "undefined") {
      const stored = this.getStoredEmotionalData(userId);
      stored.push(data);
      localStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`,
        JSON.stringify(stored.slice(-50)) // Keep last 50 entries
      );
    }

    // In production, this would also send to analytics
    console.log("Emotional state tracked:", data);
  }

  static getStoredEmotionalData(userId: string): unknown[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  }

  static getEmotionalTrendForStage(
    userId: string,
    stage: string
  ): EmotionalState[] {
    const data = this.getStoredEmotionalData(userId) as Array<{
      stage?: string;
      emotion?: EmotionalState;
    }>;
    return data
      .filter((entry) => entry.stage === stage)
      .map((entry) => entry.emotion as EmotionalState)
      .filter(Boolean) as EmotionalState[];
  }

  static getLastEmotionalState(userId: string): EmotionalState | null {
    const data = this.getStoredEmotionalData(userId) as Array<{
      emotion?: EmotionalState;
    }>;
    return data.length > 0
      ? ((data[data.length - 1].emotion as EmotionalState | undefined) ?? null)
      : null;
  }

  static getOptimizationSuggestions(
    userId: string,
    currentStage: string
  ): string[] {
    const stageData = neuroSEOJourneyMap.find(
      (stage) => stage.id === currentStage
    );
    if (!stageData) return [];

    const recentEmotions = this.getEmotionalTrendForStage(userId, currentStage);
    const hasRiskEmotions = recentEmotions.some((emotion) =>
      stageData.riskEmotions.includes(emotion)
    );

    if (hasRiskEmotions) {
      return stageData.optimizationOpportunities;
    }

    return [];
  }

  static getContextualMicroCopy(
    currentEmotion: EmotionalState,
    fallback: string = ""
  ): string {
    const triggers = emotionalTriggers[currentEmotion];
    if (!triggers || !triggers.microCopy.length) return fallback;

    // Return random microcopy for the emotion
    return triggers.microCopy[
      Math.floor(Math.random() * triggers.microCopy.length)
    ];
  }

  static getEmotionalStyling(emotion: EmotionalState): {
    colors: string[];
    animations: string[];
    messaging: string[];
  } {
    const triggers = emotionalTriggers[emotion];
    if (!triggers) {
      return {
        colors: ["bg-muted", "text-muted-foreground"],
        animations: ["animate-none"],
        messaging: ["Continue"],
      };
    }

    return {
      colors: [...triggers.colors],
      animations: [...triggers.animations],
      messaging: [...triggers.messaging],
    };
  }
}

export const useEmotionalUXMapping = (userId: string, currentStage: string) => {
  const trackEmotion = (
    emotion: EmotionalState,
    context: Record<string, unknown> = {}
  ) => {
    EmotionalUXMapper.trackEmotionalState(
      userId,
      currentStage,
      emotion,
      context
    );
  };

  const getLastEmotion = () => {
    return EmotionalUXMapper.getLastEmotionalState(userId);
  };

  const getOptimizations = () => {
    return EmotionalUXMapper.getOptimizationSuggestions(userId, currentStage);
  };

  const getContextualCopy = (
    emotion: EmotionalState,
    fallback: string = ""
  ) => {
    return EmotionalUXMapper.getContextualMicroCopy(emotion, fallback);
  };

  const getStyling = (emotion: EmotionalState) => {
    return EmotionalUXMapper.getEmotionalStyling(emotion);
  };

  return {
    trackEmotion,
    getLastEmotion,
    getOptimizations,
    getContextualCopy,
    getStyling,
    currentStageData: neuroSEOJourneyMap.find(
      (stage) => stage.id === currentStage
    ),
  };
};
