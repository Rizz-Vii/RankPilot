/**
 * RankPilot Admin ChatBot Component
 * Advanced chatbot interface for admin users with system management capabilities
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { auth, storage } from "@/lib/firebase";
import { fetchSSE } from "@/lib/sse/adapter";
import { cn } from "@/lib/utils";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { AnimatePresence, motion } from "framer-motion";
import DOMPurify from "isomorphic-dompurify";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canNavigateTo, resolveAdminCommandRoute } from "./nav-map";

// Types
interface AdminChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: string;
  isUser: boolean;
  tokensUsed?: number;
  metadata?: {
    systemMetrics?: boolean;
    performanceData?: boolean;
  };
}

interface AdminChatResponse {
  response: string;
  sessionId: string;
  timestamp: string;
  tokensUsed: number;
  context: {
    type: string;
    dataUsed: string[];
  };
}

interface AdminChatBotProps {
  className?: string;
}

export default function AdminChatBot({ className }: AdminChatBotProps) {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState("chat");
  const [isComposing, setIsComposing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Auth
  const { user, role } = useAuth();
  // Admin-only gating (role must be 'admin')
  const isAdmin = role === "admin";
  const router = useRouter();

  // Auto-scroll to bottom on new messages
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Guard against unexpected input blur (focus stealing/remounts)
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement !== el) {
      try {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      } catch {
        // ignore
      }
    }
    // Run when input changes or window state changes to keep caret stable during typing
  }, [inputValue, isOpen, isMinimized]);

  // Initialize with admin welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0 && isAdmin) {
      const welcomeMessage: AdminChatMessage = {
        id: `admin_welcome_${Date.now()}`,
        message: "",
        response: `🛡️ **RankPilot Admin AI** - System Management Assistant

**Available Commands:**
• \`/system status\` - Get real-time system health
• \`/users analytics\` - User engagement metrics
• \`/performance report\` - System performance analysis
• \`/errors analyze\` - Error tracking and resolution
• \`/billing overview\` - Revenue and subscription insights
• \`/database metrics\` - Database performance stats

**Quick Actions:**
• Monitor system health and performance
• Analyze user behavior and engagement
• Track errors and suggest fixes
• Generate business intelligence reports
• Optimize system performance

What would you like to analyze today?`,
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, isAdmin]);

  // Image upload -> insert URL into input
  const handleImageSelect = async (
    _e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    try {
      const file = _e.target.files?.[0];
      if (!file) return;
      if (!user) {
        setError("Authentication required");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Unsupported image type");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image exceeds 5MB");
        return;
      }
      setUploading(true);
      const path = `adminChatUploads/${user.uid}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      setInputValue((prev) => (prev ? `${prev} ${url}` : url));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Audio recording -> upload -> insert URL
  const startRecording = async (): Promise<void> => {
    try {
      setMicBlocked(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, {
            type: "audio/webm",
          });
          if (blob.size > 10 * 1024 * 1024) {
            setError("Audio exceeds 10MB");
            return;
          }
          if (!user) {
            setError("Authentication required");
            return;
          }
          setUploading(true);
          const path = `adminChatUploads/${user.uid}/${Date.now()}.webm`;
          const sRef = storageRef(storage, path);
          await uploadBytes(sRef, blob);
          const url = await getDownloadURL(sRef);
          setInputValue((prev) => (prev ? `${prev} ${url}` : url));
          setError("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Audio upload failed");
        } finally {
          setUploading(false);
        }
        // release devices
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
      };
      rec.start();
      audioRecorderRef.current = rec;
    } catch {
      setMicBlocked(true);
      setError("Microphone permission denied or unavailable");
    }
  };

  const stopRecording = (): void => {
    try {
      audioRecorderRef.current?.stop();
    } catch {}
    audioRecorderRef.current = null;
  };

  // Send message to API
  const sendMessage = async (): Promise<void> => {
    const messageToSend = inputValue.trim();
    if (!messageToSend || isLoading || !user || !isAdmin) return;

    const userMessage: AdminChatMessage = {
      id: `admin_user_${Date.now()}`,
      message: messageToSend,
      response: "",
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError("");

    try {
      // Get fresh user token to avoid 401 from stale tokens
      const curr = auth.currentUser;
      if (!curr || typeof curr.getIdToken !== "function") {
        throw new Error(
          "Authentication failed. Please sign in again and retry."
        );
      }
      const token = await curr.getIdToken(true);
      // Try streaming endpoint first
      let usedStreaming = false;
      try {
        setStreaming(true);
        const controller = new AbortController();
        streamAbortRef.current = controller;
        const streamRes = await fetchSSE("/api/chat/admin/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: messageToSend,
            sessionId: sessionId || undefined,
          }),
          signal: controller.signal,
          timeoutMs: 60000,
        });
        if (
          streamRes.ok &&
          streamRes.headers.get("content-type")?.includes("text/event-stream")
        ) {
          usedStreaming = true;
          const aiId = `admin_ai_${Date.now()}`;
          streamingMessageIdRef.current = aiId;
          let accumulated = "";
          setMessages((prev) => [
            ...prev,
            {
              id: aiId,
              message: "",
              response: "",
              timestamp: new Date().toISOString(),
              isUser: false,
            },
          ]);
          const reader = streamRes.body?.getReader();
          const decoder = new TextDecoder();
          if (reader) {
            let doneReading = false;
            let buffer = "";
            while (!doneReading) {
              const chunk = await reader.read();
              doneReading = chunk.done || false;
              if (chunk.value)
                buffer += decoder.decode(chunk.value, { stream: !doneReading });
              const parts = buffer.split("\n\n");
              buffer = parts.pop() || "";
              for (const part of parts) {
                if (!part.startsWith("data:")) continue;
                const dataStr = part.slice(5).trim();
                if (dataStr === "[DONE]") {
                  doneReading = true;
                  break;
                }
                try {
                  const json = JSON.parse(dataStr) as Record<string, unknown>;
                  const tokenPiece = json["token"];
                  if (typeof tokenPiece === "string") {
                    accumulated += tokenPiece;
                    const interim = accumulated
                      .replace(/</g, "&lt;")
                      .replace(/\n/g, "<br/>");
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiId ? { ...m, response: interim } : m
                      )
                    );
                  } else if (json["final"]) {
                    const sessionIdPiece = json["sessionId"];
                    if (
                      typeof sessionIdPiece === "string" &&
                      sessionIdPiece !== sessionId
                    )
                      setSessionId(sessionIdPiece);
                    const tokensUsedPiece = json["tokensUsed"];
                    if (typeof tokensUsedPiece === "number") {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiId
                            ? { ...m, tokensUsed: tokensUsedPiece }
                            : m
                        )
                      );
                    }
                  } else if (typeof json["error"] === "string") {
                    setError(json["error"]);
                  }
                } catch {
                  /* ignore parse issues */
                }
              }
            }
          }
          // Final sanitize
          try {
            const html = DOMPurify.sanitize(
              accumulated.replace(/\n/g, "<br/>")
            );
            setMessages((prev) =>
              prev.map((m) => (m.id === aiId ? { ...m, response: html } : m))
            );
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* fall back to non-stream */
      } finally {
        setStreaming(false);
        streamAbortRef.current = null;
        streamingMessageIdRef.current = null;
      }

      if (usedStreaming) return; // streaming already handled

      // Fallback: non-streaming admin route
      const response = await fetch("/api/chat/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageToSend,
          sessionId: sessionId || undefined,
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to send admin message";
        try {
          const errorData = await response.json();
          errMsg =
            ((errorData as Record<string, unknown>)?.["error"] as string) ||
            errMsg;
        } catch {}
        if (response.status === 401) {
          errMsg = "Authentication failed. Please sign in again and retry.";
        }
        throw new Error(errMsg);
      }

      const data: AdminChatResponse = await response.json();

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage: AdminChatMessage = {
        id: `admin_ai_${Date.now()}`,
        message: "",
        response: data.response,
        timestamp: data.timestamp,
        isUser: false,
        tokensUsed: data.tokensUsed,
        metadata: {
          systemMetrics:
            Array.isArray(data.context?.dataUsed) &&
            data.context.dataUsed.includes("system_metrics"),
          performanceData:
            Array.isArray(data.context?.dataUsed) &&
            data.context.dataUsed.includes("performance_data"),
        },
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send admin message"
      );
      console.error("Admin chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.stopPropagation();
    const nativeEvent = e.nativeEvent as KeyboardEvent & {
      isComposing?: boolean;
      stopImmediatePropagation?: () => void;
    };
    if (
      nativeEvent &&
      typeof nativeEvent.stopImmediatePropagation === "function"
    ) {
      nativeEvent.stopImmediatePropagation();
    }
    // Avoid sending during IME composition
    const composing = !!nativeEvent?.isComposing || isComposing;
    if (composing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // Quick command buttons
  const quickCommands = [
    { label: "System Status", command: "/system status", icon: Shield },
    { label: "User Analytics", command: "/users analytics", icon: Users },
    { label: "Performance", command: "/performance report", icon: TrendingUp },
    {
      label: "Error Analysis",
      command: "/errors analyze",
      icon: AlertTriangle,
    },
    {
      label: "Billing Overview",
      command: "/billing overview",
      icon: BarChart3,
    },
  ];

  // Admin toggle button (inline element to preserve element identity across renders)
  const adminToggleButton = (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn("fixed bottom-6 left-6 z-50", className)}
    >
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="w-14 h-14 rounded-full bg-gradient-to-r from-destructive to-warning hover:from-destructive/90 hover:to-warning/90 shadow-lg hover:shadow-xl transition-all duration-200"
        aria-label="Open Admin AI Chat"
      >
        <Settings className="w-6 h-6" />
      </Button>
    </motion.div>
  );

  // Admin chat window (inline element to avoid component remounts that can steal input focus)
  const adminChatWindow = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        height: isMinimized ? "auto" : "700px",
      }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed bottom-6 left-6 z-50 w-[500px] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden",
        isMinimized && "h-auto"
      )}
    >
      <Card className="h-full border-none shadow-none">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-destructive to-warning text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">RankPilot Admin AI</h3>
              <p className="text-xs opacity-90">System Management</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsMinimized(!isMinimized);
              }}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
              }}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="flex flex-col h-[calc(700px-80px)] p-0 min-h-0 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col min-h-0"
            >
              <TabsList className="grid grid-cols-2 w-full rounded-none border-b">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="commands">Quick Commands</TabsTrigger>
              </TabsList>

              <TabsContent
                value="chat"
                className="flex-1 flex flex-col mt-0 min-h-0"
              >
                {/* Messages */}
                <ScrollArea className="flex-1 p-4 min-h-0 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          msg.isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        {!msg.isUser && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-destructive to-warning flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg p-3 text-sm",
                            msg.isUser
                              ? "bg-gradient-to-r from-destructive to-warning text-white"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {msg.isUser ? (
                            <div className="whitespace-pre-wrap">
                              {msg.message}
                            </div>
                          ) : (
                            <div
                              className="prose prose-sm max-w-none break-words prose-pre:break-words prose-pre:whitespace-pre-wrap prose-pre:overflow-x-auto prose-code:break-words prose-img:max-w-full overflow-hidden"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(msg.response || ""),
                              }}
                            />
                          )}

                          {!msg.isUser && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {msg.tokensUsed && (
                                <Badge variant="secondary" className="text-xs">
                                  {msg.tokensUsed} tokens
                                </Badge>
                              )}
                              {msg.metadata?.systemMetrics && (
                                <Badge variant="outline" className="text-xs">
                                  System Data
                                </Badge>
                              )}
                              {msg.metadata?.performanceData && (
                                <Badge variant="outline" className="text-xs">
                                  Performance
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {msg.isUser && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}

                    {(isLoading || streaming) && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-destructive to-warning flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                              {streaming
                                ? "Streaming response…"
                                : "Analyzing system data..."}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2 items-center">
                    {/* Hidden file input for images */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void handleImageSelect(e);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || uploading || !isAdmin}
                      aria-label="Attach image"
                      title="Attach image"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </Button>
                    {audioRecorderRef.current ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={stopRecording}
                        aria-label="Stop recording"
                        title="Stop recording"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="6" y="6" width="12" height="12" />
                        </svg>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          void startRecording();
                        }}
                        aria-label="Record voice note"
                        title="Record voice note"
                        disabled={isLoading || uploading || !isAdmin}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 1v14" />
                          <path d="M8 5v6a4 4 0 0 0 8 0V5" />
                          <path d="M5 10a7 7 0 0 0 14 0" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                      </Button>
                    )}
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      placeholder="Ask about system performance, users, errors..."
                      disabled={isLoading || !isAdmin}
                      className="flex-1"
                      enterKeyHint="send"
                      spellCheck
                      autoCorrect="on"
                      autoCapitalize="sentences"
                    />
                    <Button
                      onClick={() => {
                        void sendMessage();
                      }}
                      disabled={
                        !inputValue.trim() || isLoading || streaming || !isAdmin
                      }
                      size="sm"
                      className="bg-gradient-to-r from-destructive to-warning hover:from-destructive/90 hover:to-warning/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {(uploading || micBlocked) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {uploading && <span>Uploading…</span>}
                      {micBlocked && !uploading && (
                        <span>Microphone blocked by permissions</span>
                      )}
                    </div>
                  )}

                  {!isAdmin && (
                    <p className="text-xs text-destructive mt-2">
                      Admin access required
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="commands" className="flex-1 mt-0">
                <div className="p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Quick Commands
                  </h4>
                  <div className="space-y-2">
                    {quickCommands.map((cmd, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start gap-2 h-auto p-3"
                        onClick={() => {
                          const route = resolveAdminCommandRoute(cmd.command);
                          if (
                            route &&
                            isAdmin &&
                            canNavigateTo("starter", route, { isAdmin: true })
                          ) {
                            try {
                              router.push(route);
                            } catch {}
                            setIsOpen(false);
                          } else {
                            setInputValue(cmd.command);
                            setActiveTab("chat");
                            setTimeout(() => {
                              void sendMessage();
                            }, 0);
                          }
                        }}
                        disabled={isLoading || !isAdmin}
                      >
                        <cmd.icon className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium text-sm">{cmd.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {cmd.command}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );

  if (!isAdmin) {
    return null; // Don't show admin chatbot if user doesn't have admin access
  }

  return (
    <>
      <AnimatePresence>{!isOpen && adminToggleButton}</AnimatePresence>

      <AnimatePresence>{isOpen && adminChatWindow}</AnimatePresence>
    </>
  );
}
