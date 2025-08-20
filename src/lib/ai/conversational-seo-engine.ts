/**
 * Conversational AI Enhancement System
 * Implements Priority 1 Conversational AI from DevReady Phase 3
 * 
 * Features:
 * - Chat-based SEO analysis with NeuroSEO integration
 * - Multi-turn dialogue with context awareness
 * - Personalized recommendations based on user history
 * - Knowledge base integration for intelligent guidance
 * - Real-time conversation state management
 */

import type { MultiModelResponse } from '../ai/multi-model-orchestrator';
import { multiModelOrchestrator } from '../ai/multi-model-orchestrator';
import { advancedCacheManager } from '../cache/advanced-cache-manager';

// ---- Domain Types ---------------------------------------------------------

interface SEOIssue { type: string; severity: 'high' | 'medium' | 'low'; count: number }
interface SEOPerformance { lcp: number; cls: number; fid: number }
export interface SEOAnalysisResult {
    url: string;
    overallScore: number;
    issues: SEOIssue[];
    opportunities: string[];
    performance: SEOPerformance;
}

/* pruned unused intermediary AI model types (AIModelOutputPart, AIModelResultItem) to reduce noise */

interface KnowledgeBaseEntry { content: string; tips: string[]; priority: string }

export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: {
        seoAnalysis?: unknown;
        recommendations?: string[];
        confidence?: number;
        sources?: string[];
        taskType?: string;
    };
}

export interface ConversationContext {
    userId: string;
    userTier: 'free' | 'starter' | 'agency' | 'enterprise' | 'admin';
    sessionId: string;
    messages: ConversationMessage[];
    currentTopic?: string;
    userPreferences?: {
        businessType?: string;
        targetAudience?: string;
        primaryKeywords?: string[];
        competitorUrls?: string[];
    };
    seoHistory?: {
        previousAnalyses: SEOAnalysisResult[];
        commonIssues: string[];
        improvementAreas: string[];
    };
}

export interface ConversationResponse {
    message: ConversationMessage;
    suggestions: string[];
    actionItems?: Array<{
        type: 'analysis' | 'recommendation' | 'tutorial';
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        estimatedTime?: string;
    }>;
    followUpQuestions?: string[];
    confidenceScore: number;
    requiresAction?: boolean;
}

/**
 * Conversational AI Engine for SEO Analysis
 * Provides intelligent, context-aware SEO guidance through natural conversation
 */
export class ConversationalSEOEngine {
    private activeConversations: Map<string, ConversationContext> = new Map();
    private knowledgeBase: Map<string, KnowledgeBaseEntry> = new Map();
    private personalizedRecommendations: Map<string, string[]> = new Map();

    // SEO-specific conversation patterns and responses
    private seoPatterns = {
        analysis: /analyz|audit|check|review|assess/i,
        keywords: /keyword|search term|ranking|position/i,
        technical: /technical|crawl|index|sitemap|robots/i,
        content: /content|blog|article|copy|text/i,
        performance: /speed|performance|loading|vitals/i,
        backlinks: /backlink|link building|authority|domain/i,
        competitor: /competitor|competition|rival|compare/i,
        local: /local|location|nearby|geo|maps/i
    };

    constructor() {
        this.initializeKnowledgeBase();
        this.setupPersonalizationEngine();
    }

    /**
     * Start a new conversation session
     */
    async startConversation(userId: string, userTier: 'free' | 'starter' | 'agency' | 'enterprise' | 'admin'): Promise<string> {
        const sessionId = this.generateSessionId();

        const context: ConversationContext = {
            userId,
            userTier,
            sessionId,
            messages: [],
            seoHistory: await this.loadUserSEOHistory(userId)
        };

        // Load user preferences from cache
        const cachedPreferences = await advancedCacheManager.get(
            `user-preferences-${userId}`,
            userTier
        );
        if (cachedPreferences) {
            context.userPreferences = cachedPreferences;
        }

        this.activeConversations.set(sessionId, context);

        // Send welcome message
        const welcomeMessage = await this.generateWelcomeMessage(context);
        context.messages.push(welcomeMessage);

        return sessionId;
    }

    /**
     * Process user message and generate intelligent response
     */
    async processMessage(
        sessionId: string,
        userMessage: string
    ): Promise<ConversationResponse> {
        const context = this.activeConversations.get(sessionId);
        if (!context) {
            throw new Error('Conversation session not found');
        }

        // Add user message to context
        const userMsg: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        context.messages.push(userMsg);

        // Analyze message intent and generate response
        const response = await this.generateIntelligentResponse(context, userMessage);

        // Add assistant message to context
        context.messages.push(response.message);

        // Update conversation topic and cache context
        await this.updateConversationContext(context, userMessage);

        return response;
    }

    /**
     * Generate intelligent response based on conversation context
     */
    private async generateIntelligentResponse(
        context: ConversationContext,
        userMessage: string
    ): Promise<ConversationResponse> {
        const messageType = this.detectMessageIntent(userMessage);


        let response: ConversationResponse;

        switch (messageType) {
            case 'seo-analysis':
                response = await this.handleSEOAnalysisRequest(context, userMessage);
                break;
            case 'keyword-research':
                response = await this.handleKeywordResearch(context, userMessage);
                break;
            case 'technical-seo':
                response = await this.handleTechnicalSEOQuestion(context, userMessage);
                break;
            case 'content-optimization':
                response = await this.handleContentOptimization(context, userMessage);
                break;
            case 'competitor-analysis':
                response = await this.handleCompetitorAnalysis(context);
                break;
            case 'general-question':
                response = await this.handleGeneralSEOQuestion(context, userMessage);
                break;
            default:
                response = await this.handleFallbackResponse(context);
        }

        // Add personalized recommendations
        response.suggestions = await this.generatePersonalizedSuggestions(context, messageType);

        return response;
    }

    /**
     * Handle SEO analysis requests with NeuroSEO integration
     */
    private async handleSEOAnalysisRequest(
        context: ConversationContext,
        userMessage: string
    ): Promise<ConversationResponse> {
        // Extract URLs from message
        const urls = this.extractURLs(userMessage);

        if (urls.length === 0) {
            return this.requestURLForAnalysis(context);
        }

        try {
            // Perform SEO analysis using NeuroSEO (simulated)
            const analysisResult = await this.performSEOAnalysis(urls);

            // Generate conversational response
            const responseContent = this.generateAnalysisResponse(analysisResult);

            const assistantMessage: ConversationMessage = {
                id: this.generateMessageId(),
                role: 'assistant',
                content: responseContent,
                timestamp: Date.now(),
                metadata: {
                    seoAnalysis: analysisResult,
                    confidence: 0.92,
                    taskType: 'seo-analysis'
                }
            };

            const actionItems = this.generateAnalysisActionItems(analysisResult);
            const followUpQuestions = this.generateFollowUpQuestions('analysis');

            return {
                message: assistantMessage,
                suggestions: [],
                actionItems,
                followUpQuestions,
                confidenceScore: 0.92,
                requiresAction: actionItems.length > 0
            };

        } catch (error) {
            return this.generateErrorResponse('analysis', error);
        }
    }

    /**
     * Handle keyword research requests
     */
    private async handleKeywordResearch(
        context: ConversationContext,
        userMessage: string
    ): Promise<ConversationResponse> {
        const keywords = this.extractKeywords(userMessage);
        const businessContext = context.userPreferences?.businessType || 'general';

        // Use multi-model orchestrator for keyword analysis
        const keywordAnalysis = await multiModelOrchestrator.processRequest({
            task: 'text-classification',
            input: `Analyze SEO keywords for ${businessContext}: ${keywords.join(', ')}`,
            userTier: context.userTier,
            userId: context.userId,
            options: {
                maxTokens: 500
            }
        });

        const responseContent = this.generateKeywordResponse(keywords, keywordAnalysis, businessContext);

        const assistantMessage: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now(),
            metadata: {
                recommendations: keywords,
                confidence: 0.88,
                taskType: 'keyword-research'
            }
        };

        return {
            message: assistantMessage,
            suggestions: this.generateKeywordSuggestions(keywords, businessContext),
            actionItems: this.generateKeywordActionItems(keywords),
            followUpQuestions: this.generateFollowUpQuestions('keywords'),
            confidenceScore: 0.88
        };
    }

    /**
     * Handle technical SEO questions
     */
    private async handleTechnicalSEOQuestion(
        context: ConversationContext,
        userMessage: string
    ): Promise<ConversationResponse> {
        const technicalAspect = this.identifyTechnicalAspect(userMessage);
        const knowledgeBaseResponse = this.knowledgeBase.get(`technical-${technicalAspect}`);

        const responseContent = knowledgeBaseResponse
            ? this.personalizeKnowledgeResponse(knowledgeBaseResponse, context)
            : await this.generateTechnicalResponse(userMessage, context);

        const assistantMessage: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now(),
            metadata: {
                confidence: 0.85,
                taskType: 'technical-seo',
                sources: ['RankPilot Knowledge Base']
            }
        };

        return {
            message: assistantMessage,
            suggestions: this.generateTechnicalSuggestions(technicalAspect),
            actionItems: this.generateTechnicalActionItems(technicalAspect),
            followUpQuestions: this.generateFollowUpQuestions('technical'),
            confidenceScore: 0.85
        };
    }

    /**
     * Handle content optimization requests
     */
    private async handleContentOptimization(
        context: ConversationContext,
        userMessage: string
    ): Promise<ConversationResponse> {
        const contentType = this.identifyContentType(userMessage);
        const targetKeywords = context.userPreferences?.primaryKeywords || [];

        // Use multi-model orchestrator for content analysis
        const contentAnalysis = await multiModelOrchestrator.processRequest({
            task: 'summarization',
            input: `Content optimization for ${contentType}: ${userMessage}`,
            userTier: context.userTier,
            userId: context.userId
        });

        const responseContent = this.generateContentOptimizationResponse(
            contentType,
            contentAnalysis,
            targetKeywords
        );

        const assistantMessage: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now(),
            metadata: {
                recommendations: [`Optimize ${contentType}`, 'Include target keywords', 'Improve readability'],
                confidence: 0.90,
                taskType: 'content-optimization'
            }
        };

        return {
            message: assistantMessage,
            suggestions: this.generateContentSuggestions(contentType),
            actionItems: this.generateContentActionItems(contentType),
            followUpQuestions: this.generateFollowUpQuestions('content'),
            confidenceScore: 0.90
        };
    }

    /**
     * Generate personalized suggestions based on user history and preferences
     */
    private async generatePersonalizedSuggestions(
        context: ConversationContext,
        messageType: string
    ): Promise<string[]> {
        const userId = context.userId;
        const userHistory = context.seoHistory;
        const userTier = context.userTier;

        const baseSuggestions = this.getBaseSuggestions(messageType, userTier);

        if (userHistory?.commonIssues.length) {
            baseSuggestions.push(`Address your recurring ${userHistory.commonIssues[0]} issues`);
        }

        if (context.userPreferences?.businessType) {
            baseSuggestions.push(`Explore ${context.userPreferences.businessType}-specific SEO strategies`);
        }

        // Cache personalized suggestions
        await advancedCacheManager.set(
            `personalized-suggestions-${userId}`,
            baseSuggestions,
            userTier,
            { ttl: 3600, tags: ['personalization', 'suggestions'] }
        );

        return baseSuggestions.slice(0, 5); // Return top 5 suggestions
    }

    /**
     * Utility methods for conversation management
     */
    private generateSessionId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private detectMessageIntent(message: string): string {
        for (const [intent, pattern] of Object.entries(this.seoPatterns)) {
            if (pattern.test(message)) {
                return `${intent.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            }
        }
        return 'general-question';
    }

    private extractURLs(text: string): string[] {
        const urlRegex = /https?:\/\/[^\s]+/g;
        return text.match(urlRegex) || [];
    }

    private extractKeywords(text: string): string[] {
        // Simple keyword extraction - in production, use NLP
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
        return [...new Set(words)].slice(0, 10);
    }

    private async performSEOAnalysis(urls: string[]): Promise<SEOAnalysisResult> {
        // Simulated NeuroSEO analysis - integrate with actual NeuroSEO orchestrator
        return {
            url: urls[0],
            overallScore: 78,
            issues: [
                { type: 'meta-description', severity: 'medium', count: 3 },
                { type: 'heading-structure', severity: 'low', count: 1 },
                { type: 'image-alt-text', severity: 'high', count: 5 }
            ],
            opportunities: [
                'Optimize meta descriptions for better CTR',
                'Improve heading hierarchy',
                'Add alt text to images'
            ],
            performance: {
                lcp: 2.3,
                cls: 0.08,
                fid: 95
            }
        };
    }

    private generateAnalysisResponse(analysis: SEOAnalysisResult): string {
        return `I've analyzed ${analysis.url} and found some interesting insights! 

📊 **Overall SEO Score: ${analysis.overallScore}/100**

🔍 **Key Issues Found:**
${analysis.issues.map((issue) => `• ${issue.type.replace('-', ' ')} (${issue.severity} priority - ${issue.count} instances)`).join('\n')}

🚀 **Top Opportunities:**
${analysis.opportunities.map((opp: string, i: number) => `${i + 1}. ${opp}`).join('\n')}

⚡ **Performance Metrics:**
• LCP: ${analysis.performance.lcp}s (${analysis.performance.lcp < 2.5 ? 'Good' : 'Needs Improvement'})
• CLS: ${analysis.performance.cls} (${analysis.performance.cls < 0.1 ? 'Good' : 'Needs Improvement'})
• FID: ${analysis.performance.fid}ms (${analysis.performance.fid < 100 ? 'Good' : 'Needs Improvement'})

Would you like me to provide specific recommendations for any of these areas?`;
    }

    private generateAnalysisActionItems(analysis: SEOAnalysisResult): Array<{
        type: 'recommendation'; title: string; description: string; priority: 'high' | 'medium' | 'low'; estimatedTime: string;
    }> {
        return analysis.issues.map(issue => ({
            type: 'recommendation',
            title: `Fix ${issue.type.replace('-', ' ')} issues`,
            description: `Address ${issue.count} ${issue.type} issues found on your site`,
            priority: issue.severity,
            estimatedTime: issue.severity === 'high' ? '1-2 hours' : '30 minutes'
        }));
    }

    private generateFollowUpQuestions(category: string): string[] {
        const questions: Record<string, string[]> = {
            analysis: [
                'Would you like me to analyze your competitors?',
                'Should we look at your keyword rankings?',
                'Do you want specific recommendations for the issues found?'
            ],
            keywords: [
                'Would you like to see long-tail keyword opportunities?',
                'Should we analyze your current keyword rankings?',
                'Want to explore related keywords in your niche?'
            ],
            technical: [
                'Need help implementing these technical changes?',
                'Should we check your site\'s crawlability?',
                'Want to see how this affects your Core Web Vitals?'
            ],
            content: [
                'Should we analyze your existing content performance?',
                'Want recommendations for new content topics?',
                'Need help with content optimization templates?'
            ]
        };

        return questions[category] || [
            'What would you like to explore next?',
            'Any specific SEO challenges you\'re facing?'
        ];
    }

    // Additional helper methods...
    private initializeKnowledgeBase(): void {
        this.knowledgeBase.set('technical-crawling', {
            content: 'Crawling optimization involves ensuring search engines can efficiently discover and index your content...',
            tips: ['Use XML sitemaps', 'Optimize robots.txt', 'Fix crawl errors'],
            priority: 'high'
        });
        // Add more knowledge base entries...
    }

    private setupPersonalizationEngine(): void {
        // Initialize personalization recommendations
        console.log('[ConversationalSEO] Personalization engine initialized');
    }

    private async loadUserSEOHistory(userId: string): Promise<ConversationContext['seoHistory']> {
        const cached = await advancedCacheManager.get(`seo-history-${userId}`, 'free');
        if (cached && typeof cached === 'object') return cached as any; // transitional
        return { previousAnalyses: [], commonIssues: [], improvementAreas: [] };
    }

    private async generateWelcomeMessage(context: ConversationContext): Promise<ConversationMessage> {
        const greeting = context.userPreferences?.businessType
            ? `Welcome back! I see you're working on SEO for your ${context.userPreferences.businessType} business.`
            : 'Welcome to your AI SEO assistant! I\'m here to help you improve your search rankings.';

        return {
            id: this.generateMessageId(),
            role: 'assistant',
            content: `${greeting} 

What can I help you with today? I can:
• Analyze your website's SEO performance
• Research keywords for your business
• Provide technical SEO guidance
• Optimize your content strategy
• Analyze your competitors

Just ask me anything about SEO!`,
            timestamp: Date.now()
        };
    }

    private async updateConversationContext(context: ConversationContext, userMessage: string): Promise<void> {
        // Update conversation topic based on message
        const detectedTopic = this.detectMessageIntent(userMessage);
        context.currentTopic = detectedTopic;

        // Cache updated context
        await advancedCacheManager.set(
            `conversation-${context.sessionId}`,
            context,
            context.userTier,
            { ttl: 3600, tags: ['conversation', 'context'] }
        );
    }

    // Implement remaining helper methods with similar patterns...
    private buildConversationHistory(context: ConversationContext): string {
        return context.messages
            .slice(-5) // Last 5 messages for context
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
    }

    private requestURLForAnalysis(_context: ConversationContext): ConversationResponse {
        const message: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: 'I\'d be happy to analyze your website! Please provide the URL you\'d like me to analyze, and I\'ll give you a comprehensive SEO report with actionable recommendations.',
            timestamp: Date.now()
        };

        return {
            message,
            suggestions: ['Provide your website URL', 'Share specific pages to analyze'],
            followUpQuestions: ['What specific SEO aspects are you most concerned about?'],
            confidenceScore: 1.0
        };
    }

    private generateErrorResponse(type: string, _err?: unknown): ConversationResponse {
        const message: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: `I encountered an issue while processing your ${type} request. Let me try a different approach or you can rephrase your question.`,
            timestamp: Date.now()
        };

        return {
            message,
            suggestions: ['Try rephrasing your question', 'Ask about a different SEO topic'],
            followUpQuestions: ['What specific help do you need with SEO?'],
            confidenceScore: 0.5
        };
    }

    // Implement remaining methods with similar patterns...
    private identifyTechnicalAspect(message: string): string {
        if (/crawl|spider|bot/i.test(message)) return 'crawling';
        if (/index|noindex/i.test(message)) return 'indexing';
        if (/sitemap/i.test(message)) return 'sitemap';
        if (/robots/i.test(message)) return 'robots';
        if (/speed|performance/i.test(message)) return 'performance';
        return 'general';
    }

    private identifyContentType(message: string): string {
        if (/blog|article/i.test(message)) return 'blog-post';
        if (/product/i.test(message)) return 'product-page';
        if (/landing/i.test(message)) return 'landing-page';
        if (/category/i.test(message)) return 'category-page';
        return 'general-content';
    }

    private personalizeKnowledgeResponse(response: KnowledgeBaseEntry, context: ConversationContext): string {
        return `${response.content}\n\nBased on your ${context.userTier} plan, here are my recommendations:\n${response.tips.join('\n• ')}`;
    }

    private getBaseSuggestions(messageType: string, userTier: string): string[] {
        const suggestions: Record<string, string[]> = {
            'seo-analysis': ['Run a competitor analysis', 'Check your keyword rankings', 'Audit your technical SEO'],
            'keyword-research': ['Explore long-tail keywords', 'Analyze search volume trends', 'Check keyword difficulty'],
            'technical-seo': ['Audit your site structure', 'Check Core Web Vitals', 'Review your robots.txt'],
            'content-optimization': ['Analyze top-performing content', 'Research content gaps', 'Optimize for featured snippets']
        };

        const tierBonus = userTier === 'enterprise' ? ['Schedule automated reports', 'Set up advanced monitoring'] : [];

        return [...(suggestions[messageType] || ['Ask me anything about SEO']), ...tierBonus];
    }

    private generateKeywordResponse(keywords: string[], analysis: MultiModelResponse, businessContext: string): string {
        return `Great keyword research request for your ${businessContext} business! 

🎯 **Keywords Analyzed:** ${keywords.join(', ')}

📈 **AI Analysis Results:**
${this.extractClassificationInsight(analysis) || (analysis.success ? 'Keywords show good potential for your niche with moderate competition levels.' : 'Let me provide some general guidance for these keywords.')}

💡 **Recommendations:**
• Focus on long-tail variations of your main keywords
• Consider user intent when targeting these terms
• Look for related keywords with lower competition

Would you like me to suggest specific long-tail variations or analyze the competition for these keywords?`;
    }

    private generateKeywordSuggestions(keywords: string[], businessContext: string): string[] {
        return [
            `Analyze "${keywords[0]}" competition`,
            'Find long-tail variations',
            'Check search volume trends',
            `Research ${businessContext} keyword opportunities`
        ];
    }

    private generateKeywordActionItems(keywords: string[]): Array<{ type: 'analysis'; title: string; description: string; priority: 'medium'; estimatedTime: string; }> {
        return keywords.slice(0, 3).map(keyword => ({
            type: 'analysis',
            title: `Optimize for "${keyword}"`,
            description: `Create content targeting this keyword with proper optimization`,
            priority: 'medium',
            estimatedTime: '2-3 hours'
        }));
    }

    private async generateTechnicalResponse(message: string, context: ConversationContext): Promise<string> {
        const aiResponse = await multiModelOrchestrator.processRequest({
            task: 'question-answering',
            input: `Technical SEO question: ${message}`,
            userTier: context.userTier,
            userId: context.userId
        });

        const answer = this.extractAnswer(aiResponse);

        return `Here's what I know about that technical SEO topic:

${aiResponse.success ? (answer || 'Let me provide some guidance on this technical aspect.') : 'Let me help you with this technical SEO question.'}

For your ${context.userTier} plan, I recommend prioritizing the most impactful technical improvements first.

Would you like specific implementation steps or help with any other technical SEO aspects?`;
    }

    private generateTechnicalSuggestions(aspect: string): string[] {
        const suggestions: Record<string, string[]> = {
            crawling: ['Check robots.txt', 'Analyze crawl budget', 'Review server logs'],
            indexing: ['Monitor index coverage', 'Check for indexing issues', 'Optimize page structure'],
            performance: ['Audit Core Web Vitals', 'Optimize images', 'Minimize JavaScript'],
            sitemap: ['Update XML sitemap', 'Submit to search engines', 'Monitor sitemap errors']
        };

        return suggestions[aspect] || ['Audit technical SEO', 'Check for common issues'];
    }

    private generateTechnicalActionItems(aspect: string): Array<{ type: 'tutorial'; title: string; description: string; priority: 'high'; estimatedTime: string; }> {
        return [{
            type: 'tutorial',
            title: `${aspect.charAt(0).toUpperCase() + aspect.slice(1)} optimization guide`,
            description: `Step-by-step guide to improve your ${aspect} configuration`,
            priority: 'high',
            estimatedTime: '1-2 hours'
        }];
    }

    private generateContentOptimizationResponse(contentType: string, analysis: MultiModelResponse, keywords: string[]): string {
        return `Excellent! Let me help you optimize your ${contentType} content.

📝 **Content Type:** ${contentType.replace('-', ' ')}
🎯 **Target Keywords:** ${keywords.length ? keywords.join(', ') : 'Not specified - let\'s work on that!'}

✨ **AI Content Analysis:**
${this.extractSummaryText(analysis) || (analysis.success ? 'Your content has optimization potential.' : 'Let me provide some optimization guidance.')}

🚀 **Optimization Recommendations:**
• Structure content with clear headings (H1, H2, H3)
• Include target keywords naturally throughout
• Optimize meta title and description
• Add relevant internal links
• Use descriptive alt text for images

Would you like me to help with any specific optimization technique or review particular content?`;
    }

    private generateContentSuggestions(contentType: string): string[] {
        return [
            `Optimize ${contentType} structure`,
            'Improve keyword placement',
            'Enhance readability score',
            'Add relevant internal links'
        ];
    }

    private generateContentActionItems(contentType: string): Array<{ type: 'recommendation'; title: string; description: string; priority: 'medium'; estimatedTime: string; }> {
        return [{
            type: 'recommendation',
            title: `${contentType} optimization checklist`,
            description: `Complete optimization checklist for your ${contentType}`,
            priority: 'medium',
            estimatedTime: '1 hour'
        }];
    }

    // ---- Aggregated output extraction helpers (narrowed from `any` to `unknown` and safe-guarded) ---
    private extractFirstOutput(result: MultiModelResponse): unknown | undefined {
        const first = result?.results?.[0]?.output;
        if (first === undefined || first === null) return undefined;
        if (Array.isArray(first) && first.length) return first[0];
        return first;
    }

    private extractSummaryText(result: MultiModelResponse): string | undefined {
        const first = this.extractFirstOutput(result);
        if (first && typeof first === 'object') {
            const obj = first as Record<string, unknown>;
            const summaryText = typeof obj.summary_text === 'string' ? obj.summary_text : undefined;
            const summary = typeof obj.summary === 'string' ? obj.summary : undefined;
            return summaryText || summary;
        }
        return undefined;
    }

    private extractAnswer(result: MultiModelResponse): string | undefined {
        const first = this.extractFirstOutput(result);
        if (first && typeof first === 'object') {
            const obj = first as Record<string, unknown>;
            return typeof obj.answer === 'string' ? obj.answer : undefined;
        }
        return undefined;
    }

    private extractClassificationInsight(result: MultiModelResponse): string | undefined {
        const first = this.extractFirstOutput(result);
        if (!first || typeof first !== 'object') return undefined;
        const obj = first as Record<string, unknown>;
        const label = typeof obj.label === 'string' ? obj.label : undefined;
        const score = typeof obj.score === 'number' ? obj.score : undefined;
        if (label) return `Top classification: ${label}${score ? ` (confidence ${(score * 100).toFixed(1)}%)` : ''}`;
        return undefined;
    }

    private async handleCompetitorAnalysis(_context: ConversationContext): Promise<ConversationResponse> {
        // Implementation for competitor analysis
        const message: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: 'I can help you analyze your competitors! Please provide competitor URLs and I\'ll show you their SEO strategies, top keywords, and opportunities for your business.',
            timestamp: Date.now()
        };

        return {
            message,
            suggestions: ['Provide competitor URLs', 'Analyze competitor keywords', 'Compare SEO strategies'],
            followUpQuestions: ['Who are your main competitors?'],
            confidenceScore: 0.85
        };
    }

    private async handleGeneralSEOQuestion(context: ConversationContext, userMessage: string): Promise<ConversationResponse> {
        // Implementation for general SEO questions
        const aiResponse = await multiModelOrchestrator.processRequest({
            task: 'question-answering',
            input: userMessage,
            userTier: context.userTier,
            userId: context.userId
        });

        const message: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: aiResponse.success
                ? `${(this.extractAnswer(aiResponse) || 'Let me help you with that SEO question.')}\n\nIs there anything specific you'd like to dive deeper into?`
                : 'I\'m here to help with any SEO questions! Could you provide more details about what you\'re trying to achieve?',
            timestamp: Date.now()
        };

        return {
            message,
            suggestions: ['Ask more specific questions', 'Request an SEO audit', 'Explore keyword research'],
            followUpQuestions: ['What SEO challenge are you currently facing?'],
            confidenceScore: aiResponse.success ? 0.80 : 0.60
        };
    }

    private async handleFallbackResponse(_context: ConversationContext): Promise<ConversationResponse> {
        const message: ConversationMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: 'I want to make sure I give you the most helpful SEO advice! Could you clarify what specific aspect of SEO you\'d like help with? I can assist with website analysis, keyword research, technical SEO, content optimization, and more.',
            timestamp: Date.now()
        };

        return {
            message,
            suggestions: [
                'Analyze my website',
                'Research keywords',
                'Technical SEO help',
                'Content optimization',
                'Competitor analysis'
            ],
            followUpQuestions: ['What\'s your main SEO goal right now?'],
            confidenceScore: 0.70
        };
    }
}

// Export singleton instance
export const conversationalSEOEngine = new ConversationalSEOEngine();
