/**
 * RankPilot ChatBot Utilities
 * Common functions and types for chatbot functionality
 */

// Note: Import toast from your toast implementation
// import { toast } from '@/components/ui/use-toast';

// Types
export interface ChatMessage {
    id: string;
    message: string;
    response: string;
    timestamp: string;
    isUser: boolean;
    tokensUsed?: number;
    metadata?: Record<string, unknown>;
}

export interface ChatSession {
    id: string;
    userId: string;
    type: 'customer' | 'admin';
    createdAt: string;
    lastActivity: string;
    messageCount: number;
    metadata?: Record<string, unknown>;
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export interface ChatContext {
    auditData?: boolean;
    siteContent?: boolean;
    neuroSeoInsights?: boolean;
    systemMetrics?: boolean;
    userTier: string;
}

// Utility functions
export const generateSessionId = (type: 'customer' | 'admin' = 'customer'): string => {
    const prefix = type === 'admin' ? 'admin_session' : 'session';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    return `${prefix}_${timestamp}_${random}`;
};

export const formatTimestamp = (timestamp: string): string => {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    } catch {
        return 'Unknown';
    }
};

export const formatTokenUsage = (tokens: number): string => {
    if (tokens < 1000) return `${tokens} tokens`;
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K tokens`;
    return `${(tokens / 1000000).toFixed(1)}M tokens`;
};

export const validateMessage = (message: string): { isValid: boolean; error?: string; } => {
    if (!message || !message.trim()) {
        return { isValid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 2000) {
        return { isValid: false, error: 'Message too long (max 2000 characters)' };
    }

    // Basic spam detection
    const repeatingPattern = /(.)\1{10,}/;
    if (repeatingPattern.test(message)) {
        return { isValid: false, error: 'Message contains too many repeating characters' };
    }

    return { isValid: true };
};

export const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const anyErr = error as Record<string, unknown> & { message?: unknown; error?: unknown };
        if (typeof anyErr.message === 'string') return anyErr.message;
        if (typeof anyErr.error === 'string') return anyErr.error;
    }
    return 'An unexpected error occurred';
};

export const showChatError = (error: unknown, _context?: ChatContext): void => {
    const message = getErrorMessage(error);
    console.error('Chat Error:', message);
    // toast({
    //   title: 'Chat Error',
    //   description: message,
    //   variant: 'destructive',
    // });
};

export const showChatSuccess = (message: string): void => {
    console.log('Chat Success:', message);
    // toast({
    //   title: 'Success',
    //   description: message,
    //   variant: 'default',
    // });
};

// Message formatting helpers
export const formatAIResponse = (response: string): string => {
    // Convert markdown-like formatting to HTML
    return response
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br/>');
};

export const extractCommands = (message: string): string[] => {
    const commandPattern = /\/([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/g;
    const commands: string[] = [];
    let match: RegExpExecArray | null = null;

    while ((match = commandPattern.exec(message)) !== null) {
        commands.push(match[1]);
    }

    return commands;
};

export const isAdminCommand = (message: string): boolean => {
    const adminCommands = [
        'system', 'users', 'performance', 'errors', 'billing',
        'database', 'analytics', 'monitoring', 'security'
    ];

    const commands = extractCommands(message);
    return commands.some(cmd => adminCommands.includes(cmd.toLowerCase()));
};

// Chat history management
export const saveChatHistory = (sessionId: string, messages: ChatMessage[]): void => {
    try {
        if (typeof window !== 'undefined') {
            const key = `chat_history_${sessionId}`;
            const data = {
                messages: messages.slice(-20), // Keep last 20 messages
                timestamp: new Date().toISOString(),
            };
            localStorage.setItem(key, JSON.stringify(data));
        }
    } catch (error) {
        console.warn('Failed to save chat history:', error);
    }
};

export const loadChatHistory = (sessionId: string): ChatMessage[] => {
    try {
        if (typeof window !== 'undefined') {
            const key = `chat_history_${sessionId}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                const data = JSON.parse(stored) as { messages?: ChatMessage[] };
                return data.messages || [];
            }
        }
    } catch (error) {
        console.warn('Failed to load chat history:', error);
    }
    return [];
};

export const clearChatHistory = (sessionId?: string): void => {
    try {
        if (typeof window !== 'undefined') {
            if (sessionId) {
                localStorage.removeItem(`chat_history_${sessionId}`);
            } else {
                // Clear all chat history
                const keys = Object.keys(localStorage).filter(key => key.startsWith('chat_history_'));
                keys.forEach(key => localStorage.removeItem(key));
            }
        }
    } catch (error) {
        console.warn('Failed to clear chat history:', error);
    }
};

// Rate limiting helpers
export const checkRateLimit = (userId: string): { allowed: boolean; resetTime?: number; } => {
    try {
        if (typeof window !== 'undefined') {
            const key = `chat_rate_limit_${userId}`;
            const stored = localStorage.getItem(key);

            if (stored) {
                const data = JSON.parse(stored) as { count: number; timestamp: number };
                const now = Date.now();

                // Reset if hour has passed
                if (now - data.timestamp > 3600000) {
                    localStorage.removeItem(key);
                    return { allowed: true };
                }

                // Check if limit exceeded (50 messages per hour)
                if (data.count >= 50) {
                    return {
                        allowed: false,
                        resetTime: data.timestamp + 3600000
                    };
                }

                // Increment count
                data.count += 1;
                localStorage.setItem(key, JSON.stringify(data));
                return { allowed: true };
            } else {
                // First message in this hour
                const data = {
                    count: 1,
                    timestamp: Date.now(),
                };
                localStorage.setItem(key, JSON.stringify(data));
                return { allowed: true };
            }
        }
    } catch (error) {
        console.warn('Rate limit check failed:', error);
    }

    return { allowed: true }; // Allow by default if check fails
};

// Analytics helpers
export const trackChatEvent = (event: string, data?: Record<string, unknown>): void => {
    try {
        // In production, integrate with your analytics service
        console.log('Chat Event:', event, data);

        // Example: Google Analytics
        const w = typeof window !== 'undefined' ? (window as unknown as { gtag?: (...args: unknown[]) => void }) : undefined;
        if (w?.gtag) {
            w.gtag('event', event, {
                event_category: 'chat',
                ...data,
            });
        }
    } catch (error) {
        console.warn('Failed to track chat event:', error);
    }
};

// Export all utilities
export default {
    generateSessionId,
    formatTimestamp,
    formatTokenUsage,
    validateMessage,
    getErrorMessage,
    showChatError,
    showChatSuccess,
    formatAIResponse,
    extractCommands,
    isAdminCommand,
    saveChatHistory,
    loadChatHistory,
    clearChatHistory,
    checkRateLimit,
    trackChatEvent,
};
