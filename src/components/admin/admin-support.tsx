"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { Mail, MessageSquareReply, UserPlus, RefreshCw, Filter } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type SupportMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status?: string; // received | open | in_progress | resolved
  emailStatus?: string; // sent | replied | failed
  emailMessageId?: string;
  assignedTo?: string; // admin email or uid
  createdAt?: unknown;
  updatedAt?: unknown;
};

// Minimal Firestore Timestamp-like narrowing
interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(v: unknown): v is TimestampLike {
  return !!v && typeof v === 'object' && 'toDate' in v && typeof (v as any).toDate === 'function';
}

export default function AdminSupport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [activeItem, setActiveItem] = useState<SupportMessage | null>(null);

  useEffect(() => {
    const qy = query(collection(db, "supportMessages"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: SupportMessage[] = snap.docs.map((d) => {
          const data = d.data() as Partial<SupportMessage>;
          return {
            id: d.id,
            name: data.name || '',
            email: data.email || '',
            subject: data.subject || '',
            message: data.message || '',
            category: data.category || 'general',
            status: data.status,
            emailStatus: data.emailStatus,
            emailMessageId: data.emailMessageId,
            assignedTo: data.assignedTo,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        });
        setItems(list);
        setLoading(false);
      },
      (error: unknown) => {
        console.error("AdminSupport Firestore error:", error);
        setLoading(false);
        let msg = 'Failed to load support messages';
        if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
          msg = (error as any).message;
        }
        try { toast.error(msg); } catch {}
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        !search ||
        it.subject?.toLowerCase().includes(search.toLowerCase()) ||
        it.email?.toLowerCase().includes(search.toLowerCase()) ||
        it.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || (it.status || "received") === statusFilter;
      const matchesCategory = categoryFilter === "all" || (it.category || "general") === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, statusFilter, categoryFilter]);

  const setStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "supportMessages", id), { status, updatedAt: serverTimestamp() });
      toast.success("Status updated");
    } catch (e: unknown) {
      let msg = 'Failed to update status';
      if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') msg = (e as any).message;
      toast.error(msg);
    }
  };

  const assignToMe = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "supportMessages", id), {
        assignedTo: user.email || user.uid,
        status: "in_progress",
        updatedAt: serverTimestamp(),
      });
      toast.success("Assigned to you");
    } catch (e: unknown) {
      let msg = 'Failed to assign';
      if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') msg = (e as any).message;
      toast.error(msg);
    }
  };

  const openReply = (item: SupportMessage) => {
    setActiveItem(item);
    setReplySubject(item.subject?.startsWith("Re:") ? item.subject : `Re: ${item.subject}`);
    setReplyBody("");
    setReplyOpen(true);
  };

  const sendReply = async () => {
    if (!activeItem) return;
    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: activeItem.id,
          subject: replySubject,
          reply: replyBody,
        }),
      });
      if (!res.ok) {
        let fallback = 'Failed to send reply';
        try {
          const j = await res.json();
          if (j && typeof j === 'object' && 'message' in j && typeof j.message === 'string') fallback = j.message;
        } catch {}
        throw new Error(fallback);
      }
      toast.success("Reply sent");
      setReplyOpen(false);
    } catch (e: unknown) {
      let msg = 'Failed to send reply';
      if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') msg = (e as any).message;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareReply className="h-5 w-5" /> Support Inbox
          </CardTitle>
          <CardDescription>View, assign, reply, and resolve support messages.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground mb-3">Loading messages…</div>
          )}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by subject, name, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setSearch("")}> <RefreshCw className="h-4 w-4 mr-2"/> Reset</Button>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">
                      {isTimestampLike(m.createdAt)
                        ? formatDistanceToNow(m.createdAt.toDate(), { addSuffix: true })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4"/>
                        <div>
                          <div className="font-medium">{m.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px]">{m.subject}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{m.category || "general"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.status === "resolved" ? "secondary" : "outline"} className="capitalize">
                          {m.status || "received"}
                        </Badge>
                        {m.emailStatus && (
                          <Badge variant="outline" className="capitalize">{m.emailStatus}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.assignedTo ? (
                        <span className="text-sm">{m.assignedTo}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => assignToMe(m.id)}>
                          <UserPlus className="h-4 w-4 mr-1"/> Assign to me
                        </Button>
                        <Button size="sm" onClick={() => openReply(m)}>
                          <MessageSquareReply className="h-4 w-4 mr-1"/> Reply
                        </Button>
                        {m.status !== "resolved" && (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(m.id, "resolved")}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No messages</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {activeItem?.email}</DialogTitle>
            <DialogDescription>Send a response; the conversation will be logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={replySubject} onChange={(e) => setReplySubject(e.target.value)} placeholder="Subject"/>
            <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={6} placeholder="Write your reply..."/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
            <Button onClick={sendReply} disabled={!replyBody.trim()}>Send reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
