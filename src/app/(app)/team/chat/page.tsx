"use client";

import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from "@/components/tool-page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Hash,
  Heart,
  Image as ImageIcon,
  MoreVertical,
  Paperclip,
  Phone,
  Reply,
  Search,
  Send,
  Settings,
  Smile,
  Star,
  ThumbsUp,
  UserPlus,
  Video,
  Zap
} from "lucide-react"; // Pruned unused icons (lint cleanup)
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  channelId: string;
  timestamp: Date;
  type: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions: { [emoji: string]: string[] }; // emoji -> array of user IDs
  replyTo?: string;
  edited?: boolean;
  editedAt?: Date;
  [key: string]: unknown; // allow extra fields for virtualization/generic utils
}

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'support' | 'development' | 'announcements' | 'random';
  members: string[];
  isPrivate: boolean;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
}

interface UserPresence {
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  isTyping: boolean;
  typingIn?: string;
}

export default function TeamChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [activeChannel, setActiveChannel] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Removed unused isTyping state (could be reintroduced when implementing live typing notices)
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [channelMuted, setChannelMuted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{ id: string; type: 'audio' | 'video'; channelId: string } | null>(null);
  // Removed unused messagesEndRef
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize default channels
  const defaultChannels: ChatChannel[] = [
    {
      id: "general",
      name: "General",
      description: "General team discussions",
      type: "general",
      members: [],
      isPrivate: false,
      unreadCount: 0
    },
    {
      id: "support",
      name: "Support",
      description: "Customer support coordination",
      type: "support",
      members: [],
      isPrivate: false,
      unreadCount: 0
    },
    {
      id: "development",
      name: "Development",
      description: "Technical discussions and updates",
      type: "development",
      members: [],
      isPrivate: false,
      unreadCount: 0
    },
    {
      id: "announcements",
      name: "Announcements",
      description: "Important team announcements",
      type: "announcements",
      members: [],
      isPrivate: false,
      unreadCount: 0
    },
    {
      id: "random",
      name: "Random",
      description: "Off-topic conversations",
      type: "random",
      members: [],
      isPrivate: false,
      unreadCount: 0
    }
  ];

  // Resolve teamId for scoping chat
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      // Try memberIds lookup first
      const tQ = query(collection(db, 'teams'), where('memberIds', 'array-contains', user.uid));
      const tSnap = await getDocs(tQ);
      if (!tSnap.empty) {
        setTeamId(tSnap.docs[0].id);
        return;
      }
      // Fallback to users/{uid}.teamId
      const uSnap = await getDoc(doc(db, 'users', user.uid));
      let tId: string | undefined;
      if (uSnap.exists()) {
        const raw = uSnap.data() as Record<string, unknown>;
        if (typeof raw.teamId === 'string') tId = raw.teamId;
      }
      // Legacy fallback (user object patched with teamId client side)
      if (!tId && typeof (user as unknown as { teamId?: unknown })?.teamId === 'string') {
        tId = (user as unknown as { teamId?: string }).teamId;
      }
      if (typeof tId === 'string') setTeamId(tId);
    })();
  }, [user?.uid]);

  // Set up real-time listeners
  useEffect(() => {
    if (!user || !teamId) return;

    // Listen to messages in active channel
    const messagesQuery = query(
      collection(db, 'teamChats', teamId, 'messages'),
      where('channelId', '==', activeChannel),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    setMessagesLoading(true);
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const ts = (raw.timestamp as { toDate?: () => Date } | undefined)?.toDate?.() || new Date();
        const edited = (raw.editedAt as { toDate?: () => Date } | undefined)?.toDate?.();
        const base = raw as Partial<ChatMessage>;
        const msg: ChatMessage = {
          id: d.id,
          content: typeof base.content === 'string' ? base.content : '',
          authorId: typeof base.authorId === 'string' ? base.authorId : 'unknown',
          authorName: typeof base.authorName === 'string' ? base.authorName : 'User',
          authorAvatar: typeof base.authorAvatar === 'string' ? base.authorAvatar : undefined,
          channelId: typeof base.channelId === 'string' ? base.channelId : activeChannel,
          timestamp: ts,
          type: base.type === 'file' || base.type === 'image' || base.type === 'system' ? base.type : 'text',
          fileUrl: typeof base.fileUrl === 'string' ? base.fileUrl : undefined,
          fileName: typeof base.fileName === 'string' ? base.fileName : undefined,
          fileSize: typeof base.fileSize === 'number' ? base.fileSize : undefined,
          reactions: (base.reactions && typeof base.reactions === 'object') ? (base.reactions as ChatMessage['reactions']) : {},
          replyTo: typeof base.replyTo === 'string' ? base.replyTo : undefined,
          edited: typeof base.edited === 'boolean' ? base.edited : undefined,
          editedAt: edited,
        };
        newMessages.push(msg);
      });
      setMessages(newMessages);
      setMessagesLoading(false);
    });

    // Listen to user presence
  const presenceQuery = query(collection(db, 'presence'));
    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      const users: UserPresence[] = [];
      snapshot.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const lastSeen = (raw.lastSeen as { toDate?: () => Date } | undefined)?.toDate?.() || new Date();
        const presence: UserPresence = {
          userId: d.id,
          userName: typeof raw.userName === 'string' ? raw.userName : 'User',
          userAvatar: typeof raw.userAvatar === 'string' ? raw.userAvatar : undefined,
          status: ['online', 'away', 'busy', 'offline'].includes(String(raw.status)) ? (raw.status as UserPresence['status']) : 'offline',
          lastSeen,
          isTyping: Boolean(raw.isTyping),
          typingIn: typeof raw.typingIn === 'string' ? raw.typingIn : undefined
        };
        users.push(presence);
      });
      setOnlineUsers(users.filter(u => u.status !== 'offline'));
    });

    return () => {
      unsubscribeMessages();
      unsubscribePresence();
    };
  }, [user, teamId, activeChannel]);

  // Initialize channels and user presence
  useEffect(() => {
    if (!user || !teamId) return;

  setChannels(defaultChannels);
  setChannelsLoading(false);
    // Update user presence to online
    updateUserPresence('online');

    return () => {
      updateUserPresence('offline');
    };
  }, [user, teamId]);

  // Simple presence updater; merges into presence/{uid}
  const updateUserPresence = async (status: UserPresence['status']) => {
    try {
      if (!user) return;
      await setDoc(doc(db, 'presence', user.uid), {
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: user.photoURL ?? null,
        status,
        lastSeen: serverTimestamp(),
        isTyping: false,
        typingIn: null,
      }, { merge: true });
    } catch (e) {
      // Log but don't surface presence failures to the user
      console.warn('updateUserPresence failed', e);
    }
  };

  // Load channel settings from localStorage when channel/team changes
  useEffect(() => {
    if (!teamId) return;
    try {
      const key = `chat:${teamId}:${activeChannel}:settings`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setChannelMuted(!!parsed.muted);
        setNotificationsEnabled(parsed.notificationsEnabled !== false);
      } else {
        setChannelMuted(false);
        setNotificationsEnabled(true);
      }
    } catch (e) {
      console.warn('Failed to load channel settings', e);
    }
  }, [teamId, activeChannel]);

  // Persist channel settings
  useEffect(() => {
    if (!teamId) return;
    try {
      const key = `chat:${teamId}:${activeChannel}:settings`;
      localStorage.setItem(key, JSON.stringify({
        muted: channelMuted,
        notificationsEnabled,
      }));
    } catch (e) {
      console.warn('Failed to persist channel settings', e);
    }
  }, [teamId, activeChannel, channelMuted, notificationsEnabled]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const messageData: Record<string, unknown> = {
        content: newMessage.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'User',
        authorAvatar: user.photoURL ?? null,
        channelId: activeChannel,
        timestamp: serverTimestamp(),
        type: 'text' as const,
        reactions: {},
      };
      if (replyingTo?.id) messageData.replyTo = replyingTo.id;

      await addDoc(collection(db, 'teamChats', teamId!, 'messages'), messageData);
      setNewMessage("");
      setReplyingTo(null);
      // Update channel last message
      const channelIndex = channels.findIndex(c => c.id === activeChannel);
      if (channelIndex >= 0) {
        const updatedChannels = [...channels];
        updatedChannels[channelIndex] = {
          ...updatedChannels[channelIndex],
          lastMessage: newMessage.trim(),
          lastMessageAt: new Date()
        };
        setChannels(updatedChannels);
      }

    } catch (error) {
      console.error('Send message error:', error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Removed legacy auto-scroll function wrapper; consider adding explicit scroll handler if needed.

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = { ...message.reactions };
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      const userIndex = reactions[emoji].indexOf(user.uid);
      if (userIndex >= 0) {
        // Remove reaction
        reactions[emoji].splice(userIndex, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        // Add reaction
        reactions[emoji].push(user.uid);
      }

      await updateDoc(doc(db, 'teamChats', teamId!, 'messages', messageId), { reactions });
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };
  const filteredMessages = messages.filter((message) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      message.content.toLowerCase().includes(q) ||
      message.authorName.toLowerCase().includes(q)
    );
  });

  function getChannelIcon(type: ChatChannel['type']) {
    switch (type) {
      case 'support':
        return Bell;
      case 'development':
        return Zap;
      case 'announcements':
        return Star;
      case 'random':
        return Smile;
      default:
        return Hash;
    }
  }

  // Start an audio/video call by posting a system message (rules-safe)
  const startCall = async (type: 'audio' | 'video') => {
    if (!user || !teamId) return;
    const id = `${type}-${Date.now()}`;
    setActiveCall({ id, type, channelId: activeChannel });
    setIsCallOpen(true);
    try {
      await addDoc(collection(db, 'teamChats', teamId, 'messages'), {
        type: 'system',
        content: `${type === 'video' ? 'Video' : 'Audio'} call started by ${user.displayName || user.email?.split('@')[0] || 'User'}`,
        authorId: 'system',
        authorName: 'System',
        authorAvatar: null,
        channelId: activeChannel,
        timestamp: serverTimestamp(),
        reactions: {},
      });
    } catch (e) {
      console.warn('Failed to post system message', e);
    }
  };

  return (
    <FeatureGate feature="team_management" requiredTier="agency" showUpgrade>
    <main className="container mx-auto py-4 sm:py-6 flex flex-col h-[calc(100vh-6rem)] overscroll-contain">
      <ToolPageHeader
        title="Team Chat"
        description="Real-time collaboration and communication"
        badges={[
          { label: "Collaboration", variant: "secondary" },
          { label: "Enterprise", variant: "outline", className: "text-primary border-primary/40" },
        ]}
        showBreadcrumb
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Channels Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Channels</CardTitle>
              <Button size="sm" variant="ghost">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {channelsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            )}
            {!channelsLoading && channels.map((channel) => {
              const Icon = getChannelIcon(channel.type);
              return (
                <Button
                  key={channel.id}
                  variant={activeChannel === channel.id ? "default" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => setActiveChannel(channel.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{channel.name}</div>
                      {channel.lastMessage && (
                        <div className="text-xs text-muted-foreground truncate">
                          {channel.lastMessage}
                        </div>
                      )}
                    </div>
                    {channel.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {channel.unreadCount}
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}

            <Separator className="my-4" />

            {/* Online Users */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Online ({onlineUsers.length})
              </Label>
              {onlineUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-2 p-2">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.userAvatar} />
                      <AvatarFallback className="text-xs">
                        {user.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                      user.status === 'online' ? 'bg-success' :
                      user.status === 'away' ? 'bg-warning' :
                      user.status === 'busy' ? 'bg-destructive' : 'bg-muted'
                    }`} />
                  </div>
                  <span className="text-sm truncate">{user.userName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          {/* Chat Header */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const channel = channels.find(c => c.id === activeChannel);
                  const Icon = getChannelIcon(channel?.type || 'general');
                  return (
                    <>
                      <Icon className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">#{channel?.name || 'General'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {channel?.description || 'General discussions'}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => startCall('audio')}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startCall('video')}>
                  <Video className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 mb-4">
              {messagesLoading && (
                <div className="space-y-4 pr-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!messagesLoading && (
                <VirtualizedMessageList
                  items={filteredMessages}
                  className="pr-4"
                  renderItem={(message, index) => {
                    const isConsecutive = index > 0 &&
                      filteredMessages[index - 1].authorId === message.authorId &&
                      (message.timestamp.getTime() - filteredMessages[index - 1].timestamp.getTime()) < 300000;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative py-1 ${selectedMessage === message.id ? 'bg-muted/50 rounded-lg px-2' : ''}`}
                        onMouseEnter={() => setSelectedMessage(message.id)}
                        onMouseLeave={() => setSelectedMessage(null)}
                      >
                        <div className="flex gap-3">
                          {!isConsecutive && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={message.authorAvatar} />
                              <AvatarFallback className="text-xs">
                                {message.authorName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex-1 ${isConsecutive ? 'ml-11' : ''}`}>
                            {!isConsecutive && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{message.authorName}</span>
                                <span className="text-xs text-muted-foreground">{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
                                {message.edited && (<Badge variant="outline" className="text-xs">edited</Badge>)}
                              </div>
                            )}
                            {message.replyTo && (
                              <div className="mb-2 p-2 border-l-2 border-muted bg-muted/50 rounded text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Reply className="h-3 w-3" />
                                  Replying to message
                                </div>
                              </div>
                            )}
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                            {Object.keys(message.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(message.reactions).map(([emoji, userIds]) => (
                                  <Button
                                    key={emoji}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => addReaction(message.id, emoji)}
                                  >
                                    {emoji} {userIds.length}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                          <AnimatePresence>
                            {selectedMessage === message.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1 absolute top-0 right-0 bg-background border rounded shadow-sm"
                              >
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Heart className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><ThumbsUp className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setReplyingTo(message)}><Reply className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreVertical className="h-3 w-3" /></Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  }}
                />
              )}
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="text-xs text-muted-foreground mb-2 px-2">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Reply Preview */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-3 border border-muted rounded-lg bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Reply className="h-3 w-3" />
                      Replying to {replyingTo.authorName}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setReplyingTo(null)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="text-sm truncate">{replyingTo.content}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={messageInputRef}
                  placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name || 'general'}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                    <ImageIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Smile className="h-4 w-4" />
                </Button>
                  <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          {/* Accessibility: provide hidden description to satisfy dialog requirements */}
          <div className="sr-only" id="team-chat-dialog-desc">Team chat management dialog</div>
          {/* existing dialog content follows */}
          <DialogHeader>
            <DialogTitle>Channel Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Mute channel</div>
                <div className="text-sm text-muted-foreground">Silence notifications for this channel</div>
              </div>
              <Button variant={channelMuted ? 'default' : 'outline'} size="sm" onClick={() => setChannelMuted(v => !v)}>
                {channelMuted ? 'Muted' : 'Unmuted'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Notifications</div>
                <div className="text-sm text-muted-foreground">Enable desktop notifications</div>
              </div>
              <Button variant={notificationsEnabled ? 'default' : 'outline'} size="sm" onClick={() => setNotificationsEnabled(v => !v)}>
                {notificationsEnabled ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Modal */}
      <Dialog open={isCallOpen} onOpenChange={setIsCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeCall?.type === 'video' ? 'Video Call' : 'Audio Call'} Started</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>Channel: #{activeChannel}</div>
            {activeCall && (
              <div className="text-sm text-muted-foreground">Call ID: {activeCall.id}</div>
            )}
            <div className="text-sm">This is a preview call modal. A system message has been posted in the channel.</div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCallOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  </main>
  </FeatureGate>
  );
}
