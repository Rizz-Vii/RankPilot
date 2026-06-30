// Marketing Automation AI Utility. Content generation calls the real-AI route
// (/api/marketing/generate, gemini-2.5-flash); the remaining helpers stay deterministic until
// converted to the same async path.
import { auth, db } from "@/lib/firebase";
import { stripForbiddenDerivedFields } from "@/lib/guards/forbidden-derived-fields";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

function periodFromDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Simple hash for deterministic pseudo-random based on input
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
function randFrom(seed: number) {
  return (min: number, max: number) => {
    const v = (Math.sin(seed++) + 1) / 2;
    return Math.round(min + v * (max - min));
  };
}

/** Calls the real-AI marketing generation route with the signed-in user's token. */
async function callGenerate(
  payload: Record<string, unknown>
): Promise<{ text?: string; items?: string[] } | null> {
  try {
    const token = await auth.currentUser?.getIdToken?.();
    const res = await fetch("/api/marketing/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as { text?: string; items?: string[] };
  } catch {
    return null;
  }
}

export async function importLeads(
  raw: string,
  userId: string,
  teamId?: string
) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const results: { name: string; id: string }[] = [];
  for (const line of lines.slice(0, 500)) {
    const seed = hash(line);
    const r = randFrom(seed);
    const score = r(10, 95);
    const docRef = await addDoc(collection(db, "leads"), {
      userId,
      teamId,
      name: line,
      score,
      status: score > 70 ? "qualified" : "new",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    results.push({ name: line, id: docRef.id });
  }
  // synthetic summary campaign entry feeds KPI aggregation
  if (results.length) {
    const campaign = {
      userId,
      teamId,
      name: `Lead Import (${results.length})`,
      channel: "lead-gen",
      impressions: 0,
      clicks: 0,
      leads: results.length,
      spend: 0,
      revenue: 0,
      period: periodFromDate(),
    };
    stripForbiddenDerivedFields(campaign);
    await addDoc(collection(db, "marketingCampaigns"), campaign);
  }
  return { count: results.length, results };
}

export async function scoreLeads(userId: string, teamId?: string) {
  const q = query(
    collection(db, "leads"),
    where(teamId ? "teamId" : "userId", "==", teamId || userId),
    limit(400)
  );
  const snap = await getDocs(q);
  const updates: string[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const seed = hash(d.id + (data.name || ""));
    const rand = randFrom(seed);
    const score = rand(15, 98);
    await updateDoc(doc(db, "leads", d.id), {
      score,
      status: score > 75 ? "qualified" : "nurture",
      updatedAt: Timestamp.now(),
    });
    updates.push(d.id);
  }
  if (updates.length) {
    const campaign = {
      userId,
      teamId,
      name: `Lead Score (${updates.length})`,
      channel: "lead-gen",
      impressions: 0,
      clicks: 0,
      leads: 0,
      spend: 0,
      revenue: 0,
      period: periodFromDate(),
    };
    stripForbiddenDerivedFields(campaign);
    await addDoc(collection(db, "marketingCampaigns"), campaign);
  }
  return { updated: updates.length };
}

export async function routeLeads(userId: string, teamId?: string) {
  const q = query(
    collection(db, "leads"),
    where(teamId ? "teamId" : "userId", "==", teamId || userId),
    limit(300)
  );
  const snap = await getDocs(q);
  let routed = 0;
  for (const d of snap.docs) {
    await updateDoc(doc(db, "leads", d.id), {
      routedTo: "sales_team_default",
      routedAt: Timestamp.now(),
    });
    routed++;
  }
  if (routed) {
    const campaign = {
      userId,
      teamId,
      name: `Lead Route (${routed})`,
      channel: "lead-gen",
      impressions: 0,
      clicks: 0,
      leads: 0,
      spend: 0,
      revenue: 0,
      period: periodFromDate(),
    };
    stripForbiddenDerivedFields(campaign);
    await addDoc(collection(db, "marketingCampaigns"), campaign);
  }
  return { routed };
}

export interface ScheduledPostInput {
  content: string;
  channel: string;
  scheduledAt?: Date;
  userId: string;
  teamId?: string;
}
export async function schedulePost(input: ScheduledPostInput) {
  const { content, channel, userId, teamId } = input;
  const scheduledAt = input.scheduledAt || new Date();
  const seed = hash(content + channel + scheduledAt.toISOString());
  const r = randFrom(seed);
  const impressions = r(500, 5000);
  const clicks = r(30, Math.max(40, Math.round(impressions * 0.2)));
  const leads = r(2, Math.max(3, Math.round(clicks * 0.15)));
  await addDoc(collection(db, "socialPosts"), {
    userId,
    teamId,
    content,
    channel,
    scheduledAt: Timestamp.fromDate(scheduledAt),
    metrics: { impressions, clicks, leads },
    createdAt: Timestamp.now(),
  });
  // Also feed marketingCampaigns for unified metrics
  // Store only raw counters; omit derived ratios & avoid heuristic revenue to prevent data pollution
  const campaign = {
    userId,
    teamId,
    name: content.slice(0, 40) || "Post",
    channel,
    impressions,
    clicks,
    leads,
    spend: 0,
    revenue: 0,
    period: periodFromDate(scheduledAt),
    __provenance: "synthetic",
  };
  stripForbiddenDerivedFields(campaign);
  await addDoc(collection(db, "marketingCampaigns"), campaign);
  return { impressions, clicks, leads };
}

export async function optimizeCopy(original: string, channel: string) {
  const gen = await callGenerate({ task: "optimize", original, channel });
  return {
    variant: gen?.text?.trim() || original,
    // We no longer fabricate a "score lift" — real measurement would need A/B data.
    scoreLift: null as number | null,
  };
}

export async function generateContentAsset(
  type: string,
  topic: string,
  userId: string,
  teamId?: string
) {
  // Real AI content (gemini-2.5-flash) via the server route; falls back honestly if unavailable.
  const gen = await callGenerate({ task: "content", type, topic });
  const isLive = !!gen?.text;
  const body =
    gen?.text?.trim() ||
    `Draft ${type} about "${topic}". AI generation was unavailable — please try again.`;
  const docRef = await addDoc(collection(db, "contentAssets"), {
    userId,
    teamId,
    type,
    topic,
    body,
    provenance: isLive ? "live" : "synthetic",
    createdAt: Timestamp.now(),
  });
  const campaign = {
    userId,
    teamId,
    name: `${type}:${topic.slice(0, 40)}`,
    channel: "content",
    impressions: 0,
    clicks: 0,
    leads: 0,
    spend: 0,
    revenue: 0,
    period: periodFromDate(),
    __provenance: "synthetic",
  };
  stripForbiddenDerivedFields(campaign);
  await addDoc(collection(db, "marketingCampaigns"), campaign);
  return { id: docRef.id, body };
}

export async function generateVariants(base: string, count = 3) {
  const gen = await callGenerate({ task: "variants", base, count });
  return gen?.items?.length ? gen.items : [base];
}

export async function adjustTone(content: string, tone: string) {
  const gen = await callGenerate({ task: "tone", content, tone });
  return gen?.text?.trim() || content;
}

export interface EmailCampaignInput {
  subject: string;
  audience: number;
  userId: string;
  teamId?: string;
  sendAt?: Date;
}
export async function createEmailCampaign(input: EmailCampaignInput) {
  const sendAt = input.sendAt || new Date();
  const seed = hash(input.subject + sendAt.toISOString());
  const r = randFrom(seed);
  const impressions = input.audience;
  const clicks = r(
    Math.round(impressions * 0.05),
    Math.round(impressions * 0.25)
  );
  const leads = r(Math.round(clicks * 0.05), Math.round(clicks * 0.25));
  await addDoc(collection(db, "emailCampaigns"), {
    ...input,
    sendAt: Timestamp.fromDate(sendAt),
    metrics: { impressions, clicks, leads },
    createdAt: Timestamp.now(),
  });
  const campaign = {
    userId: input.userId,
    teamId: input.teamId,
    name: input.subject.slice(0, 60),
    channel: "email",
    impressions,
    clicks,
    leads,
    spend: 0,
    revenue: 0,
    period: periodFromDate(sendAt),
    __provenance: "synthetic",
  };
  stripForbiddenDerivedFields(campaign);
  await addDoc(collection(db, "marketingCampaigns"), campaign);
  return { impressions, clicks, leads };
}

export async function suggestSendTime(userId: string, teamId?: string) {
  const q = query(
    collection(db, "emailCampaigns"),
    where(teamId ? "teamId" : "userId", "==", teamId || userId),
    limit(120)
  );
  const snap = await getDocs(q);
  if (!snap.size)
    return { hour: 10, rationale: "Default heuristic (no history)" };
  const hourCounts: Record<number, { sent: number; leads: number }> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const ts = data.sendAt?.toDate?.();
    const hour = ts ? ts.getHours() : 10;
    const leads = data.metrics?.leads || 0;
    hourCounts[hour] ||= { sent: 0, leads: 0 };
    hourCounts[hour].sent++;
    hourCounts[hour].leads += leads;
  });
  const best = Object.entries(hourCounts)
    .map(([h, v]) => ({
      hour: Number(h),
      score: v.leads / Math.max(1, v.sent),
    }))
    .sort((a, b) => b.score - a.score)[0];
  return {
    hour: best.hour,
    rationale: "Historical average leads per send highest at this hour",
  };
}

export async function generateSubjectVariants(base: string) {
  const gen = await callGenerate({ task: "subjects", base });
  return gen?.items?.length ? gen.items : [base];
}

// --- Platform Account Integration Stubs (extend with OAuth tokens in production) ---
export interface SocialAccount {
  platform: "instagram" | "facebook" | "x" | "linkedin";
  handle: string;
  connected: boolean;
  meta?: unknown;
}
export async function connectSocialAccount(
  platform: SocialAccount["platform"],
  handle: string,
  userId: string,
  teamId?: string
) {
  // Placeholder: store lightweight connection marker
  await addDoc(collection(db, "socialAccounts"), {
    userId,
    teamId,
    platform,
    handle,
    connected: true,
    createdAt: Timestamp.now(),
  });
  return { platform, handle, connected: true };
}
export interface SocialAccountDoc extends SocialAccount {
  id: string;
  userId: string;
  teamId?: string;
  createdAt?: unknown;
}
export async function listSocialAccounts(
  userId: string,
  teamId?: string
): Promise<SocialAccountDoc[]> {
  const q = query(
    collection(db, "socialAccounts"),
    where(teamId ? "teamId" : "userId", "==", teamId || userId),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Omit<SocialAccountDoc, "id">;
    return { id: d.id, ...data };
  });
}

// Trend analysis placeholder – deterministic hashtags/angles
export async function fetchPlatformTrends(platform: SocialAccount["platform"]) {
  const base = [
    "growth",
    "ai",
    "strategy",
    "insights",
    "performance",
    "engagement",
  ];
  const seed = hash(platform);
  const r = randFrom(seed);
  const picks = Array.from({ length: 5 }).map(
    (_, i) =>
      "#" + base[(seed + i) % base.length] + (r(0, 9) > 7 ? r(1, 99) : "")
  );
  return { platform, hashtags: picks, updatedAt: new Date() };
}
