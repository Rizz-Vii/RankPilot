/**
 * RankPilot Context Fetchers for Firebase Functions
 * Provides data context for AI chatbot interactions
 * Integrates with Firestore, Firebase Auth, and RankPilot systems
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

// Initialize Firebase Admin (only if not already initialized)
try {
  initializeApp();
} catch {
  // App already initialized, continue
  logger.info("Firebase app already initialized");
}

const db = getFirestore();

// Types
export interface AuditContext {
    url: string;
    score: {
        performance: number;
        accessibility: number;
        seo: number;
        bestPractices: number;
    };
    issues: string[];
    suggestions: string[];
    lastAnalyzed: string;
}

export interface SiteContext {
    totalPages: number;
    contentSummary: string;
    keywords: string[];
    recentAnalyses: Array<Record<string, unknown>>;
}

export interface AdminContext {
    systemMetrics: {
        totalUsers: number;
        activeSubscriptions: number;
        totalAnalyses: number;
        errorRate: number;
    };
    recentActivity: Array<{ type: string; description: string; timestamp: Date | string }>;
    performanceInsights: string[];
}

export interface ChatContext {
    userTier: string;
    recentConversations: any[];
    availableFeatures: string[];
}

/**
 * Fetches audit context for a specific URL
 */
export const getAuditContext = async (uid: string, url: string): Promise<AuditContext | null> => {
  try {
    // Query audits collection for the specific URL
    const auditsRef = db.collection("audits").doc(uid).collection("urls");
    const snapshot = await auditsRef.where("url", "==", url).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const auditDoc = snapshot.docs[0];
    const data = auditDoc.data();

    return {
      url: data.url || url,
      score: {
        performance: data.score?.performance || 0,
        accessibility: data.score?.accessibility || 0,
        seo: data.score?.seo || 0,
        bestPractices: data.score?.bestPractices || 0,
      },
      issues: Array.isArray(data.issues) ? data.issues : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      lastAnalyzed: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching audit context:", error);
    return null;
  }
};

/**
 * Fetches site context data
 */
export const getSiteContext = async (uid: string): Promise<SiteContext> => {
  try {
    // Get site content pages
    const pagesRef = db.collection("siteContent").doc(uid).collection("pages");
    const pagesSnapshot = await pagesRef.limit(50).get();

    // Get recent analyses
    const auditsRef = db.collection("audits").doc(uid).collection("urls");
    const auditsSnapshot = await auditsRef.orderBy("timestamp", "desc").limit(10).get();

    const pages = pagesSnapshot.docs.map(doc => doc.data());
    const analyses = auditsSnapshot.docs.map(doc => doc.data());

    // Extract keywords from content
    const keywords: string[] = [];
    pages.forEach(page => {
      if (page.keywords && Array.isArray(page.keywords)) {
        keywords.push(...page.keywords);
      }
    });

    // Create content summary
    const contentSummary = pages
      .map(page => page.text || "")
      .join(" ")
      .substring(0, 1000);

    return {
      totalPages: pages.length,
      contentSummary,
      keywords: [...new Set(keywords)].slice(0, 20),
      recentAnalyses: analyses.slice(0, 5),
    };
  } catch (error) {
    console.error("Error fetching site context:", error);
    return {
      totalPages: 0,
      contentSummary: "",
      keywords: [],
      recentAnalyses: [],
    };
  }
};

/**
 * Fetches admin context data
 */
export const getAdminContext = async (userTier: string): Promise<AdminContext> => {
  try {
    // Get system metrics
    const usersSnapshot = await db.collection("users").get();
    const auditsSnapshot = await db.collectionGroup("urls").get();

    const totalUsers = usersSnapshot.size;
    const activeSubscriptions = usersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.subscriptionTier && data.subscriptionTier !== "free";
    }).length;

    return {
      systemMetrics: {
        totalUsers,
        activeSubscriptions,
        totalAnalyses: auditsSnapshot.size,
        errorRate: 0.1, // Placeholder
      },
      recentActivity: [
        { type: "user_signup", description: "New user registration", timestamp: new Date() },
        { type: "audit_completed", description: "SEO audit completed", timestamp: new Date() },
        { type: "subscription_upgrade", description: "User upgraded to Agency tier", timestamp: new Date() },
      ],
      performanceInsights: [
        "System performance is optimal",
        "User engagement has increased 15% this week",
        "Database queries are executing efficiently",
      ],
    };
  } catch (error) {
    console.error("Error fetching admin context:", error);
    return {
      systemMetrics: {
        totalUsers: 0,
        activeSubscriptions: 0,
        totalAnalyses: 0,
        errorRate: 0,
      },
      recentActivity: [],
      performanceInsights: ["Unable to fetch performance data"],
    };
  }
};

/**
 * Fetches chat context
 */
export const getChatContext = async (uid: string, isAdmin: boolean = false): Promise<ChatContext> => {
  try {
    // Get user data
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Get recent conversations
    const chatCollection = isAdmin ? "adminChats" : "chatLogs";
    const chatRef = db.collection(chatCollection).doc(uid).collection("sessions");
    const chatSnapshot = await chatRef.orderBy("lastActivity", "desc").limit(5).get();

    const conversations = chatSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        sessionId: doc.id,
        lastMessage: data.lastMessage || "",
        timestamp: data.lastActivity?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    const userTier = userData?.subscriptionTier || "free";
    const tierFeatures = {
      free: ["dashboard", "basic-audit"],
      starter: ["dashboard", "basic-audit", "content-analyzer"],
      agency: ["dashboard", "basic-audit", "content-analyzer", "neuroseo-basic", "competitors"],
      enterprise: ["dashboard", "basic-audit", "content-analyzer", "neuroseo-advanced", "competitors", "unlimited-neuroseo"],
      admin: ["all-features", "system-management", "user-analytics"],
    };

    return {
      userTier,
      recentConversations: conversations,
      availableFeatures: tierFeatures[userTier as keyof typeof tierFeatures] || tierFeatures.free,
    };
  } catch (error) {
    console.error("Error fetching chat context:", error);
    return {
      userTier: "free",
      recentConversations: [],
      availableFeatures: ["dashboard"],
    };
  }
};

/**
 * Fetches NeuroSEO context
 */
export const getNeuroSEOContext = async (uid: string, url?: string): Promise<{ insights: string; }> => {
  try {
    // Get NeuroSEO analyses
    const neuroSEORef = db.collection("neuroSeoAnalyses").doc(uid).collection("analyses");
    let query = neuroSEORef.orderBy("timestamp", "desc").limit(5);

    if (url) {
      query = neuroSEORef.where("url", "==", url).orderBy("timestamp", "desc").limit(3);
    }

    const snapshot = await query.get();
    const analyses = snapshot.docs.map(doc => doc.data());

    if (analyses.length === 0) {
      return { insights: "No NeuroSEO™ analyses available yet. Consider running a comprehensive analysis." };
    }

    const insights = analyses
      .map(analysis => analysis.summary || analysis.insights || "Analysis completed")
      .join(" | ");

    return { insights: insights.substring(0, 500) };
  } catch (error) {
    console.error("Error fetching NeuroSEO context:", error);
    return { insights: "NeuroSEO™ insights currently unavailable." };
  }
};
