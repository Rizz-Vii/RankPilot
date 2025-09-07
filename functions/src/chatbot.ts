/**
 * RankPilot AI Chatbot Firebase Functions
 * Handles both customer and admin chatbot interactions
 * Integrates with OpenAI, Firebase, and RankPilot systems
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";
import type { AdminContext, AuditContext, ChatContext, SiteContext } from "./context";
import {
  getAdminContext,
  getAuditContext,
  getChatContext,
  getNeuroSEOContext,
  getSiteContext
} from "./context";
import { getAI as getManagedAI } from "./lib/ai-memory-manager.js";

// Initialize services (ensure Admin SDK is initialized before Firestore usage)
try {
  if (!getApps().length) initializeApp();
} catch {
  // already initialized
}
const db = getFirestore();

// Lazy OpenAI initialization to avoid deploy-time warnings (secrets not yet injected)
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI | null {
  if (openaiClient) return openaiClient;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    openaiClient = new OpenAI({ apiKey: key });
    return openaiClient;
  } catch (error) {
    logger.error("Failed to initialize OpenAI client", error);
    return null;
  }
}
// Types for request/response
interface ChatRequest {
  uid: string;
  message: string;
  url?: string;
  sessionId?: string;
  chatType: "customer" | "admin";
}

interface ChatResponse {
  response: string;
  sessionId: string;
  timestamp: string;
  tokensUsed: number;
  context: {
    type: string;
    dataUsed: string[];
  };
}

/**
 * Compose a single prompt string from system + history + user message so it can be sent
 * through the centralized AI manager (provider-agnostic).
 */
function composePrompt(system: string, history: Array<{ role: "user" | "assistant"; content: string }>, userMessage: string): string {
  const parts: string[] = [];
  if (system) parts.push(`<system>\n${system.trim()}\n</system>`);
  if (history && history.length) {
    parts.push(`<history>`);
    history.forEach((m) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      parts.push(`[${role}] ${m.content}`);
    });
    parts.push(`</history>`);
  }
  parts.push(`<user>\n${userMessage}\n</user>`);
  parts.push("Provide a helpful answer. If you include any JSON, ensure it is valid.");
  return parts.join("\n\n");
}

/**
 * Customer Chatbot Handler
 * Provides SEO guidance, audit explanations, and tier-based support
 */
export const customerChatHandler = onCall(
  {
    region: "australia-southeast1",
    memory: "1GiB",
    timeoutSeconds: 30,
    secrets: ["OPENAI_API_KEY"],
    enforceAppCheck: false,
  },
  async (request) => {
    try {
      const { uid, message, url, sessionId } = request.data as ChatRequest;

      // Validate authentication
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }

      if (request.auth.uid !== uid) {
        throw new HttpsError("permission-denied", "Invalid user ID");
      }

      // Validate input
      if (!message?.trim()) {
        throw new HttpsError("invalid-argument", "Message is required");
      }

      logger.info("Customer chat request", { uid, messageLength: message.length, url });

      // Generate session ID if not provided
      const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Fetch context data
      const chatContext = await getChatContext(uid, false);
      const auditContext = url ? await getAuditContext(uid, url) : null;
      const siteContext = await getSiteContext(uid);
      const neuroSEOContext = await getNeuroSEOContext(uid, url);

      // Build system prompt based on user tier and available data
      const systemPrompt = buildCustomerSystemPrompt(chatContext, auditContext, siteContext, neuroSEOContext);

      // Create conversation messages
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ];

      // Add conversation history for context
      if (chatContext.recentConversations.length > 0) {
        const recentHistory = (chatContext.recentConversations as unknown[])
          .slice(0, 3) // Last 3 conversations
          .reverse();

        recentHistory.forEach((raw) => {
          const r = raw as unknown;
          if (r && typeof r === 'object') {
            const q = (r as Record<string, unknown>).question;
            const a = (r as Record<string, unknown>).response;
            if (typeof q === 'string' && typeof a === 'string') {
              messages.splice(-1, 0,
                { role: "user", content: q },
                { role: "assistant", content: a }
              );
            }
          }
        });
      }

      // Prefer centralized AI manager (env-driven provider with mock fallback), then fall back to OpenAI SDK
      let aiResponse = "";
      let tokensUsed = 0;
      try {
        const extract = (c: OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]): string =>
          typeof c === 'string' ? c : '';
        const history = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as ("user" | "assistant"), content: extract(m.content) }));
        const sysMsg = messages.find((m) => m.role === "system");
        const sys = sysMsg ? extract(sysMsg.content as OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]) : "";
        const prompt = composePrompt(sys, history, message);
        aiResponse = await getManagedAI(prompt, "gpt-4o", { latencyBudgetMs: Number(process.env.AI_LATENCY_BUDGET_MS || 8000) });
        tokensUsed = aiResponse ? Math.min(1500, Math.ceil(aiResponse.split(/\s+/).length * 1.3)) : 0;
      } catch (e) {
        // Fallback to OpenAI SDK if configured
        const openai = getOpenAIClient();
        if (!openai) throw e;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          max_tokens: 1000,
          temperature: 0.1,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        });
        aiResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
        tokensUsed = completion.usage?.total_tokens || 0;
      }

      // Save conversation to Firestore
      await saveConversation(uid, currentSessionId, message, aiResponse, "customer", {
        auditContext: !!auditContext,
        siteContext: !!siteContext,
        neuroSEOContext: !!neuroSEOContext,
        userTier: chatContext.userTier,
      });

      // Prepare response
      const response: ChatResponse = {
        response: aiResponse,
        sessionId: currentSessionId,
        timestamp: new Date().toISOString(),
        tokensUsed,
        context: {
          type: "customer",
          dataUsed: [
            auditContext ? "audit_data" : null,
            siteContext ? "site_content" : null,
            neuroSEOContext ? "neuroseo_insights" : null,
            "user_tier_data"
          ].filter((item): item is string => Boolean(item)),
        },
      }; logger.info("Customer chat response generated", {
        uid,
        tokensUsed,
        sessionId: currentSessionId
      });

      return response;

    } catch (error) {
      logger.error("Customer chat error", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to process chat request");
    }
  }
);

/**
 * Admin Chatbot Handler
 * Provides system monitoring, analytics, and management assistance
 */
export const adminChatHandler = onCall(
  {
    region: "australia-southeast1",
    memory: "1GiB",
    timeoutSeconds: 45,
    secrets: ["OPENAI_API_KEY"],
    enforceAppCheck: false,
  },
  async (request) => {
    try {
      const { uid, message, sessionId } = request.data as ChatRequest;

      // Validate authentication
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }

      if (request.auth.uid !== uid) {
        throw new HttpsError("permission-denied", "Invalid user ID");
      }

      // Verify admin access using custom claim or user role for consistency with Firestore/API
      const token = request.auth.token as Record<string, unknown> | undefined;
      const hasAdminClaim = Boolean(token && token["admin"] === true);
      let isAdminUser = hasAdminClaim;
      if (!isAdminUser) {
        const userDoc = await db.collection("users").doc(uid).get();
        const role = (userDoc.data() as { role?: string } | undefined)?.role;
        if (role === 'admin') isAdminUser = true;
      }
      if (!isAdminUser) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      logger.info("Admin chat request", { uid, messageLength: message.length });

      // Generate session ID if not provided
      const currentSessionId = sessionId || `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Fetch admin context data
      const chatContext = await getChatContext(uid, true);
      const userDoc = await db.collection("users").doc(uid).get();
      const userTier = ((userDoc.data() as { subscriptionTier?: string } | undefined)?.subscriptionTier) || 'admin';
      const adminContext = await getAdminContext(userTier);

      // Build admin system prompt
      const systemPrompt = buildAdminSystemPrompt(chatContext, adminContext);

      // Create conversation messages
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ];

      // Add admin conversation history
      if (chatContext.recentConversations.length > 0) {
        const recentHistory = chatContext.recentConversations
          .slice(0, 2) // Last 2 conversations for admins
          .reverse();

        recentHistory.forEach((raw) => {
          const r = raw as unknown;
          if (r && typeof r === 'object') {
            const q = (r as Record<string, unknown>).question;
            const a = (r as Record<string, unknown>).response;
            if (typeof q === 'string' && typeof a === 'string') {
              messages.splice(-1, 0,
                { role: "user", content: q },
                { role: "assistant", content: a }
              );
            }
          }
        });
      }

      // Prefer centralized AI manager; fall back to OpenAI SDK if needed
      let aiResponse = "";
      let tokensUsed = 0;
      try {
        const extract = (c: OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]): string =>
          typeof c === 'string' ? c : '';
        const history = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as ("user" | "assistant"), content: extract(m.content) }));
        const sysMsg = messages.find((m) => m.role === "system");
        const sys = sysMsg ? extract(sysMsg.content as OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]) : "";
        const prompt = composePrompt(sys, history, message);
        aiResponse = await getManagedAI(prompt, "gpt-4o", { latencyBudgetMs: Number(process.env.AI_LATENCY_BUDGET_MS || 8000) });
        tokensUsed = aiResponse ? Math.min(1800, Math.ceil(aiResponse.split(/\s+/).length * 1.3)) : 0;
      } catch (e) {
        const openai = getOpenAIClient();
        if (!openai) throw e;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          max_tokens: 1500,
          temperature: 0.05, // More focused responses for admin queries
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        });
        aiResponse = completion.choices[0]?.message?.content || "I couldn't process your admin request. Please try again.";
        tokensUsed = completion.usage?.total_tokens || 0;
      }

      // Save admin conversation
      await saveConversation(uid, currentSessionId, message, aiResponse, "admin", {
        adminLevel: userTier,
        systemMetrics: adminContext.systemMetrics,
      });

      const response: ChatResponse = {
        response: aiResponse,
        sessionId: currentSessionId,
        timestamp: new Date().toISOString(),
        tokensUsed,
        context: {
          type: "admin",
          dataUsed: ["system_metrics", "performance_data", "user_analytics"],
        },
      };

      logger.info("Admin chat response generated", {
        uid,
        tokensUsed,
        sessionId: currentSessionId
      });

      return response;

    } catch (error) {
      logger.error("Admin chat error", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to process admin chat request");
    }
  }
);

/**
 * Builds system prompt for customer chatbot
 */
function buildCustomerSystemPrompt(
  chatContext: ChatContext,
  auditContext: AuditContext | null,
  siteContext: SiteContext,
  neuroSEOContext: { insights: string }
): string {
  const userTier = chatContext.userTier || "free";
  const availableFeatures = chatContext.availableFeatures || [];

  let prompt = `You are RankPilot AI, an expert SEO assistant helping users optimize their websites.

USER CONTEXT:
- Subscription Tier: ${userTier.toUpperCase()}
- Available Features: ${availableFeatures.join(", ")}
- Total Site Pages: ${siteContext.totalPages || 0}

PERSONALITY & TONE:
- Professional yet friendly and approachable
- Provide actionable, specific advice
- Explain technical concepts in simple terms
- Always encourage best practices
- Be supportive and motivating

CAPABILITIES BY TIER:
- Free: Basic SEO guidance, audit explanations
- Starter: + Content analysis, basic NeuroSEO™ insights
- Agency: + Advanced NeuroSEO™, competitor analysis
- Enterprise: + Full NeuroSEO™ Suite, custom solutions
- Admin: + All features and system management

`;

  // Add audit context if available
  if (auditContext) {
    prompt += `
CURRENT AUDIT DATA:
URL: ${auditContext.url}
Performance Score: ${auditContext.score.performance}/100
SEO Score: ${auditContext.score.seo}/100
Accessibility Score: ${auditContext.score.accessibility}/100
Best Practices Score: ${auditContext.score.bestPractices}/100

Key Issues Found:
${auditContext.issues.slice(0, 5).map((issue: string) => `- ${issue}`).join("\n")}

Recommended Actions:
${auditContext.suggestions.slice(0, 5).map((suggestion: string) => `- ${suggestion}`).join("\n")}

Last Analyzed: ${auditContext.lastAnalyzed}
`;
  }

  // Add site context
  if (siteContext.contentSummary) {
    prompt += `
SITE CONTENT OVERVIEW:
${siteContext.contentSummary.substring(0, 500)}...

Primary Keywords: ${siteContext.keywords.slice(0, 10).join(", ")}
`;
  }

  // Add NeuroSEO™ context
  if (neuroSEOContext.insights) {
    prompt += `
NEUROSEO™ INSIGHTS:
${neuroSEOContext.insights}
`;
  }

  prompt += `
RESPONSE GUIDELINES:
1. Use the audit data to provide specific, actionable advice
2. Reference the user's subscription tier when suggesting features
3. For paid tier features not available to free users, gently mention upgrade benefits
4. Always provide value regardless of tier
5. Use HTML formatting for better readability (lists, bold, links)
6. Keep responses concise but comprehensive
7. End with a question to continue the conversation

IMPORTANT: If the user asks about features beyond their tier, explain the limitation kindly and suggest how they can access those features.`;

  return prompt;
}

/**
 * Builds system prompt for admin chatbot
 */
function buildAdminSystemPrompt(chatContext: ChatContext, adminContext: AdminContext): string {
  return `You are RankPilot Admin AI, an advanced system management assistant for RankPilot administrators.

ADMIN CONTEXT:
- Admin Level: ${chatContext.userTier.toUpperCase()}
- System Status: Operational
- Monitoring: Active

CURRENT SYSTEM METRICS:
- Total Users: ${adminContext.systemMetrics.totalUsers}
- Active Subscriptions: ${adminContext.systemMetrics.activeSubscriptions}
- Total Analyses: ${adminContext.systemMetrics.totalAnalyses}
- Error Rate: ${adminContext.systemMetrics.errorRate}%

RECENT ACTIVITY:
${adminContext.recentActivity.slice(0, 3).map((activity) =>
    `- ${activity.type || "Activity"}: ${activity.description || "No description"}`
  ).join("\n")}

PERFORMANCE INSIGHTS:
${adminContext.performanceInsights.map((insight: string) => `- ${insight}`).join("\n")}

CAPABILITIES:
- System monitoring and health checks
- User management and analytics
- Performance optimization recommendations
- Error tracking and resolution
- Business intelligence and reporting
- Database insights and optimization
- Security monitoring and alerts

PERSONALITY:
- Technical and precise
- Data-driven recommendations
- Proactive problem identification
- Clear action items
- Executive-level insights

RESPONSE GUIDELINES:
1. Provide actionable insights with specific metrics
2. Include relevant system data in responses
3. Suggest proactive measures for optimization
4. Use technical language appropriate for administrators
5. Format data in tables or lists for clarity
6. Always include next steps or recommendations
7. Reference specific system components when relevant

IMPORTANT: Focus on providing actionable intelligence that helps optimize RankPilot's performance and user experience.`;
}

/**
 * Saves conversation to Firestore
 */
async function saveConversation(
  uid: string,
  sessionId: string,
  question: string,
  response: string,
  chatType: "customer" | "admin",
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const collectionName = chatType === "admin" ? "adminChats" : "chatLogs";
    const conversationData = {
      question,
      response,
      timestamp: FieldValue.serverTimestamp(),
      tokensUsed: metadata.tokensUsed || 0,
      chatType,
      metadata,
    };

    await db
      .collection(collectionName)
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .add(conversationData);

    // Update session metadata
    await db
      .collection(collectionName)
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)
      .set({
        lastMessage: response.substring(0, 100),
        lastActivity: FieldValue.serverTimestamp(),
        messageCount: FieldValue.increment(1),
        chatType,
      }, { merge: true });

  } catch (error) {
    logger.error("Failed to save conversation", error);
    // Don't throw error to avoid breaking the chat flow
  }
}
