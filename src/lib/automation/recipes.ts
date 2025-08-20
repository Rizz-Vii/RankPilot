// Automation Recipes data model & execution utilities
// Minimal scaffolding for Automation Phase – deterministic friendly & Firebase aware
import { Timestamp, addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AutomationActionType =
    | 'runNeuroSEOAnalysis'
    | 'sendDigestEmail'
    | 'generateContentRewrite'
    | 'salesRefreshMetrics'
    | 'salesForecastSnapshot'
    | 'salesPipelineDigest'
    | 'financeRevenueSnapshot'
    | 'financeInvoiceAgingDigest';

export interface AutomationRecipe {
    id?: string; // Firestore id
    userId: string;
    teamId?: string;
    name: string;
    active: boolean;
    schedule: {
        // Simple interval-based schedule for now (minutes) – future: cron expression
        intervalMinutes?: number; // e.g. 1440 for daily
        cron?: string;
        atHourUTC?: number; // when using daily semantics
    };
    actions: AutomationActionType[]; // enabled action types
    actionConfigs?: Record<string, unknown>; // keyed by action type
    config?: Record<string, unknown>; // action-specific future config
    lastRun?: Date | null;
    nextRun?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AutomationRunResult {
    recipeId: string;
    startedAt: Date;
    finishedAt: Date;
    actions: { type: AutomationActionType; status: 'ok' | 'skipped' | 'error'; message?: string }[];
}

// Lightweight run record (matches automationRuns collection shape)
export interface AutomationRunLog extends AutomationRunResult {
    id?: string;
    status: 'ok' | 'partial' | 'error';
    createdAt: Date;
}

// Parse very small subset of cron: "m h * * *" or aliases @daily / @hourly
// Only supports numeric minute (0-59 or *) and hour (0-23 or *). Day/month/dow must be '*'.
function computeNextFromCron(now: Date, expr: string): Date | null {
    expr = expr.trim();
    if (expr === '@daily') return computeNextFromCron(now, '0 0 * * *');
    if (expr === '@hourly') return computeNextFromCron(now, '0 * * * *');
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) return null;
    const [minRaw, hourRaw, day, month, dow] = parts;
    if (day !== '*' || month !== '*' || dow !== '*') return null; // unsupported granularity
    const minutes: number[] = minRaw === '*' ? Array.from({ length: 60 }, (_, idx) => idx) : [Number(minRaw)];
    const hours: number[] = hourRaw === '*' ? Array.from({ length: 24 }, (_, idx) => idx) : [Number(hourRaw)];
    if (minutes.some(m => isNaN(m) || m < 0 || m > 59)) return null;
    if (hours.some(h => isNaN(h) || h < 0 || h > 23)) return null;
    // Search next occurrence within next 48h window
    for (let offsetMin = 1; offsetMin <= 60 * 48; offsetMin++) {
        const t = new Date(now.getTime() + offsetMin * 60_000);
        if (hours.includes(t.getUTCHours()) && minutes.includes(t.getUTCMinutes())) {
            return t;
        }
    }
    return null;
}

// Compute next run time given now and recipe schedule
export function computeNextRun(now: Date, recipe: AutomationRecipe): Date | null {
    const { schedule } = recipe;
    if (schedule.cron) {
        const cronNext = computeNextFromCron(now, schedule.cron);
        if (cronNext) return cronNext;
    }
    if (schedule.intervalMinutes && schedule.intervalMinutes > 0) {
        return new Date(now.getTime() + schedule.intervalMinutes * 60_000);
    }
    // Daily at specific hour
    if (schedule.atHourUTC !== undefined) {
        const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), schedule.atHourUTC, 0, 0));
        if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
        return next;
    }
    return null;
}

// Create recipe
export async function createAutomationRecipe(input: Omit<AutomationRecipe, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>) {
    const now = new Date();
    // Basic validation: cannot specify both cron and intervalMinutes
    if (input.schedule?.cron && input.schedule?.intervalMinutes) {
        throw new Error('Specify either cron or intervalMinutes, not both');
    }
    const base: AutomationRecipe = {
        ...input,
        active: input.active ?? true,
        createdAt: now,
        updatedAt: now,
        lastRun: null,
        nextRun: null,
    };
    base.nextRun = computeNextRun(now, base);
    const ref = await addDoc(collection(db, 'automationRecipes'), serializeRecipe(base));
    return { id: ref.id, ...base };
}

// Update recipe (partial)
export async function updateAutomationRecipe(id: string, patch: Partial<AutomationRecipe>) {
    const ref = doc(db, 'automationRecipes', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Recipe not found');
    const existing = deserializeRecipe({ id: snap.id, ...(snap.data() as Record<string, unknown>) });
    const merged: AutomationRecipe = { ...existing, ...patch, updatedAt: new Date() };
    if (merged.schedule?.cron && merged.schedule?.intervalMinutes) {
        throw new Error('Specify either cron or intervalMinutes, not both');
    }
    if (patch.schedule || patch.active !== undefined) {
        merged.nextRun = computeNextRun(new Date(), merged);
    }
    await updateDoc(ref, serializeRecipe(merged));
    return merged;
}

// List recipes for user/team
export async function listAutomationRecipes(userId: string, teamId?: string) {
    const q = query(
        collection(db, 'automationRecipes'),
        where(teamId ? 'teamId' : 'userId', '==', teamId || userId),
        limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => deserializeRecipe({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

// Execute due recipes (simple client/server callable – not scheduled automatically yet)
// runDueAutomationRecipes moved to server-only file execute.ts to keep client bundle light.

// List recent run logs for a recipe
export async function listRecentAutomationRuns(recipeId: string, max = 5): Promise<AutomationRunLog[]> {
    const q = query(collection(db, 'automationRuns'), where('recipeId', '==', recipeId), orderBy('startedAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data() as Record<string, any>;
        return {
            id: d.id,
            recipeId,
            startedAt: data.startedAt?.toDate?.() || new Date(),
            finishedAt: data.finishedAt?.toDate?.() || new Date(),
            actions: Array.isArray(data.actions) ? data.actions : [],
            status: (data.status === 'ok' || data.status === 'partial' || data.status === 'error') ? data.status : 'ok',
            createdAt: data.createdAt?.toDate?.() || new Date(),
        } as AutomationRunLog;
    });
}

// Count pending email queue items for a recipe
export async function countPendingEmails(recipeId: string): Promise<number> {
    const q = query(collection(db, 'emailQueue'), where('recipeId', '==', recipeId), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.length;
}

// Serialization helpers (Firestore stores timestamps)
function serializeRecipe(r: AutomationRecipe) {
    return {
        userId: r.userId,
        teamId: r.teamId || null,
        name: r.name,
        active: r.active,
        schedule: r.schedule,
        actions: r.actions,
        actionConfigs: r.actionConfigs || {},
        config: r.config || {},
        lastRun: r.lastRun ? Timestamp.fromDate(r.lastRun) : null,
        nextRun: r.nextRun ? Timestamp.fromDate(r.nextRun) : null,
        createdAt: Timestamp.fromDate(r.createdAt),
        updatedAt: Timestamp.fromDate(r.updatedAt),
    };
}

function deserializeRecipe(data: Record<string, any>): AutomationRecipe {
    return {
        id: data.id as string | undefined,
        userId: String(data.userId),
        teamId: data.teamId ? String(data.teamId) : undefined,
        name: String(data.name || 'Untitled'),
        active: Boolean(data.active),
        schedule: (typeof data.schedule === 'object' && data.schedule) ? data.schedule : {},
        actions: Array.isArray(data.actions) ? data.actions.filter(a => typeof a === 'string') as AutomationActionType[] : [],
        actionConfigs: (typeof data.actionConfigs === 'object' && data.actionConfigs) ? data.actionConfigs : {},
        config: (typeof data.config === 'object' && data.config) ? data.config : {},
        lastRun: data.lastRun?.toDate?.() || null,
        nextRun: data.nextRun?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
}

// Simple hook-friendly helper to create a default recipe object pre-populated
export function defaultRecipeTemplate(userId: string, teamId?: string): Omit<AutomationRecipe, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'> {
    return {
        userId,
        teamId,
        name: 'Untitled Recipe',
        active: true,
        schedule: { intervalMinutes: 1440 },
        actions: ['runNeuroSEOAnalysis'],
        config: {},
    };
}
