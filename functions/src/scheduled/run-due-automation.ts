import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

// Lightweight scheduler for Automation Recipes
// Scans for due recipes and executes supported actions server-side

type AutomationActionType =
    | "runNeuroSEOAnalysis"
    | "sendDigestEmail"
    | "generateContentRewrite"
    | "salesRefreshMetrics"
    | "salesForecastSnapshot"
    | "salesPipelineDigest"
    | "financeRevenueSnapshot"
    | "financeInvoiceAgingDigest"
    | "financeAccountingSeedSampleJournals"
    | "financeAccountingGeneratePnL"
    | "financeAccountingGenerateBalanceSheet"
    | "financeAccountingReconcile"
    // Test-only action to validate backoff in emulator/unit tests
    | "testForceError";

interface ScheduleSpec {
    intervalMinutes?: number;
    cron?: string;
    atHourUTC?: number;
}

interface AutomationRecipe {
    id: string;
    userId: string;
    teamId?: string | null;
    name: string;
    active: boolean;
    schedule: ScheduleSpec;
    actions: AutomationActionType[];
    actionConfigs?: Record<string, unknown>;
    lastRun?: Date | null;
    nextRun?: Date | null;
    lockedAt?: Date | null;
    running?: boolean;
    failureCount?: number;
}

function computeNextFromCron(now: Date, expr: string): Date | null {
    expr = expr.trim();
    if (expr === "@daily") return computeNextFromCron(now, "0 0 * * *");
    if (expr === "@hourly") return computeNextFromCron(now, "0 * * * *");
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) return null;
    const [minRaw, hourRaw, day, month, dow] = parts;
    if (day !== "*" || month !== "*" || dow !== "*") return null;
    const minutes: number[] = minRaw === "*" ? Array.from({ length: 60 }, (_, i) => i) : [Number(minRaw)];
    const hours: number[] = hourRaw === "*" ? Array.from({ length: 24 }, (_, i) => i) : [Number(hourRaw)];
    if (minutes.some((m) => isNaN(m) || m < 0 || m > 59)) return null;
    if (hours.some((h) => isNaN(h) || h < 0 || h > 23)) return null;
    for (let offsetMin = 1; offsetMin <= 60 * 48; offsetMin++) {
        const t = new Date(now.getTime() + offsetMin * 60_000);
        if (hours.includes(t.getUTCHours()) && minutes.includes(t.getUTCMinutes())) return t;
    }
    return null;
}

function computeNextRun(now: Date, recipe: AutomationRecipe): Date | null {
    const { schedule } = recipe;
    if (schedule?.cron) {
        const next = computeNextFromCron(now, schedule.cron);
        if (next) return next;
    }
    if (schedule?.intervalMinutes && schedule.intervalMinutes > 0) {
        return new Date(now.getTime() + schedule.intervalMinutes * 60_000);
    }
    if (schedule && schedule.atHourUTC !== undefined) {
        const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), schedule.atHourUTC!, 0, 0));
        if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
        return next;
    }
    return null;
}

export async function runDueAutomationTick(injectedDb?: ReturnType<typeof getFirestore>, injectedNow?: Date) {
    if (!getApps().length) initializeApp();
    const db = injectedDb || getFirestore();
    const now = injectedNow || new Date();
    const nowTs = Timestamp.fromDate(now);

    // Query for due recipes. Avoid composite index by filtering active locally.
    const snap = await db
        .collection("automationRecipes")
        .where("nextRun", "<=", now)
        .orderBy("nextRun", "asc")
        .limit(50)
        .get()
        .catch((e) => {
            logger.error("runDueAutomationScheduler query error", e);
            throw e;
        });

    if (snap.empty) {
        logger.info("runDueAutomationScheduler: no due recipes");
        return { processed: 0 };
    }

    let processed = 0;
    for (const docSnap of snap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        const recipe: AutomationRecipe = {
            id: docSnap.id,
            userId: String(data.userId),
            teamId: (data.teamId as string | undefined) || null,
            name: String(data.name),
            active: Boolean(data.active),
            schedule: (data.schedule as ScheduleSpec) || {},
            actions: (data.actions as AutomationActionType[]) || [],
            actionConfigs: (data.actionConfigs as Record<string, unknown>) || {},
            lastRun: (data.lastRun as { toDate?: () => Date } | undefined)?.toDate?.() || null,
            nextRun: (data.nextRun as { toDate?: () => Date } | undefined)?.toDate?.() || null,
            lockedAt: (data.lockedAt as { toDate?: () => Date } | undefined)?.toDate?.() || null,
            running: Boolean(data.running),
            failureCount: typeof data.failureCount === 'number' ? (data.failureCount as number) : 0,
        };

        if (!recipe.active) continue;

        // Acquire lock atomically to prevent double processing
        const lockOk = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(docSnap.ref);
            const d = fresh.data() as Record<string, unknown>;
            const running = Boolean(d?.running);
            const lockedAt = (d?.lockedAt as { toDate?: () => Date } | undefined)?.toDate?.();
            const lockExpired = !lockedAt || now.getTime() - lockedAt.getTime() > 10 * 60_000; // 10 minutes
            if (running && !lockExpired) return false;
            tx.update(docSnap.ref, { running: true, lockedAt: FieldValue.serverTimestamp() });
            return true;
        });
        if (!lockOk) continue;

        try {
            processed++;
            const actionsResults: { type: AutomationActionType; status: "ok" | "skipped" | "error"; message?: string }[] = [];

            for (const action of recipe.actions) {
                const cfg = recipe.actionConfigs?.[action] as Record<string, unknown> | undefined;
                const str = (v: unknown, fb: string) => (typeof v === 'string' ? v : fb);
                const strArr = (v: unknown, fb: string[]) => (Array.isArray(v) ? v.map((x) => String(x)) : fb);
                try {
                    // Test-only forced error to validate backoff behavior in emulator tests
                    if (action === "testForceError" && process.env.SCHEDULER_TEST_MODE === '1') {
                        throw new Error("Forced error (test mode)");
                    }
                    if (action === "sendDigestEmail") {
                        const to: string = str(cfg?.["to"], "digest@example.com");
                        const subject = str(cfg?.["subject"], "NeuroSEO Digest");
                        const body = `Automated digest at ${new Date().toISOString()}\nURLs: ${strArr(cfg?.["urls"], ["https://example.com"]).join(", ")}\nKeywords: ${strArr(cfg?.["keywords"], ["example"]).join(", ")}`;
                        await db.collection("emailQueue").add({ userId: recipe.userId, teamId: recipe.teamId || null, recipeId: recipe.id, to, subject, body, status: "pending", createdAt: now });
                        actionsResults.push({ type: action, status: "ok", message: "Digest enqueued" });
                    } else if (action === "salesRefreshMetrics") {
                        const range: "30d" | "90d" | "ytd" = (str(cfg?.["range"], "30d") as "30d" | "90d" | "ytd");
                const dealsSnap = await db.collection("salesDeals").where(recipe.teamId ? "teamId" : "userId", "==", recipe.teamId || recipe.userId).get();
                const deals = dealsSnap.docs.map((d) => d.data() as Record<string, unknown>);
                if (!deals.length) actionsResults.push({ type: action, status: "skipped", message: "No deals" });
                else {
                            const pipeline = deals.filter((d) => (d as Record<string, unknown>).status !== "ClosedLost").reduce((a: number, b: Record<string, unknown>) => a + (Number(b.amount) || 0), 0);
                            const closedWon = deals.filter((d) => (d as Record<string, unknown>).status === "ClosedWon").length;
                            await db.collection("salesMetricsSnapshots").add({ userId: recipe.userId, teamId: recipe.teamId || null, range, pipeline, closedWon, totalDeals: deals.length, createdAt: now });
                            actionsResults.push({ type: action, status: "ok", message: "Metrics snapshot stored" });
                        }
                    } else if (action === "salesForecastSnapshot") {
                        const dealsSnap = await db.collection("salesDeals").where(recipe.teamId ? "teamId" : "userId", "==", recipe.teamId || recipe.userId).get();
                        const deals = dealsSnap.docs.map((d) => d.data() as Record<string, unknown>);
                        const pipeline = deals.filter((d) => (d as Record<string, unknown>).status !== "ClosedLost").reduce((a: number, b: Record<string, unknown>) => a + (Number(b.amount) || 0), 0);
                        const period = new Date().toISOString().slice(0, 10);
                        await db.collection("salesForecastSnapshots").add({ userId: recipe.userId, teamId: recipe.teamId || null, period, forecast: Math.round(pipeline * 0.8), actual: null, createdAt: now });
                        actionsResults.push({ type: action, status: "ok", message: "Forecast snapshot added" });
                    } else if (action === "salesPipelineDigest") {
                        const to: string = str(cfg?.["to"], "sales-digest@example.com");
                        const range: "30d" | "90d" | "ytd" = (str(cfg?.["range"], "30d") as "30d" | "90d" | "ytd");
                        const dealsSnap = await db.collection("salesDeals").where(recipe.teamId ? "teamId" : "userId", "==", recipe.teamId || recipe.userId).get();
                        const deals = dealsSnap.docs.map((d) => d.data() as Record<string, unknown>);
                        if (!deals.length) actionsResults.push({ type: action, status: "skipped", message: "No deals" });
                        else {
                            const pipeline = deals.filter((d) => (d as Record<string, unknown>).status !== "ClosedLost").reduce((a: number, b: Record<string, unknown>) => a + (Number(b.amount) || 0), 0);
                            const closedWon = deals.filter((d) => (d as Record<string, unknown>).status === "ClosedWon").length;
                            const winRate = deals.length ? (closedWon / deals.length) * 100 : 0;
                            const body = `Sales Pipeline Digest (range=${range})\nPipeline: ${pipeline}\nClosed Won: ${closedWon}\nWin Rate: ${winRate.toFixed(1)}%`;
                            await db.collection("emailQueue").add({ userId: recipe.userId, teamId: recipe.teamId || null, recipeId: recipe.id, to, subject: "Sales Pipeline Digest", body, status: "pending", createdAt: now });
                            actionsResults.push({ type: action, status: "ok", message: "Pipeline digest enqueued" });
                        }
                    } else if (action === "financeRevenueSnapshot") {
                        const invSnap = await db.collection("financeInvoices").where(recipe.teamId ? "teamId" : "userId", "==", recipe.teamId || recipe.userId).get();
                        const invoices = invSnap.docs.map((d) => d.data() as Record<string, unknown>);
                        if (!invoices.length) actionsResults.push({ type: action, status: "skipped", message: "No invoices" });
                        else {
                            const periods = Array.from(new Set(invoices.map((i) => (i as Record<string, unknown>).period))).sort();
                            const last = periods.at(-1)!;
                            const current = invoices.filter((i) => (i as Record<string, unknown>).period === last);
                            const paid = current.filter((i) => (i as Record<string, unknown>).status === "paid");
                            const mrr = paid.reduce((s: number, i: Record<string, unknown>) => s + (Number(i.amount) || 0), 0);
                            const onTime = paid.filter((i) => {
                                const paidAt = (i as { paidAt?: { toDate?: () => Date } }).paidAt?.toDate?.();
                                const due = (i as { dueAt?: { toDate?: () => Date } }).dueAt?.toDate?.();
                                return paidAt && due && paidAt.getTime() <= due.getTime();
                            });
                            const onTimePct = paid.length ? (onTime.length / paid.length) * 100 : 0;
                            const outstanding = current.filter((i) => (i as Record<string, unknown>).status !== "paid").length;
                            await db.collection("financeRevenueSnapshots").add({ userId: recipe.userId, teamId: recipe.teamId || null, period: last, mrr, onTimePct: Number(onTimePct.toFixed(1)), outstanding, createdAt: now });
                            actionsResults.push({ type: action, status: "ok", message: "Revenue snapshot stored" });
                        }
                    } else if (action === "financeInvoiceAgingDigest") {
                        const to: string = str(cfg?.to, "finance-aging@example.com");
                        const invSnap = await db.collection("financeInvoices").where(recipe.teamId ? "teamId" : "userId", "==", recipe.teamId || recipe.userId).get();
                        const invoices = invSnap.docs.map((d) => d.data() as Record<string, unknown>);
                        const nowMs = Date.now();
                        const buckets: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
                        invoices
                            .filter((i) => (i as Record<string, unknown>).status !== "paid")
                            .forEach((i) => {
                                const due = (i as { dueAt?: { toDate?: () => Date } }).dueAt?.toDate?.()?.getTime?.();
                                if (!due) return;
                                const days = Math.floor((nowMs - due) / 86_400_000);
                                if (days <= 30) buckets["0-30"]++;
                                else if (days <= 60) buckets["31-60"]++;
                                else if (days <= 90) buckets["61-90"]++;
                                else buckets["90+"]++;
                            });
                        const body = `Invoice Aging Digest\n0-30: ${buckets["0-30"]}\n31-60: ${buckets["31-60"]}\n61-90: ${buckets["61-90"]}\n90+: ${buckets["90+"]}`;
                        await db.collection("emailQueue").add({ userId: recipe.userId, teamId: recipe.teamId || null, recipeId: recipe.id, to, subject: "Invoice Aging Digest", body, status: "pending", createdAt: now });
                        await db.collection("financeInvoiceAgingSummaries").add({ userId: recipe.userId, teamId: recipe.teamId || null, buckets, createdAt: now });
                        actionsResults.push({ type: action, status: "ok", message: "Invoice aging digest enqueued" });
                    } else {
                        // Actions requiring app-only libs are skipped here; run-now API can handle them on demand
                        actionsResults.push({ type: action, status: "skipped", message: "Unsupported in scheduler" });
                    }
                } catch (e) {
                    actionsResults.push({ type: action, status: "error", message: (e as { message?: string })?.message || "Action failed" });
                }
            }

            const hadError = actionsResults.some((a) => a.status === "error");
            let nextRun: Date | null = null;
            let failureCount = recipe.failureCount || 0;
            if (hadError) {
                // Exponential backoff with cap at 60 minutes
                failureCount = failureCount + 1;
                const backoffMinutes = Math.min(60, Math.pow(2, Math.max(0, failureCount - 1)));
                nextRun = new Date(now.getTime() + backoffMinutes * 60_000);
                // Log failure document for visibility
                try {
                    await db.collection("schedulerFailures").add({
                        recipeId: recipe.id,
                        userId: recipe.userId,
                        teamId: recipe.teamId || null,
                        actions: actionsResults,
                        failureCount,
                        occurredAt: now,
                    });
                } catch { /* best-effort */ }
            } else {
                nextRun = computeNextRun(now, recipe);
                failureCount = 0; // reset on success
            }

            // Update recipe state and write run log
            await docSnap.ref.update({
                lastRun: now,
                nextRun: nextRun ? nextRun : null,
                running: false,
                lockedAt: FieldValue.delete(),
                updatedAt: now,
                failureCount,
            });
            const status = hadError
                ? "partial"
                : actionsResults.every((a) => a.status === "skipped")
                    ? "ok"
                    : "ok";
            await db.collection("automationRuns").add({
                recipeId: recipe.id,
                userId: recipe.userId,
                teamId: recipe.teamId || null,
                startedAt: now,
                finishedAt: new Date(),
                actions: actionsResults,
                status,
                createdAt: now,
            });
        } catch (e) {
            logger.error("runDueAutomationScheduler recipe error", { id: recipe.id, error: (e as { message?: string })?.message || String(e) });
            try {
                await docSnap.ref.update({ running: false, lockedAt: FieldValue.delete(), updatedAt: nowTs });
            } catch { }
        }
    }

    logger.info("runDueAutomationScheduler complete", { processed });
    return { processed };
}

export const runDueAutomationScheduler = onSchedule(
    {
        schedule: "every 15 minutes",
        timeZone: "Etc/UTC",
        region: "australia-southeast2",
    },
    async () => { await runDueAutomationTick(); }
);
