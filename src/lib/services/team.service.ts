/**
 * Team Service - Real-time team membership management layer
 *
 * Provides:
 * - Real-time subscription to a user's team members
 * - Secure mutation helpers calling protected API routes
 * - Ownership/role invariant helpers (no last-owner removal, etc.)
 *
 * All write operations are funneled through Next.js API routes /api/team/*
 * which perform server-side auth (verifyIdToken) and enforce role rules.
 */
import {
    collection, doc, query, where, getDoc, getDocs, DocumentData, getDocs as clientGetDocs, onSnapshot
} from "firebase/firestore";
import { managedOnSnapshot } from '@/lib/firebase/write-guard';
import { db, auth } from "@/lib/firebase";

export type TeamRole = "owner" | "admin" | "member" | "viewer";
export type TeamStatus = "active" | "pending" | "inactive";

export interface TeamMember {
    id: string;            // canonical: userId (preferred) or generated stable id
    userId?: string;       // explicit user uid when known
    email: string;
    name: string;
    role: TeamRole;
    status: TeamStatus;
    avatar?: string;
    joinedAt: Date;
    lastActive: Date;
}

export interface SubscribeOptions {
    userId: string;
    onData: (members: TeamMember[]) => void;
    onError?: (err: any) => void;
}

// Utility to map raw Firestore member object
function mapMember(raw: any): TeamMember {
    const joined = raw.joinedAt?.toDate?.() || new Date(raw.joinedAt || Date.now());
    const lastActive = raw.lastActive?.toDate?.() || new Date(raw.lastActive || Date.now());
    return {
        id: raw.userId || raw.id || raw.email || crypto.randomUUID(),
        userId: raw.userId,
        email: raw.email || "",
        name: raw.name || (raw.email ? raw.email.split("@")[0] : "Member"),
        role: (raw.role || "member") as TeamRole,
        status: (raw.status || "active") as TeamStatus,
        avatar: raw.avatar,
        joinedAt: joined,
        lastActive
    };
}

async function resolveTeamDoc(userId: string): Promise<DocumentData | null> {
    // Strategy: check teams collection for membership, then user's teamId field
    const q = query(collection(db, "teams"), where("memberIds", "array-contains", userId));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
        const teamId = (userDoc.data() as any)?.teamId;
        if (teamId) {
            const t = await getDoc(doc(db, "teams", teamId));
            if (t.exists()) return { id: t.id, ...t.data() } as any;
        }
    }
    return null;
}

export async function subscribeToTeamMembers({ userId, onData, onError }: SubscribeOptions): Promise<() => void> {
    try {
        const team = await resolveTeamDoc(userId);
        if (!team) {
            onData([]); // emit empty
            return () => { };
        }

        // Phase 2 Enhanced: Live subcollection snapshot (primary) with periodic refresh fallback
        let lastEmit = Date.now();
        const refreshIntervalMs = 60_000; // 1 minute fallback refresh
        const membersCol = collection(db, 'teams', team.id, 'members');
        let intervalHandle: any;
        try {
            const initial = await clientGetDocs(query(membersCol));
            if (!initial.empty) {
                const mapped = initial.docs.map(d => mapMember({ id: d.id, ...d.data() }));
                onData(mapped);
                lastEmit = Date.now();
                const membersUnsub = onSnapshot(query(membersCol), (snap) => {
                    const updated = snap.docs.map(d => mapMember({ id: d.id, ...d.data() }));
                    onData(updated);
                    lastEmit = Date.now();
                }, (err) => {
                    onError?.(err);
                });
                intervalHandle = setInterval(async () => {
                    // If no updates for a while, perform a soft refresh to guard against missed events
                    if (Date.now() - lastEmit > refreshIntervalMs * 2) {
                        try {
                            const refetch = await clientGetDocs(query(membersCol));
                            const updated = refetch.docs.map(d => mapMember({ id: d.id, ...d.data() }));
                            onData(updated);
                            lastEmit = Date.now();
                        } catch (e) {
                            // swallow refresh errors
                        }
                    }
                }, refreshIntervalMs);
                return () => { membersUnsub(); if (intervalHandle) clearInterval(intervalHandle); };
            }
        } catch { /* fallback to embedded logic below */ }

        const teamRef = doc(db, 'teams', team.id);
        const unsub = managedOnSnapshot(teamRef, (snapshot: any) => {
            if (!snapshot.exists()) {
                onData([]);
                return;
            }
            const data: any = snapshot.data();
            const membersArr = Array.isArray(data.members) ? data.members : [];
            onData(membersArr.map(mapMember));
        }, (err: any) => onError?.(err), { debounceMs: 120 });
        return () => { unsub(); if (intervalHandle) clearInterval(intervalHandle); };
    } catch (e) {
        onError?.(e);
        onData([]);
        return () => { };
    }
}

// ---- Secure mutation helpers (delegate to API) ----

async function apiRequest(path: string, options?: RequestInit) {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : undefined;
    const res = await fetch(path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options?.headers || {})
        },
        cache: "no-store"
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
    }
    return res.json();
}

export interface InvitePayload { email: string; role: TeamRole; message?: string }

export async function inviteTeamMember(payload: InvitePayload) {
    return apiRequest("/api/team/invite", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateTeamMemberRole(memberId: string, role: TeamRole) {
    return apiRequest(`/api/team/member/${memberId}/role`, { method: "POST", body: JSON.stringify({ role }) });
}

export async function removeTeamMember(memberId: string) {
    return apiRequest(`/api/team/member/${memberId}`, { method: "DELETE" });
}

export async function resendTeamInvite(memberId: string) {
    return apiRequest(`/api/team/member/${memberId}/resend`, { method: "POST" });
}

export async function transferTeamOwnership(targetMemberId: string) {
    return apiRequest(`/api/team/transfer-ownership`, { method: 'POST', body: JSON.stringify({ targetMemberId }) });
}

// Helper to check ownership invariants client-side (additional server enforcement still required)
export function canModifyMember(currentUserId: string, target: TeamMember, members: TeamMember[]): boolean {
    if (target.role === "owner") return false; // Never modify owner from UI (only via transfer process)
    const current = members.find(m => m.id === currentUserId || m.userId === currentUserId);
    if (!current) return false;
    if (current.role === "viewer" || current.role === "member") return false;
    return true; // admin or owner
}

export function canRemoveMember(target: TeamMember, members: TeamMember[]): boolean {
    if (target.role === "owner") return false;
    // Prevent removing last admin if no other owner (safeguard)
    const admins = members.filter(m => m.role === "admin").length;
    if (target.role === "admin" && admins <= 1) return false;
    return true;
}
