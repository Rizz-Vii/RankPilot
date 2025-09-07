// TEAM-01: Core team domain types (shared)
export type TeamPlanTier = "free" | "starter" | "agency" | "enterprise";
export type TeamRole = "owner" | "admin" | "member" | "viewer";

export interface TeamRecord {
  id: string;
  name: string;
  ownerId: string;
  memberIds?: string[]; // Transitional legacy list
  planTier?: TeamPlanTier;
  createdAt?: unknown;
  updatedAt?: unknown;
  stripeCustomerId?: string;
  active?: boolean;
}

export interface TeamMemberRecord {
  id: string;
  userId?: string;
  email: string;
  role: TeamRole;
  status: "active" | "pending" | "inactive";
  joinedAt?: unknown;
  lastActive?: unknown;
  displayName?: string;
  avatarUrl?: string;
}

export interface TeamInviteRecord {
  id: string;
  email: string;
  invitedBy: string;
  role: TeamRole;
  createdAt?: unknown;
  expiresAt?: unknown;
  status?: "pending" | "accepted" | "expired" | "revoked";
}

export interface TeamContext {
  team: TeamRecord | null;
  membership?: TeamMemberRecord | null;
  effectiveTier: TeamPlanTier | undefined;
}
