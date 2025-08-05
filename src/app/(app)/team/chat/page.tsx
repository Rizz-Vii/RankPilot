"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  Users, 
  Send, 
  Hash,
  Phone,
  Video,
  Paperclip,
  Image,
  Smile,
  Search,
  Settings,
  MoreVertical,
  UserPlus,
  Bell,
  BellOff,
  Pin,
  Reply,
  Heart,
  ThumbsUp,
  Download,
  File,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Zap,
  Star,
  Edit3,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc,
  doc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [activeChannel, setActiveChannel] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Set up real-time listeners
  useEffect(() => {
    if (!user) return;

    // Listen to messages in active channel
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('channelId', '==', activeChannel),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate()
        } as ChatMessage);
      });
      setMessages(newMessages);
      scrollToBottom();
    });

    // Listen to user presence
    const presenceQuery = query(collection(db, 'userPresence'));
    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      const users: UserPresence[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          userId: doc.id,
          ...data,
          lastSeen: data.lastSeen?.toDate() || new Date()
        } as UserPresence);
      });
      setOnlineUsers(users.filter(u => u.status !== 'offline'));
    });

    return () => {
      unsubscribeMessages();
      unsubscribePresence();
    };
  }, [user, activeChannel]);

  // Initialize channels and user presence
  useEffect(() => {
    if (!user) return;

    setChannels(defaultChannels);
    
    // Update user presence to online
    updateUserPresence('online');

    return () => {
      updateUserPresence('offline');
    };
  }, [user]);

  const updateUserPresence = async (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'userPresence', user.uid), {
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: user.photoURL,
        status,
        lastSeen: serverTimestamp(),
        isTyping: false
      });
    } catch (error) {
      console.log('User presence document does not exist, creating new one:', error);
      // Document doesn't exist, create it
      await addDoc(collection(db, 'userPresence'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: user.photoURL,
        status,
        lastSeen: serverTimestamp(),
        isTyping: false
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const messageData = {
        content: newMessage.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'User',
        authorAvatar: user.photoURL,
        channelId: activeChannel,
        timestamp: serverTimestamp(),
        type: 'text' as const,
        reactions: {},
        replyTo: replyingTo?.id
      };

      await addDoc(collection(db, 'chatMessages'), messageData);
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

    } catch (_error) {
      console.error('Send message _error:', _error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

      await updateDoc(doc(db, 'chatMessages', messageId), { reactions });
    } catch (_error) {
      console.error('Reaction _error:', _error);
    }
  };

  const filteredMessages = messages.filter(message =>
    searchQuery === "" || 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'general': return Hash;
      case 'support': return Users;
      case 'development': return Zap;
      case 'announcements': return Bell;
      case 'random': return Smile;
      default: return Hash;
    }
  };

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Team Chat</h1>
          <p className="text-muted-foreground">
            Real-time collaboration and communication
          </p>
        </div>
      </div>

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
            {channels.map((channel) => {
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
                      user.status === 'online' ? 'bg-green-500' :
                      user.status === 'away' ? 'bg-yellow-500' :
                      user.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
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
                <Button size="sm" variant="ghost">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Video className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-4 pr-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery ? 'No messages found' : 'Start the conversation'}
                    </h3>
                    <p>
                      {searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'Be the first to send a message in this channel'
                      }
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((message, index) => {
                    const isConsecutive = index > 0 && 
                      filteredMessages[index - 1].authorId === message.authorId &&
                      (message.timestamp.getTime() - filteredMessages[index - 1].timestamp.getTime()) < 300000; // 5 minutes

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative ${
                          selectedMessage === message.id ? 'bg-muted/50 rounded-lg p-2' : ''
                        }`}
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
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                                </span>
                                {message.edited && (
                                  <Badge variant="outline" className="text-xs">edited</Badge>
                                )}
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
                            
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </div>
                            
                            {/* Reactions */}
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
                          
                          {/* Message Actions */}
                          <AnimatePresence>
                            {selectedMessage === message.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1 absolute top-0 right-0 bg-background border rounded shadow-sm"
                              >
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <Heart className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0"
                                  onClick={() => setReplyingTo(message)}
                                >
                                  <Reply className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

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
                  <Image className="h-4 w-4" />
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
    </div>
  );
}
