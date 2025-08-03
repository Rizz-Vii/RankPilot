/**
 * Gamification System for Usage Tracking & Achievements
 * Research-backed: Duolingo's streak model increases retention by 3x
 * Implements achievement psychology and progress visualization
 */

import { z } from "zod";

export const AchievementTypeSchema = z.enum([
  "first_analysis",
  "weekly_streak",
  "monthly_streak",
  "feature_explorer",
  "power_user",
  "share_master",
  "optimization_expert",
  "early_adopter",
  "feedback_champion",
  "tier_upgrade",
]);

export type AchievementType = z.infer<typeof AchievementTypeSchema>;

export const AchievementSchema = z.object({
  id: z.string(),
  type: AchievementTypeSchema,
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  points: z.number(),
  requiredTier: z
    .enum(["free", "starter", "agency", "enterprise", "admin"])
    .optional(),
  criteria: z.object({
    metric: z.string(),
    threshold: z.number(),
    timeframe: z.string().optional(),
    conditions: z.array(z.string()).optional(),
  }),
  rewards: z.object({
    points: z.number(),
    badge: z.string(),
    unlocks: z.array(z.string()).optional(),
    discounts: z.array(z.string()).optional(),
  }),
  unlockedAt: z.date().optional(),
});

export type Achievement = z.infer<typeof AchievementSchema>;

export const UserStatsSchema = z.object({
  userId: z.string(),
  totalPoints: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastActivity: z.date(),
  totalAnalyses: z.number(),
  featuresUsed: z.array(z.string()),
  achievementsUnlocked: z.array(z.string()),
  level: z.number(),
  experiencePoints: z.number(),
  nextLevelXP: z.number(),
});

export type UserStats = z.infer<typeof UserStatsSchema>;

export const achievements: Achievement[] = [
  {
    id: "first_analysis_rookie",
    type: "first_analysis",
    title: "NeuroSEO™ Rookie",
    description: "Complete your first NeuroSEO™ analysis",
    icon: "🚀",
    rarity: "common",
    points: 100,
    criteria: {
      metric: "analyses_completed",
      threshold: 1,
    },
    rewards: {
      points: 100,
      badge: "rookie_badge",
      unlocks: ["advanced_features_preview"],
    },
  },
  {
    id: "weekly_streak_fire",
    type: "weekly_streak",
    title: "On Fire! 🔥",
    description: "Use NeuroSEO™ for 7 consecutive days",
    icon: "🔥",
    rarity: "rare",
    points: 500,
    criteria: {
      metric: "consecutive_days",
      threshold: 7,
      timeframe: "weekly",
    },
    rewards: {
      points: 500,
      badge: "fire_streak_badge",
      discounts: ["10_percent_upgrade"],
    },
  },
  {
    id: "monthly_streak_legend",
    type: "monthly_streak",
    title: "SEO Legend",
    description: "Maintain a 30-day NeuroSEO™ streak",
    icon: "👑",
    rarity: "legendary",
    points: 2000,
    criteria: {
      metric: "consecutive_days",
      threshold: 30,
      timeframe: "monthly",
    },
    rewards: {
      points: 2000,
      badge: "legend_crown",
      unlocks: ["exclusive_features", "priority_support"],
    },
  },
  {
    id: "feature_explorer_scout",
    type: "feature_explorer",
    title: "Feature Scout",
    description: "Try 5 different NeuroSEO™ features",
    icon: "🔍",
    rarity: "common",
    points: 300,
    criteria: {
      metric: "unique_features_used",
      threshold: 5,
    },
    rewards: {
      points: 300,
      badge: "scout_badge",
      unlocks: ["feature_tips"],
    },
  },
  {
    id: "power_user_master",
    type: "power_user",
    title: "NeuroSEO™ Master",
    description: "Complete 100 analyses",
    icon: "⚡",
    rarity: "epic",
    points: 1500,
    requiredTier: "agency",
    criteria: {
      metric: "analyses_completed",
      threshold: 100,
    },
    rewards: {
      points: 1500,
      badge: "master_lightning",
      unlocks: ["custom_reports", "api_access"],
    },
  },
  {
    id: "share_master_ambassador",
    type: "share_master",
    title: "SEO Ambassador",
    description: "Share 10 NeuroSEO™ insights",
    icon: "📢",
    rarity: "rare",
    points: 750,
    criteria: {
      metric: "insights_shared",
      threshold: 10,
    },
    rewards: {
      points: 750,
      badge: "ambassador_badge",
      discounts: ["referral_bonus"],
    },
  },
];

export const levelThresholds = [
  { level: 1, xpRequired: 0, title: "Beginner" },
  { level: 2, xpRequired: 500, title: "Learner" },
  { level: 3, xpRequired: 1200, title: "Practitioner" },
  { level: 4, xpRequired: 2500, title: "Expert" },
  { level: 5, xpRequired: 5000, title: "Master" },
  { level: 6, xpRequired: 8500, title: "Guru" },
  { level: 7, xpRequired: 13000, title: "Legend" },
  { level: 8, xpRequired: 20000, title: "Mythical" },
];

export class GamificationEngine {
  private static readonly STORAGE_KEY = "rankpilot_gamification";

  static getUserStats(userId: string): UserStats {
    if (typeof window === "undefined") {
      return this.getDefaultStats(userId);
    }

    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
    if (!stored) {
      return this.getDefaultStats(userId);
    }

    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        lastActivity: new Date(parsed.lastActivity),
      };
    } catch {
      return this.getDefaultStats(userId);
    }
  }

  private static getDefaultStats(userId: string): UserStats {
    return {
      userId,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivity: new Date(),
      totalAnalyses: 0,
      featuresUsed: [],
      achievementsUnlocked: [],
      level: 1,
      experiencePoints: 0,
      nextLevelXP: 500,
    };
  }

  static updateUserStats(
    userId: string,
    updates: Partial<UserStats>
  ): UserStats {
    const currentStats = this.getUserStats(userId);
    const newStats = { ...currentStats, ...updates };

    // Update level based on XP
    const levelInfo = this.calculateLevel(newStats.experiencePoints);
    newStats.level = levelInfo.level;
    newStats.nextLevelXP = levelInfo.nextLevelXP;

    // Update streak
    const today = new Date().toDateString();
    const lastActivityDate = new Date(currentStats.lastActivity).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastActivityDate === today) {
      // Same day, no streak change
    } else if (lastActivityDate === yesterday) {
      // Consecutive day
      newStats.currentStreak = currentStats.currentStreak + 1;
      newStats.longestStreak = Math.max(
        newStats.longestStreak,
        newStats.currentStreak
      );
    } else {
      // Streak broken
      newStats.currentStreak = 1;
    }

    newStats.lastActivity = new Date();

    // Save to storage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`,
        JSON.stringify(newStats)
      );
    }

    return newStats;
  }

  static trackAction(
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ): {
    newAchievements: Achievement[];
    updatedStats: UserStats;
    levelUp: boolean;
  } {
    const currentStats = this.getUserStats(userId);
    const newAchievements: Achievement[] = [];
    let updatedStats = { ...currentStats };
    let pointsEarned = 0;

    // Track specific actions
    switch (action) {
      case "analysis_completed":
        updatedStats.totalAnalyses += 1;
        pointsEarned += 50; // Base points for analysis
        break;

      case "feature_used":
        const feature = metadata.feature as string;
        if (!updatedStats.featuresUsed.includes(feature)) {
          updatedStats.featuresUsed.push(feature);
          pointsEarned += 25; // Points for trying new feature
        }
        break;

      case "insight_shared":
        pointsEarned += 100; // Points for sharing
        break;

      case "daily_login":
        pointsEarned += 10; // Daily login bonus
        break;
    }

    // Check for new achievements
    for (const achievement of achievements) {
      if (updatedStats.achievementsUnlocked.includes(achievement.id)) {
        continue; // Already unlocked
      }

      if (this.checkAchievementCriteria(achievement, updatedStats, metadata)) {
        newAchievements.push(achievement);
        updatedStats.achievementsUnlocked.push(achievement.id);
        pointsEarned += achievement.rewards.points;
      }
    }

    const previousLevel = updatedStats.level;
    updatedStats.experiencePoints += pointsEarned;
    updatedStats.totalPoints += pointsEarned;

    // Update stats with new values
    updatedStats = this.updateUserStats(userId, updatedStats);
    const levelUp = updatedStats.level > previousLevel;

    return { newAchievements, updatedStats, levelUp };
  }

  private static checkAchievementCriteria(
    achievement: Achievement,
    stats: UserStats,
    metadata: Record<string, any>
  ): boolean {
    const { criteria } = achievement;

    switch (criteria.metric) {
      case "analyses_completed":
        return stats.totalAnalyses >= criteria.threshold;

      case "consecutive_days":
        return stats.currentStreak >= criteria.threshold;

      case "unique_features_used":
        return stats.featuresUsed.length >= criteria.threshold;

      case "insights_shared":
        // Would track this separately in real implementation
        return metadata.totalShares >= criteria.threshold;

      default:
        return false;
    }
  }

  private static calculateLevel(xp: number): {
    level: number;
    nextLevelXP: number;
  } {
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (xp >= levelThresholds[i].xpRequired) {
        const nextThreshold = levelThresholds[i + 1];
        return {
          level: levelThresholds[i].level,
          nextLevelXP: nextThreshold ? nextThreshold.xpRequired : xp,
        };
      }
    }
    return { level: 1, nextLevelXP: 500 };
  }

  static getProgress(currentXP: number, level: number): number {
    const currentThreshold = levelThresholds.find((t) => t.level === level);
    const nextThreshold = levelThresholds.find((t) => t.level === level + 1);

    if (!currentThreshold || !nextThreshold) return 100;

    const progressXP = currentXP - currentThreshold.xpRequired;
    const requiredXP = nextThreshold.xpRequired - currentThreshold.xpRequired;

    return Math.min(100, Math.max(0, (progressXP / requiredXP) * 100));
  }

  static getStreakMotivation(streak: number): {
    message: string;
    emoji: string;
    encouragement: string;
  } {
    if (streak === 0) {
      return {
        message: "Start your streak!",
        emoji: "🌱",
        encouragement: "Every expert was once a beginner",
      };
    } else if (streak < 7) {
      return {
        message: `${streak} day streak`,
        emoji: "🔥",
        encouragement: "Keep the momentum going!",
      };
    } else if (streak < 30) {
      return {
        message: `${streak} day streak - Amazing!`,
        emoji: "⚡",
        encouragement: "You're building great habits!",
      };
    } else {
      return {
        message: `${streak} day streak - LEGENDARY!`,
        emoji: "👑",
        encouragement: "You're a true SEO master!",
      };
    }
  }
}

export const useGamification = (userId: string) => {
  const stats = GamificationEngine.getUserStats(userId);

  const trackAction = (action: string, metadata: Record<string, any> = {}) => {
    return GamificationEngine.trackAction(userId, action, metadata);
  };

  const getStreakInfo = () => {
    return GamificationEngine.getStreakMotivation(stats.currentStreak);
  };

  const getLevelProgress = () => {
    return GamificationEngine.getProgress(stats.experiencePoints, stats.level);
  };

  const getAvailableAchievements = () => {
    return achievements.filter(
      (achievement) => !stats.achievementsUnlocked.includes(achievement.id)
    );
  };

  const getUnlockedAchievements = () => {
    return achievements.filter((achievement) =>
      stats.achievementsUnlocked.includes(achievement.id)
    );
  };

  return {
    stats,
    trackAction,
    getStreakInfo,
    getLevelProgress,
    getAvailableAchievements,
    getUnlockedAchievements,
  };
};
