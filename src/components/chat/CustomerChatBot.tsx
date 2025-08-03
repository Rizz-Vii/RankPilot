/**
 * RankPilot Customer ChatBot Component
 * Floating chatbot interface for customer support and SEO guidance
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Maximize2, MessageCircle, Minimize2, Send, User, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// Types
interface ChatMessage {
    id: string;
    message: string;
    _response: string;
    timestamp: string;
    isUser: boolean;
    tokensUsed?: number;
}

interface ChatResponse {
    _response: string;
    sessionId: string;
    timestamp: string;
    tokensUsed: number;
    context: {
        type: string;
        dataUsed: string[];
    };
}

interface CustomerChatBotProps {
    currentUrl?: string;
    className?: string;
}

export default function CustomerChatBot({ currentUrl, className }: CustomerChatBotProps) {
    // State management
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [_error, setError] = useState<string>('');

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auth
    const { user, profile } = useAuth();

    // Auto-scroll to bottom on new messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMessage: ChatMessage = {
                id: `welcome_${Date.now()}`,
                message: '',
                _response: `👋 Hi! I'm RankPilot AI, your SEO assistant. I can help you with:

• **SEO Audit Analysis** - Explain your site's performance scores
• **Content Optimization** - Suggest improvements for better rankings  
• **Technical SEO** - Fix crawling and indexing issues
• **Keyword Strategy** - Identify opportunities for growth
• **NeuroSEO™ Insights** - Advanced AI-powered recommendations

What can I help you with today?`,
                timestamp: new Date().toISOString(),
                isUser: false,
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, messages.length]);

    // Send message to API
    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading || !user) return;

        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            message: inputValue,
            _response: '',
            timestamp: new Date().toISOString(),
            isUser: true,
        };

        // Add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError('');

        try {
            // Get user token
            const token = await user.getIdToken();

            const response = await fetch('/api/chat/customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: inputValue,
                    url: currentUrl,
                    sessionId: sessionId || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const data: ChatResponse = await response.json();

            // Update session ID if new
            if (data.sessionId && data.sessionId !== sessionId) {
                setSessionId(data.sessionId);
            }

            // Add AI response
            const aiMessage: ChatMessage = {
                id: `ai_${Date.now()}`,
                message: '',
                _response: data._response,
                timestamp: data.timestamp,
                isUser: false,
                tokensUsed: data.tokensUsed,
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
            console.error('Chat _error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Chat toggle button
    const ChatToggleButton = () => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn("fixed bottom-6 right-6 z-50", className)}
        >
            <Button
                onClick={() => setIsOpen(true)}
                size="lg"
                className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                aria-label="Open RankPilot AI Chat"
            >
                <MessageCircle className="w-6 h-6" />
            </Button>
        </motion.div>
    );

    // Chat window
    const ChatWindow = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200",
                isMinimized && "h-auto"
            )}
        >
            <Card className="h-full border-none shadow-none">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        <div>
                            <h3 className="font-semibold text-sm">RankPilot AI</h3>
                            <p className="text-xs opacity-90">SEO Assistant</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                {!isMinimized && (
                    <CardContent className="flex flex-col h-[calc(600px-80px)] p-0">
                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.map((msg, _index) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-3",
                                            msg.isUser ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {!msg.isUser && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                "max-w-[75%] rounded-lg p-3 text-sm",
                                                msg.isUser
                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-900"
                                            )}
                                        >
                                            <div className="whitespace-pre-wrap">
                                                {msg.isUser ? msg.message : msg._response}
                                            </div>

                                            {!msg.isUser && msg.tokensUsed && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {msg.tokensUsed} tokens
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        {msg.isUser && (
                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                                <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="bg-gray-100 rounded-lg p-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {_error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                                        {_error}
                                    </div>
                                )}
                            </div>
                            <div ref={messagesEndRef} />
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <Input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask about your SEO performance..."
                                    disabled={isLoading || !user}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!inputValue.trim() || isLoading || !user}
                                    size="sm"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>

                            {!user && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Please sign in to use the AI assistant
                                </p>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
        </motion.div>
    );

    if (!user) {
        return null; // Don't show chatbot if user is not authenticated
    }

    return (
        <>
            <AnimatePresence>
                {!isOpen && <ChatToggleButton />}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && <ChatWindow />}
            </AnimatePresence>
        </>
    );
}
