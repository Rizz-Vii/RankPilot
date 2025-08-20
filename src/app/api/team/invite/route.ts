import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';
// NOTE: Global collection 'invites_index' provides O(1) inviteId -> teamId mapping.
// Cleanup: scripts/cleanup-invites.ts prunes accepted/expired invites and orphan index docs.

// Simple invariant helpers
interface TeamMember { userId?: string; id?: string; email?: string; role?: string; status?: string; invitedAt?: any; lastActive?: any; joinedAt?: any; }
interface TeamDoc { memberIds?: string[]; members?: TeamMember[];[k: string]: unknown; }
interface InviteData { emailLower: string; role: string; status: string; invitedAt: any; expiresAt?: any; tokenHash?: string; email?: string;[k: string]: unknown; }

async function getTeamForUser(uid: string) {
    // membership via memberIds
    // Firestore admin SDK uses 'array-contains'
    const teamsSnap = await adminDb.collection("teams").where("memberIds", 'array-contains', uid).limit(1).get();
    if (!teamsSnap.empty) return { id: teamsSnap.docs[0].id, data: teamsSnap.docs[0].data() };
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const teamId = userDoc.exists ? userDoc.data()?.teamId : undefined;
    if (teamId) {
        const teamDoc = await adminDb.collection("teams").doc(teamId).get();
        if (teamDoc.exists) return { id: teamDoc.id, data: teamDoc.data() };
    }
    return null;
}

// Create invite (subcollection based)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });
        const token = authHeader.replace("Bearer ", "");
        const decoded = await adminAuth.verifyIdToken(token);
        const { email, role, message } = await req.json();
        if (!email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        const team = await getTeamForUser(decoded.uid);
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
        const teamData: TeamDoc = (team.data as TeamDoc) || {};
        const acting = (Array.isArray(teamData.members) ? teamData.members : []).find((m: TeamMember) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
        if (!acting || !['owner', 'admin'].includes(acting.role || '')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

        // Duplicate guard: check existing members subcollection & invites
        const invitesCol = adminDb.collection('teams').doc(team.id).collection('invites');
        const existingInv = await invitesCol.where('emailLower', '==', email.toLowerCase()).limit(1).get();
        if (existingInv.size) return NextResponse.json({ error: 'Already invited' }, { status: 409 });
        if ((teamData.memberIds || []).some((m) => m === email)) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

        const inviteId = crypto.randomUUID();
        const tokenPlain = crypto.randomBytes(24).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
        const inviteDoc = {
            email, emailLower: email.toLowerCase(), role: role === 'owner' ? 'member' : role,
            status: 'pending', invitedBy: decoded.uid, invitedAt: new Date(), message: message || null,
            tokenHash, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7d
        };
        await invitesCol.doc(inviteId).set(inviteDoc);
        // Create global index doc for O(1) acceptance lookup
        adminDb.collection('invites_index').doc(inviteId).set({ teamId: team.id, emailLower: email.toLowerCase(), status: 'pending', createdAt: new Date() }).catch(() => { });
        try { await adminDb.collection('emailQueue').add({ to: email, template: 'team_invite_v2', createdAt: new Date(), payload: { inviter: decoded.uid, teamId: team.id, role: inviteDoc.role, token: tokenPlain } }); } catch { }
        return NextResponse.json({ success: true, inviteId, token: tokenPlain });
    } catch (e: unknown) {
        console.error('Team invite error', e); const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Internal error'; return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// Accept invite
export async function PUT(req: NextRequest): Promise<NextResponse> {
    try {
        const { inviteId, token } = await req.json();
        if (!inviteId || !token) return NextResponse.json({ error: 'Missing inviteId/token' }, { status: 400 });
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(authHeader.replace('Bearer ', ''));
        const uid = decoded.uid;
        const team = await getTeamForUser(uid); // If already on a team block (single-team assumption)
        if (team) return NextResponse.json({ error: 'Already on a team' }, { status: 400 });

        // Optimized lookup: global mapping doc (invites_index/{inviteId}) -> { teamId }
        // Write path populated lazily (if absent we still fall back to scan for backward compatibility)
        let found: { teamId: string; inviteDoc: FirebaseFirestore.DocumentSnapshot } | null = null;
        const indexDoc = await adminDb.collection('invites_index').doc(inviteId).get();
        if (indexDoc.exists) {
            const indexData = indexDoc.data() as { teamId?: string } | undefined;
            const teamId = indexData?.teamId;
            if (teamId) {
                const inv = await adminDb.collection('teams').doc(teamId).collection('invites').doc(inviteId).get();
                if (inv.exists) {
                    found = { teamId, inviteDoc: inv };
                }
            }
        }
        if (!found) {
            // Backfill index via scan (one-time cost) then proceed
            const allTeams = await adminDb.collection('teams').get();
            for (const t of allTeams.docs) {
                const inv = await adminDb.collection('teams').doc(t.id).collection('invites').doc(inviteId).get();
                if (inv.exists) {
                    found = { teamId: t.id, inviteDoc: inv };
                    // Fire and forget index creation
                    adminDb.collection('invites_index').doc(inviteId).set({ teamId: t.id, createdAt: new Date() }).catch(() => { });
                    break;
                }
            }
        }
        if (!found) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
        const invData = found.inviteDoc.data() as InviteData;
        if (invData.status !== 'pending') return NextResponse.json({ error: 'Invite not pending' }, { status: 400 });
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        if (tokenHash !== invData.tokenHash) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
        if (invData.emailLower !== (decoded.email || '').toLowerCase()) return NextResponse.json({ error: 'Email mismatch' }, { status: 403 });
        if ((invData.expiresAt?.toDate && invData.expiresAt.toDate().getTime() < Date.now())) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

        // Append member to team doc arrays & memberIds; also create subcollection member doc
        const teamRef = adminDb.collection('teams').doc(found.teamId);
        await adminDb.runTransaction(async tx => {
            const tSnap = await tx.get(teamRef);
            if (!tSnap.exists) throw new Error('Team missing');
            const tData = tSnap.data() as TeamDoc;
            if ((tData.memberIds || []).includes(uid)) throw new Error('Already member');
            const updatedMembers: TeamMember[] = [...(tData.members || []), { userId: uid, email: invData.email, role: invData.role, status: 'active', joinedAt: new Date(), lastActive: new Date() }];
            const updatedMemberIds = [...(tData.memberIds || []), uid];
            tx.update(teamRef, { members: updatedMembers, memberIds: updatedMemberIds });
            tx.update(teamRef.collection('invites').doc(inviteId), { status: 'accepted', acceptedAt: new Date() });
            tx.set(teamRef.collection('members').doc(uid), {
                userId: uid,
                email: invData.email,
                role: invData.role,
                status: 'active',
                joinedAt: new Date(),
                lastActive: new Date(),
                source: 'invite_accept'
            });
            // Mark index doc accepted (helps future cleanup jobs)
            tx.set(adminDb.collection('invites_index').doc(inviteId), { teamId: found!.teamId, status: 'accepted', updatedAt: new Date() }, { merge: true });
        });
        return NextResponse.json({ success: true, teamId: found.teamId });
    } catch (e: unknown) {
        console.error('Accept invite error', e); const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Internal error'; return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// Test-only helper: expire an invite early (development / test env). Not exposed in production.
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Disabled' }, { status: 403 });
    try {
        const { inviteId, teamId, minutesAgo } = await req.json();
        if (!inviteId || !teamId) return NextResponse.json({ error: 'Missing inviteId/teamId' }, { status: 400 });
        const delta = minutesAgo ? Number(minutesAgo) : 60;
        const expiresAt = new Date(Date.now() - delta * 60 * 1000);
        await adminDb.collection('teams').doc(teamId).collection('invites').doc(inviteId).update({ expiresAt });
        return NextResponse.json({ success: true, expiredAt: expiresAt.toISOString() });
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Internal error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// List pending invites: owner/admin sees all; invitee (email match) sees their pending invites across teams
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(authHeader.replace('Bearer ', ''));
        const emailLower = (decoded.email || '').toLowerCase();
        if (!emailLower) return NextResponse.json({ invites: [] });
        // Owner/admin path: identify their team then list its invites
        const team = await getTeamForUser(decoded.uid);
        const results: unknown[] = [];
        if (team) {
            const teamData = (team.data as TeamDoc) || {};
            const acting = (Array.isArray(teamData.members) ? teamData.members : []).find((m: TeamMember) => m.userId === decoded.uid || m.id === decoded.uid || m.email === decoded.email);
            if (acting && ['owner', 'admin'].includes(acting.role || '')) {
                const invSnap = await adminDb.collection('teams').doc(team.id).collection('invites').where('status', '==', 'pending').get();
                invSnap.forEach(d => results.push({ id: d.id, teamId: team.id, ...d.data() }));
                return NextResponse.json({ invites: results, scope: 'team' });
            }
        }
        // Invitee self-scope: brute force scan teams for invites (bounded dataset). Optimize later with index.
        const allTeams = await adminDb.collection('teams').get();
        for (const t of allTeams.docs) {
            const invs = await adminDb.collection('teams').doc(t.id).collection('invites').where('emailLower', '==', emailLower).where('status', '==', 'pending').get();
            invs.forEach(d => results.push({ id: d.id, teamId: t.id, role: d.data().role, invitedAt: d.data().invitedAt, expiresAt: d.data().expiresAt }));
        }
        return NextResponse.json({ invites: results, scope: 'self' });
    } catch (e: unknown) {
        console.error('List invites error', e); const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Internal error'; return NextResponse.json({ error: msg }, { status: 500 });
    }
}
