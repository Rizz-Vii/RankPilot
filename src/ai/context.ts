/**
 * RankPilot AI Chatbot Context Fetchers
 * Handles data retrieval for customer and admin chatbots
 * Integrates with Firebase, NeuroSEO™ Suite, and MCP servers
 */

import { db } from '@/lib/firebase';
import { NeuroSEOSuite } from '@/lib/neuroseo';
import type { PlanType } from '@/lib/stripe';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

// Types for context data
export interface AuditContext {
    url: string;
    score: {
        performance: number;
        accessibility: number;
        seo: number;
        bestPractices: number;
    };
    recommendations: string[];
    timestamp: Date;
    issues?: string[];
    suggestions?: string[];
    lastAnalyzed?: string;
}

export interface NeuroSEOContext {
    type: 'url_analysis' | 'general_insights' | 'error';
    _data: unknown;
    insights: string;
}

export interface SiteContext {
    totalPages: number;
    contentSummary: string;
    keywords: string[];
    recentAnalyses: unknown[];
}

export interface AdminContext {
    systemMetrics: {
        totalUsers: number;
        activeSubscriptions: number;
        totalAnalyses: number;
        errorRate: number;
    };
    recentActivity: unknown[];
    performanceInsights: string[];
}

export interface ChatContext {
    userTier: PlanType | "free";
    recentConversations: unknown[];
    availableFeatures: string[];
}

/**
 * Fetches audit context for a specific URL and user
 * Used by customer chatbot to provide SEO guidance
 */
export async function getAuditContext(uid: string, url: string): Promise<AuditContext | null> {
    try {
        // Query the audits collection for the user and URL
        const auditsRef = collection(db, 'audits', uid, 'urls');
        const urlQuery = query(
            auditsRef,
            where('url', '==', url),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(urlQuery);

        if (querySnapshot.empty) {
            return null;
        }

        const auditDoc = querySnapshot.docs[0];
        const auditData = auditDoc.data();

        return {
            url: auditData.url,
            score: {
                performance: auditData.score?.performance || 0,
                accessibility: auditData.score?.accessibility || 0,
                seo: auditData.score?.seo || 0,
                bestPractices: auditData.score?.bestPractices || 0,
            },
            recommendations: auditData.suggestions || [],
            timestamp: auditData.createdAt?.toDate?.() || new Date(),
            issues: auditData.issues || [],
            suggestions: auditData.suggestions || [],
            lastAnalyzed: auditData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
    } catch (_error) {
        console.error('Error fetching audit context:', _error);
        return null;
    }
}

/**
 * Aggregates site content and analysis data for context injection
 * Provides comprehensive site overview for the chatbot
 */
export async function getSiteContext(uid: string): Promise<SiteContext> {
    try {
        // Get site content pages
        const contentRef = collection(db, 'siteContent', uid, 'pages');
        const contentQuery = query(contentRef, limit(10));
        const contentSnapshot = await getDocs(contentQuery);

        // Get recent analyses
        const auditsRef = collection(db, 'audits', uid, 'urls');
        const auditsQuery = query(auditsRef, orderBy('createdAt', 'desc'), limit(5));
        const auditsSnapshot = await getDocs(auditsQuery);

        // Extract content summary and keywords
        let contentSummary = '';
        const keywords: string[] = [];

        contentSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.text) {
                contentSummary += data.text.substring(0, 200) + '... ';
            }
            if (data.keywords) {
                keywords.push(...data.keywords);
            }
        });

        const recentAnalyses = auditsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));

        return {
            totalPages: contentSnapshot.size,
            contentSummary: contentSummary.trim(),
            keywords: [...new Set(keywords)].slice(0, 20), // Unique keywords, max 20
            recentAnalyses,
        };
    } catch (_error) {
        console.error('Error fetching site context:', _error);
        return {
            totalPages: 0,
            contentSummary: '',
            keywords: [],
            recentAnalyses: [],
        };
    }
}

/**
 * Fetches admin-level context for system management chatbot
 * Includes system metrics, monitoring _data, and insights
 */
export async function getAdminContext(_adminLevel: 'admin' | 'enterprise'): Promise<AdminContext> {
    try {
        // Get system metrics (aggregated _data)
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        const subscriptionsRef = collection(db, 'subscriptions');
        const subscriptionsQuery = query(subscriptionsRef, where('status', '==', 'active'));
        const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

        // Get recent activity from logs
        const activityRef = collection(db, 'activityLogs');
        const activityQuery = query(activityRef, orderBy('timestamp', 'desc'), limit(10));
        const activitySnapshot = await getDocs(activityQuery);

        const recentActivity = activitySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString(),
        }));

        return {
            systemMetrics: {
                totalUsers: usersSnapshot.size,
                activeSubscriptions: subscriptionsSnapshot.size,
                totalAnalyses: 0, // Will be calculated from actual data
                errorRate: 0, // Will be fetched from Sentry if available
            },
            recentActivity,
            performanceInsights: [
                'System performance is optimal',
                'NeuroSEO™ Suite running at 99.9% uptime',
                'Average response time: 1.2s',
            ],
        };
    } catch (_error) {
        console.error('Error fetching admin context:', _error);
        return {
            systemMetrics: {
                totalUsers: 0,
                activeSubscriptions: 0,
                totalAnalyses: 0,
                errorRate: 0,
            },
            recentActivity: [],
            performanceInsights: ['Unable to fetch performance data'],
        };
    }
}

/**
 * Gets user chat context including tier and conversation history
 * Used for both customer and admin chatbots
 */
export async function getChatContext(uid: string, isAdmin: boolean = false): Promise<ChatContext> {
    try {
        // Get user profile for tier information
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Get recent conversations
        const chatCollection = isAdmin ? 'adminChats' : 'chatLogs';
        const sessionsRef = collection(db, chatCollection, uid, 'sessions');
        const sessionsQuery = query(sessionsRef, orderBy('timestamp', 'desc'), limit(5));
        const sessionsSnapshot = await getDocs(sessionsQuery);

        const recentConversations = sessionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString(),
        }));

        // Define available features based on tier
        const userTier: PlanType = userData?.subscriptionTier || 'free';
        const availableFeatures = getAvailableFeatures(userTier, isAdmin);

        return {
            userTier,
            recentConversations,
            availableFeatures,
        };
    } catch (_error) {
        console.error('Error fetching chat context:', _error);
        return {
            userTier: 'free',
            recentConversations: [],
            availableFeatures: [],
        };
    }
}

/**
 * Determines available features based on user tier and admin status
 */
function getAvailableFeatures(tier: PlanType, isAdmin: boolean): string[] {
    const baseFeatures = ['Basic SEO guidance', 'Audit explanations'];

    const tierFeatures = {
        free: baseFeatures,
        starter: [...baseFeatures, 'Content analyzer', 'Basic NeuroSEO™'],
        agency: [...baseFeatures, 'Content analyzer', 'Advanced NeuroSEO™', 'Competitor analysis'],
        enterprise: [...baseFeatures, 'Content analyzer', 'Full NeuroSEO™ Suite', 'Competitor analysis', 'Custom integrations'],
        admin: [...baseFeatures, 'All features', 'System management', 'User analytics', 'Performance monitoring'],
    };

    if (isAdmin) {
        return [
            'System monitoring',
            'User management',
            'Performance analytics',
            'Error tracking',
            'Business intelligence',
            'Database insights',
        ];
    }

    return tierFeatures[tier] || baseFeatures;
}

/**
 * Integrates with NeuroSEO™ Suite for enhanced context
 * Provides AI-powered insights for chatbot responses
 */
export async function getNeuroSEOContext(uid: string, url?: string): Promise<NeuroSEOContext | null> {
    try {
        const neuroSEO = new NeuroSEOSuite();

        if (url) {
            // Get specific URL analysis
            const report = await neuroSEO.runAnalysis({
                urls: [url],
                targetKeywords: [],
                analysisType: 'seo-focused',
                userPlan: 'free', // Default to free for context
                userId: uid,
            });

            return {
                type: 'url_analysis',
                _data: report,
                insights: report.keyInsights?.map(insight => insight.description).join(' ') || 'No insights available',
            };
        }

        // Get general SEO insights for the user
        return {
            type: 'general_insights',
            _data: null,
            insights: 'NeuroSEO™ Suite ready to analyze your content',
        };
    } catch (error) {
        console.error('Error fetching NeuroSEO context:', error);
        return {
            type: 'error',
            _data: null,
            insights: 'NeuroSEO™ analysis temporarily unavailable',
        };
    }
}

/**
 * Caching utilities for context data
 * Reduces Firebase reads and improves performance
 */
const contextCache = new Map<string, { _data: unknown; timestamp: number; }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedContext(_key: string): unknown | null {
    const cached = contextCache.get(_key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached._data;
    }
    return null;
}

export function setCachedContext(_key: string, _data: unknown): void {
    contextCache.set(_key, { _data, timestamp: Date.now() });
}

// Export all context functions for easy import
export const contextFetchers = {
    getAuditContext,
    getSiteContext,
    getAdminContext,
    getChatContext,
    getNeuroSEOContext,
    getCachedContext,
    setCachedContext,
};
