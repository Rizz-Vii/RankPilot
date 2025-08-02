/**
 * Enhanced Auth Service - Leveraging Database Indexes
 * 
 * Optimized authentication service utilizing our comprehensive
 * database structure with 25 composite indexes for performance.
 * 
 * Generated: July 26, 2025
 * Indexes Used: users (subscriptionTier+createdAt, subscriptionStatus+lastLoginAt, role+createdAt)
 */

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface UserAnalytics {
    totalUsers: number;
    usersByTier: Record<string, number>;
    usersByRole: Record<string, number>;
    recentLogins: number;
    subscriptionTrends: Array<{
        tier: string;
        count: number;
        growth: number;
    }>;
}

export interface UserActivity {
    loginFrequency: number;
    lastLoginDays: number;
    subscriptionAge: number;
    activityScore: number;
}

export class EnhancedAuthService {

    /**
     * Get user analytics leveraging subscription tier indexes
     * Uses: subscriptionTier+createdAt, role+createdAt indexes
     */
    static async getUserAnalytics(): Promise<UserAnalytics> {
        try {
            // Query users by subscription tier (uses subscriptionTier+createdAt _index)
            const tiers = ['free', 'starter', 'agency', 'enterprise', 'admin'];
            const tierCounts: Record<string, number> = {};

            for (const tier of tiers) {
                const tierQuery = query(
                    collection(db, "users"),
                    where("subscriptionTier", "==", tier),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(tierQuery);
                tierCounts[tier] = snapshot.size;
            }

            // Query users by role (uses role+createdAt _index)
            const roles = ['user', 'admin', 'moderator'];
            const roleCounts: Record<string, number> = {};

            for (const role of roles) {
                const roleQuery = query(
                    collection(db, "users"),
                    where("role", "==", role),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(roleQuery);
                roleCounts[role] = snapshot.size;
            }

            // Get recent logins (uses subscriptionStatus+lastLoginAt _index)
            const recentLoginQuery = query(
                collection(db, "users"),
                where("subscriptionStatus", "in", ["active", "free"]),
                orderBy("lastLoginAt", "desc"),
                limit(100)
            );
            const recentSnapshot = await getDocs(recentLoginQuery);

            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentLogins = recentSnapshot.docs.filter(doc => {
                const lastLogin = doc.data().lastLoginAt?.toDate();
                return lastLogin && lastLogin > sevenDaysAgo;
            }).length;

            const totalUsers = Object.values(tierCounts).reduce((sum, count) => sum + count, 0);

            return {
                totalUsers,
                usersByTier: tierCounts,
                usersByRole: roleCounts,
                recentLogins,
                subscriptionTrends: tiers.map(tier => ({
                    tier,
                    count: tierCounts[tier] || 0,
                    growth: Math.round((tierCounts[tier] || 0) / Math.max(1, totalUsers) * 100)
                }))
            };

        } catch (_error) {
            console.error("Error fetching user analytics:", _error);
            return {
                totalUsers: 0,
                usersByTier: {},
                usersByRole: {},
                recentLogins: 0,
                subscriptionTrends: []
            };
        }
    }

    /**
     * Get user activity metrics for engagement analysis
     * Uses: subscriptionStatus+lastLoginAt index
     */
    static async getUserActivity(userId: string): Promise<UserActivity> {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (!userDoc.exists()) {
                return { loginFrequency: 0, lastLoginDays: 999, subscriptionAge: 0, activityScore: 0 };
            }

            const userData = userDoc.data();
            const lastLogin = userData.lastLoginAt?.toDate();
            const createdAt = userData.createdAt?.toDate();
            const now = new Date();

            const lastLoginDays = lastLogin ?
                Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : 999;

            const subscriptionAge = createdAt ?
                Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

            // Calculate activity score based on recency and engagement
            let activityScore = 0;
            if (lastLoginDays <= 1) activityScore = 100;
            else if (lastLoginDays <= 7) activityScore = 80;
            else if (lastLoginDays <= 30) activityScore = 60;
            else if (lastLoginDays <= 90) activityScore = 30;
            else activityScore = 10;

            return {
                loginFrequency: userData.loginCount || 0,
                lastLoginDays,
                subscriptionAge,
                activityScore
            };

        } catch (_error) {
            console.error("Error fetching user activity:", _error);
            return { loginFrequency: 0, lastLoginDays: 999, subscriptionAge: 0, activityScore: 0 };
        }
    }

    /**
     * Update user login tracking with timestamp
     * Optimizes lastLoginAt for our subscriptionStatus+lastLoginAt index
     */
    static async updateLoginTracking(userId: string): Promise<void> {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                lastLoginAt: Timestamp.now(),
                loginCount: (await getDoc(userRef)).data()?.loginCount || 0 + 1
            });
        } catch (_error) {
            console.error("Error updating login tracking:", _error);
        }
    }

    /**
     * Get subscription insights using tier-based queries
     * Uses: subscriptionTier+createdAt index for trend analysis
     */
    static async getSubscriptionInsights() {
        try {
            const insights = {
                conversions: { free_to_starter: 0, starter_to_agency: 0, agency_to_enterprise: 0 },
                churn: { this_month: 0, last_month: 0 },
                growth: { new_subscriptions: 0, upgrade_rate: 0 }
            };

            // Use our indexes to get subscription data efficiently
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            for (const tier of ['starter', 'agency', 'enterprise']) {
                const tierQuery = query(
                    collection(db, "users"),
                    where("subscriptionTier", "==", tier),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(tierQuery);

                const recentSubscriptions = snapshot.docs.filter(doc => {
                    const createdAt = doc.data().createdAt?.toDate();
                    return createdAt && createdAt > thirtyDaysAgo;
                }).length;

                insights.growth.new_subscriptions += recentSubscriptions;
            }

            return insights;

        } catch (_error) {
            console.error("Error fetching subscription insights:", _error);
            return { conversions: {}, churn: {}, growth: {} };
        }
    }
}
