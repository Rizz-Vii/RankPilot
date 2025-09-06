/**
 * Server-side Usage Quota Manager (Firebase Admin)
 * Mirrors client UsageQuotaManager API using firebase-admin Firestore.
 */
import { adminDb } from '@/lib/firebase-admin';
import type { PlanType } from './stripe';
import { FREE_PLAN, STRIPE_PLANS } from './stripe';

export interface UsageQuota {
    userId: string;
    plan: PlanType | 'free';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    usage: {
        auditsPerformed: number;
        keywordSearches: number;
        reportsGenerated: number;
        competitorAnalyses: number;
    };
    limits: {
        auditsPerMonth: number;
        keywords: number;
        reports: number;
        competitors: number;
    };
    lastUpdated: Date;
}

export interface UsageCheck {
    allowed: boolean;
    reason?: string;
    remainingQuota: number;
    remaining: number;
    limit: number;
    resetDate: Date;
}

export type UsageType = 'audit' | 'keyword' | 'report' | 'competitor';

const QUOTAS = 'quotas';

export class AdminUsageQuotaManager {
    private col() {
        return adminDb.collection(QUOTAS);
    }

    private doc(userId: string) {
        return this.col().doc(userId);
    }

    async getUserQuota(userId: string): Promise<UsageQuota | null> {
        try {
            const snap = await this.doc(userId).get();
            if (!snap.exists) {
                return await this.initializeUserQuota(userId, 'free');
            }
            const data = snap.data() as {
                plan: UsageQuota['plan'];
                currentPeriodStart?: { toDate?: () => Date };
                currentPeriodEnd?: { toDate?: () => Date };
                usage?: Partial<UsageQuota['usage']>;
                limits: UsageQuota['limits'];
                lastUpdated?: { toDate?: () => Date };
            };
            const usageNormalized: UsageQuota['usage'] = {
                auditsPerformed: data.usage?.auditsPerformed ?? 0,
                keywordSearches: data.usage?.keywordSearches ?? 0,
                reportsGenerated: data.usage?.reportsGenerated ?? 0,
                competitorAnalyses: data.usage?.competitorAnalyses ?? 0,
            };
            return {
                userId,
                plan: data.plan,
                currentPeriodStart: data.currentPeriodStart?.toDate?.() ?? new Date(),
                currentPeriodEnd: data.currentPeriodEnd?.toDate?.() ?? new Date(),
                usage: usageNormalized,
                limits: data.limits,
                lastUpdated: data.lastUpdated?.toDate?.() ?? new Date(),
            };
        } catch {
            // Server path should not throw to callers; return null to allow graceful degradation
            return null;
        }
    }

    async initializeUserQuota(userId: string, plan: PlanType | 'free'): Promise<UsageQuota> {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const limits = plan === 'free' ? FREE_PLAN.limits : STRIPE_PLANS[plan].limits;
        const quota: UsageQuota = {
            userId,
            plan,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            usage: { auditsPerformed: 0, keywordSearches: 0, reportsGenerated: 0, competitorAnalyses: 0 },
            limits: {
                auditsPerMonth: limits.auditsPerMonth,
                keywords: limits.keywords,
                reports: limits.reports,
                competitors: limits.competitors,
            },
            lastUpdated: now,
        };
        await this.doc(userId).set({
            ...quota,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            lastUpdated: now,
        }, { merge: true });
        return quota;
    }

    private pickFields(usageType: UsageType): { usageField: string; limitField: keyof UsageQuota['limits'] } {
        switch (usageType) {
            case 'audit': return { usageField: 'auditsPerformed', limitField: 'auditsPerMonth' };
            case 'keyword': return { usageField: 'keywordSearches', limitField: 'keywords' };
            case 'report': return { usageField: 'reportsGenerated', limitField: 'reports' };
            case 'competitor': return { usageField: 'competitorAnalyses', limitField: 'competitors' };
            default: return { usageField: 'auditsPerformed', limitField: 'auditsPerMonth' };
        }
    }

    async checkUsageLimit(userId: string, usageType: UsageType): Promise<UsageCheck> {
        const quota = await this.getUserQuota(userId);
        if (!quota) {
            return { allowed: false, reason: 'Unable to verify usage quota', remaining: 0, limit: 0, remainingQuota: 0, resetDate: new Date() };
        }
        const now = new Date();
        if (now > quota.currentPeriodEnd) {
            await this.resetMonthlyQuota(userId);
            return this.checkUsageLimit(userId, usageType);
        }
        const { usageField, limitField } = this.pickFields(usageType);
        const currentUsage = quota.usage[usageField as keyof UsageQuota['usage']] as number;
        const limit = quota.limits[limitField];
        if (limit === -1) return { allowed: true, remaining: -1, limit: -1, remainingQuota: -1, resetDate: quota.currentPeriodEnd };
        if (currentUsage >= limit) {
            return { allowed: false, reason: `${usageType} limit exceeded (${currentUsage}/${limit})`, remaining: 0, limit, remainingQuota: 0, resetDate: quota.currentPeriodEnd };
        }
        const remaining = limit - currentUsage;
        return { allowed: true, remaining, limit, remainingQuota: remaining, resetDate: quota.currentPeriodEnd };
    }

    async incrementUsage(userId: string, usageType: UsageType, amount = 1): Promise<boolean> {
        // Use a transaction to avoid race conditions under concurrency
        try {
            await adminDb.runTransaction(async (tx) => {
                const ref = this.doc(userId);
                const snap = await tx.get(ref);
                let quota: UsageQuota | null = snap.exists ? (snap.data() as UsageQuota) : null;
                if (!quota) {
                    quota = await this.initializeUserQuota(userId, 'free');
                }
                const { usageField } = this.pickFields(usageType);
                const current = quota.usage?.[usageField as keyof UsageQuota['usage']] ?? 0;
                const updated = { ...quota.usage, [usageField]: current + amount };
                tx.set(ref, { usage: updated, lastUpdated: new Date() }, { merge: true });
            });
            return true;
        } catch {
            return false;
        }
    }

    async resetMonthlyQuota(userId: string): Promise<void> {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        await this.doc(userId).set({
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            usage: { auditsPerformed: 0, keywordSearches: 0, reportsGenerated: 0, competitorAnalyses: 0 },
            lastUpdated: now,
        }, { merge: true });
    }

    async updateUserPlan(userId: string, newPlan: PlanType | 'free'): Promise<void> {
        const limits = newPlan === 'free' ? FREE_PLAN.limits : STRIPE_PLANS[newPlan].limits;
        await this.doc(userId).set({
            plan: newPlan,
            limits: {
                auditsPerMonth: limits.auditsPerMonth,
                keywords: limits.keywords,
                reports: limits.reports,
                competitors: limits.competitors,
            },
            lastUpdated: new Date(),
        }, { merge: true });
    }

    async getUsageStats(userId: string) {
        const q = await this.getUserQuota(userId);
        if (!q) return null;
        const pct = (used: number, limit: number) => limit === -1 ? 0 : (used / (limit || 1)) * 100;
        return {
            plan: q.plan,
            periodStart: q.currentPeriodStart,
            periodEnd: q.currentPeriodEnd,
            usage: q.usage,
            limits: q.limits,
            percentageUsed: {
                audits: pct(q.usage.auditsPerformed, q.limits.auditsPerMonth),
                keywords: pct(q.usage.keywordSearches, q.limits.keywords),
                reports: pct(q.usage.reportsGenerated, q.limits.reports),
                competitors: pct(q.usage.competitorAnalyses, q.limits.competitors),
            },
            daysUntilReset: Math.ceil((q.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        };
    }

    async isFeatureAvailable(userId: string, feature: string): Promise<boolean> {
        const q = await this.getUserQuota(userId);
        if (!q) return false;
        const featureMatrix: Record<string, string[]> = {
            free: ['basic-audit', 'basic-keywords'],
            starter: ['basic-audit', 'basic-keywords', 'full-audit', 'competitor-analysis', 'reports'],
            agency: ['basic-audit', 'basic-keywords', 'full-audit', 'competitor-analysis', 'reports', 'white-label', 'api-access'],
            enterprise: ['basic-audit', 'basic-keywords', 'full-audit', 'competitor-analysis', 'reports', 'white-label', 'api-access'],
        };
        const list = featureMatrix[q.plan] || featureMatrix.free;
        return list.includes(feature);
    }

    async enforceUsageLimit(userId: string, usageType: UsageType): Promise<{ success: boolean; error?: string }> {
        const check = await this.checkUsageLimit(userId, usageType);
        if (!check.allowed) return { success: false, error: check.reason || 'Usage limit exceeded' };
        const ok = await this.incrementUsage(userId, usageType, 1);
        if (!ok) return { success: false, error: 'Failed to track usage' };
        return { success: true };
    }
}

export const adminUsageQuotaManager = new AdminUsageQuotaManager();
