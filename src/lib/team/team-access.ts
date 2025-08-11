// TEAM-01: Team access & effective tier resolution utilities
import { adminDb } from "@/lib/firebase-admin";
import { computeEffectiveTier, SubscriptionTier } from "@/lib/access-control";
import type { TeamContext, TeamMemberRecord, TeamRecord, TeamPlanTier } from "./team-types";

export async function getUserTeamContext(userId: string): Promise<TeamContext> {
    try {
        const teamsSnap = await adminDb.collection("teams").where("memberIds", "array-contains", userId).limit(1).get();
        if (teamsSnap.empty) {
            return { team: null, membership: null, effectiveTier: undefined };
        }
        const teamDoc = teamsSnap.docs[0];
        const team = ({ id: teamDoc.id, ...teamDoc.data() }) as TeamRecord;
        let membership: TeamMemberRecord | null = null;
        try {
            const memberSnap = await adminDb.collection("teams").doc(teamDoc.id).collection("members").doc(userId).get();
            if (memberSnap.exists) {
                membership = ({ id: memberSnap.id, ...memberSnap.data() }) as TeamMemberRecord;
            }
        } catch { /* ignore */ }
        const effectiveTier = team.planTier as TeamPlanTier | undefined;
        return { team, membership, effectiveTier };
    } catch {
        return { team: null, membership: null, effectiveTier: undefined };
    }
}

export function resolveEffectiveTier(userTier: SubscriptionTier, teamTier?: TeamPlanTier): SubscriptionTier {
    return computeEffectiveTier(userTier, teamTier as SubscriptionTier | undefined);
}

export function isTeamOwner(team: TeamRecord | null, userId: string): boolean {
    return !!team && team.ownerId === userId;
}

export function isTeamAdmin(member?: TeamMemberRecord | null): boolean {
    return !!member && (member.role === "admin" || member.role === "owner");
}
