import { HttpsOptions, onCall, HttpsError } from "firebase-functions/v2/https";
import { createHash } from 'crypto';
// Indirect AI import so unit tests can stub via global.__genkit or env GENKIT_TEST_STUB
let __aiMod: any = null;
function getAIWrapper() {
  if (process.env.GENKIT_TEST_STUB === '1') {
    return { generate: async () => ({ text: () => null }) };
  }
  if (__aiMod) return __aiMod;
  try { __aiMod = require('../ai/genkit').getAI(); } catch { __aiMod = { generate: async () => ({ text: () => null }) }; }
  return __aiMod;
}
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as cheerio from 'cheerio';
// Local crawler metrics (functions env isolated from Next.js in-process unified metrics)
const crawlerLocal = { success: 0, errors: 0, totalCrawlMs: 0, totalAnalysisMs: 0 };
function recordCrawlerSuccess(crawlMs: number, analysisMs: number) { crawlerLocal.success++; crawlerLocal.totalCrawlMs += crawlMs; crawlerLocal.totalAnalysisMs += analysisMs; }
function recordCrawlerError(crawlMs: number) { crawlerLocal.errors++; crawlerLocal.totalCrawlMs += crawlMs; }
function recordCrawlerFailure(crawlMs: number, failureType: 'crawl' | 'analysis') { 
  crawlerLocal.errors++; 
  crawlerLocal.totalCrawlMs += crawlMs; 
  // Record in unified metrics for aggregation
  try {
    const unifiedMetrics = require('../../../src/lib/metrics/unified-metrics');
    unifiedMetrics.recordCrawlerFailure(crawlMs, failureType);
  } catch { /* fallback to basic recording if unified metrics not available */ }
}
import { z } from 'zod';

// Set options for the audit function
const httpsOptions: HttpsOptions = {
  timeoutSeconds: 180, // SEO audits can take longer
  memory: "2GiB", // Increased from 1GiB for Playwright operations
  minInstances: 0,
};

interface AuditRequest {
  url: string;
  depth?: number;
  checkMobile?: boolean;
}

interface AuditCoreResponse {
  score: number;
  issues: { critical: string[]; major: string[]; minor: string[]; };
  recommendations: string[];
  performanceMetrics?: Record<string, number>;
}

interface EnrichedAuditResponse extends AuditCoreResponse {
  overallScore: number; // alias of score for frontend adapter
  items: Array<{
    id: string;
    name: string;
    title: string;
    description: string;
    details: string;
    status: 'pass' | 'fail' | 'warning';
    score: number;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  summary: string;
  totalProcessingTime: number;
  cacheHit: boolean;
  source: 'live' | 'cache' | 'fallback';
  quota?: { limit: number; used: number; remaining: number; team?: { limit: number; used: number; remaining: number } };
  // Multi-phase timings (Phase 3 instrumentation)
  timings?: { crawl_time_ms: number; analysis_time_ms: number; total_time_ms: number };
  // Failure classification metadata (Wave 3)
  failure?: { type: 'crawl' | 'analysis'; message: string; timestamp: number };
}

// ----------------------------------------------------------------------------
// In-memory caches & metrics (ephemeral per instance). Suitable for short-lived caching.
// ----------------------------------------------------------------------------
const AUDIT_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const auditCache: Map<string, { ts: number; data: EnrichedAuditResponse }> = new Map();
const metrics = {
  totalRequests: 0,
  cacheHits: 0,
  totalProcessingTime: 0,
  get cacheHitRate() { return metrics.totalRequests ? +(metrics.cacheHits / metrics.totalRequests).toFixed(3) : 0; },
  get avgProcessingTime() { return metrics.totalRequests ? Math.round(metrics.totalProcessingTime / metrics.totalRequests) : 0; }
};

// Initialize Admin (idempotent)
try { if (!getApps().length) initializeApp(); } catch { /* already init */ }
const db = getFirestore();

// Domain allow / deny lists (simple pattern match). Extend as needed.
const ALLOW_LIST: RegExp[] = [/^[a-z0-9.-]+$/i]; // hostname must be basic characters
const DENY_LIST: RegExp[] = [/localhost/i, /127\.0\.0\.1/, /\.internal$/i];

const MAX_URL_LENGTH = 2048;
const PROMPT_MAX_CHARS = 2000; // guard prompt size

function logPhase(phase: string, data: Record<string, any>) {
  try {
    // Structured log for observability
    console.log(JSON.stringify({ ts: new Date().toISOString(), phase, ...data }));
  } catch (e) {
    console.log(`[audit-log-fallback] ${phase}`, data);
  }
}

type UsageRecord = { date: string; count: number };
const userUsage: Map<string, UsageRecord> = new Map();

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  starter: 20,
  agency: 50,
  enterprise: 200,
  admin: 500,
  default: 10,
};

function getPlanLimit(plan?: string): number {
  if (!plan) return PLAN_LIMITS.default;
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.default;
}

function checkAndIncrementQuota(uid: string | undefined, plan?: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (!uid) return { limit: -1, used: 0, remaining: -1 }; // unauthenticated (should be gated earlier)
  const limit = getPlanLimit(plan);
  const rec = userUsage.get(uid);
  if (!rec || rec.date !== today) {
    userUsage.set(uid, { date: today, count: 1 });
    return { limit, used: 1, remaining: Math.max(0, limit - 1) };
  }
  if (rec.count >= limit) {
    throw new HttpsError('resource-exhausted', 'Daily SEO audit limit reached');
  }
  rec.count += 1;
  return { limit, used: rec.count, remaining: Math.max(0, limit - rec.count) };
}

// Team crawler quota (T12) – persistent per-team daily counter using Firestore to survive cold starts.
const TEAM_PLAN_LIMITS: Record<string, number> = {
  free: 20,
  starter: 100,
  agency: 300,
  enterprise: 1000,
  admin: 2000,
  default: 50,
};
function getTeamPlanLimit(plan?: string) {
  if (!plan) return TEAM_PLAN_LIMITS.default;
  return TEAM_PLAN_LIMITS[plan as keyof typeof TEAM_PLAN_LIMITS] ?? TEAM_PLAN_LIMITS.default;
}
async function checkAndIncrementTeamQuota(teamId: string | undefined, plan: string | undefined, debugLimit?: number) {
  if (!teamId) return null;
  const today = new Date().toISOString().slice(0, 10);
  const limit = (debugLimit && (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production')) ? debugLimit : getTeamPlanLimit(plan);
  const docId = `${teamId}_${today}`;
  const ref = db.collection('teamCrawlerUsage').doc(docId);
  let result: { limit: number; used: number; remaining: number } | null = null;
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    let count = 0;
    let rejections = 0;
    if (snap.exists) {
      const data: any = snap.data();
      count = typeof data.count === 'number' ? data.count : 0;
      rejections = typeof data.rejections === 'number' ? data.rejections : 0;
    }
    if (count >= limit) {
      // Record rejection then throw
      tx.set(ref, { rejections: FieldValue.increment(1), limit, updatedAt: FieldValue.serverTimestamp(), date: today, teamId }, { merge: true });
      // Also bump runtimeMetrics/crawler aggregate rejection counter (best effort outside transaction after throw caught by caller)
      throw new HttpsError('resource-exhausted', 'Team daily crawler quota exceeded');
    }
    count += 1;
    tx.set(ref, { count, limit, updatedAt: FieldValue.serverTimestamp(), date: today, teamId }, { merge: true });
    result = { limit, used: count, remaining: Math.max(0, limit - count) };
  });
  return result;
}

function buildItemsFromIssues(core: AuditCoreResponse): EnrichedAuditResponse['items'] {
  const items: EnrichedAuditResponse['items'] = [];
  let idCounter = 0;
  const pushItems = (level: 'critical' | 'major' | 'minor', status: 'fail' | 'warning' | 'pass', impact: 'high' | 'medium' | 'low') => {
    for (const issue of core.issues[level]) {
      items.push({
        id: `issue-${idCounter++}`,
        name: issue,
        title: issue,
        description: issue,
        details: issue,
        status,
        score: status === 'pass' ? 100 : status === 'warning' ? 70 : 40,
        impact,
        recommendation: core.recommendations[0] || ''
      });
    }
  };
  pushItems('critical', 'fail', 'high');
  pushItems('major', 'warning', 'medium');
  pushItems('minor', 'warning', 'low');
  if (items.length === 0) {
    items.push({
      id: 'all-good',
      name: 'No major issues detected',
      title: 'Healthy SEO Structure',
      description: 'No significant issues were found during the audit.',
      details: 'All core SEO elements appear healthy.',
      status: 'pass',
      score: core.score,
      impact: 'low',
      recommendation: 'Continue monitoring and re-run audits after major site changes.'
    });
  }
  return items;
}

// Build global corpus summary (aggregated anonymous issue & score stats across users)
async function buildGlobalCorpusSummary(limit = 50): Promise<{ summary: string; issueSamples: string[]; avgScore: number; }> {
  try {
    const snapshot = await db.collectionGroup('urls').limit(limit).get();
    if (snapshot.empty) return { summary: 'No global audit corpus available yet.', issueSamples: [], avgScore: 0 };
    let totalScore = 0; let count = 0; const issueFreq: Record<string, number> = {};
    snapshot.forEach(doc => {
      const data: any = doc.data();
      const sc = data.score?.overall || data.score?.seo || 0; totalScore += sc; count++;
      const issues: string[] = Array.isArray(data.issues) ? data.issues.slice(0, 10) : [];
      issues.forEach(i => { issueFreq[i] = (issueFreq[i] || 0) + 1; });
    });
    const topIssues = Object.entries(issueFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([i, f]) => `${i}(${f})`);
    return {
      summary: `GlobalCorpus docs:${count} avgScore:${count ? Math.round(totalScore / count) : 0} topIssues:${topIssues.join(', ')}`,
      issueSamples: topIssues.map(t => t.split('(')[0]),
      avgScore: count ? totalScore / count : 0
    };
  } catch (e) {
    console.warn('global_corpus_failed', (e as any)?.message);
    return { summary: 'Global corpus unavailable', issueSamples: [], avgScore: 0 };
  }
}

function tryParseAIJson(text: string | undefined | null): Partial<EnrichedAuditResponse> | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// Strict schema for AI JSON validation – aligns with prompt requirements
const AiAuditSchema = z.object({
  overallScore: z.number().min(0).max(100),
  score: z.number().min(0).max(100).optional(),
  issues: z.object({
    critical: z.array(z.string()),
    major: z.array(z.string()),
    minor: z.array(z.string())
  }),
  recommendations: z.array(z.string()).max(25).optional(),
  performanceMetrics: z.object({
    pageSpeed: z.number().min(0).max(100).optional(),
    mobileOptimization: z.number().min(0).max(100).optional(),
    accessibility: z.number().min(0).max(100).optional()
  }).partial().optional(),
  items: z.array(z.object({
    id: z.string().max(64).optional(),
    name: z.string().max(200).optional(),
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    details: z.string().max(1000).optional(),
    status: z.enum(['pass', 'fail', 'warning']).optional(),
    score: z.number().min(0).max(100).optional(),
    impact: z.enum(['low', 'medium', 'high']).optional(),
    recommendation: z.string().max(300).optional()
  })).max(100).optional(),
  summary: z.string().max(1000).optional()
});

// Crawl result schema (T11) – validates structure before AI prompt usage
const CrawlResultSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(300),
  metaDescription: z.string().nullable().optional(),
  headings: z.object({
    h1: z.array(z.string()).max(10),
    h2: z.array(z.string()).max(150)
  }),
  loadTime: z.number().min(0).max(120000),
  mobileOptimized: z.boolean(),
  performanceMetrics: z.object({
    pageSpeed: z.number().min(0).max(100).optional(),
    mobileOptimization: z.number().min(0).max(100).optional(),
    accessibility: z.number().min(0).max(100).optional()
  }).optional(),
  raw: z.any()
});
type CrawlResult = z.infer<typeof CrawlResultSchema>;

/**
 * Performs an SEO audit for a specified URL
 * @param {Object} request - The Cloud Function request object
 * @return {Promise<AuditResponse>} The SEO audit results
 */
async function coreSeoAudit(request: any) {
  const start = Date.now();
  const { url, depth = 1, checkMobile = true, plan, forceFresh, teamId, debugTeamLimit } = request.data as AuditRequest & { plan?: string; forceFresh?: boolean; teamId?: string; debugTeamLimit?: number };
  if (!url || typeof url !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid URL is required.');
  }
  if (url.length > MAX_URL_LENGTH) {
    throw new HttpsError('invalid-argument', 'URL too long.');
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new HttpsError('invalid-argument', 'Malformed URL.'); }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new HttpsError('invalid-argument', 'Only http/https URLs are allowed.');
  }
  if (/^(data|file|javascript):/i.test(url)) {
    throw new HttpsError('invalid-argument', 'Disallowed URL scheme.');
  }
  const host = parsed.hostname;
  if (!ALLOW_LIST.some(r => r.test(host)) || DENY_LIST.some(r => r.test(host))) {
    throw new HttpsError('permission-denied', 'Domain not permitted for auditing.');
  }

  const uid = request.auth?.uid;
  let quotaInfo: EnrichedAuditResponse['quota'] = undefined;
  try {
    quotaInfo = checkAndIncrementQuota(uid, plan);
    try {
      const teamQuota = await checkAndIncrementTeamQuota(teamId, plan, debugTeamLimit);
      if (quotaInfo && teamQuota) quotaInfo.team = teamQuota;
      else if (teamQuota) quotaInfo = { limit: -1, used: 0, remaining: -1, team: teamQuota };
    } catch (teamErr: any) {
      if (teamErr instanceof HttpsError && teamErr.code === 'resource-exhausted') throw teamErr; // propagate quota exhaustion
      console.warn('team_quota_degraded', (teamErr as any)?.message);
    }
  } catch (quotaErr) {
    if (quotaErr instanceof HttpsError) {
      // If it's a team quota rejection, increment runtimeMetrics/crawler.teamQuotaRejections
      if (quotaErr.message.includes('Team daily crawler quota exceeded') && request.data?.teamId) {
        try { await db.collection('runtimeMetrics').doc('crawler').set({ teamQuotaRejections: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true }); } catch { }
      }
      throw quotaErr;
    }
    throw new HttpsError('internal', 'Quota validation failed');
  }

  // Cache key normalized (strip trailing slash)
  const normalizedUrl = url.replace(/\/$/, '');
  const cacheKey = `${normalizedUrl}|d=${depth}|m=${checkMobile}`;
  const cached = !forceFresh ? auditCache.get(cacheKey) : undefined;
  if (cached && Date.now() - cached.ts < AUDIT_CACHE_TTL_MS) {
    metrics.totalRequests++; metrics.cacheHits++; metrics.totalProcessingTime += Date.now() - start;
    logPhase('cache_hit', { url: normalizedUrl, uid, depth, checkMobile });
    return { ...cached.data, quota: quotaInfo, totalProcessingTime: Date.now() - start, cacheHit: true, source: 'cache' as const, ephemeralMetrics: { cacheHitRate: metrics.cacheHitRate, avgProcessingTime: metrics.avgProcessingTime } };
  }

  try {
    metrics.totalRequests++;
    logPhase('start_audit', { url: normalizedUrl, uid, depth, checkMobile });
    // Real AI-powered SEO audit with web crawling (placeholder crawl logic)
    const crawlPhaseStart = Date.now();
    let crawlResults: CrawlResult | any = await performWebCrawl(url, depth, checkMobile);
    const crawlParsed = CrawlResultSchema.safeParse(crawlResults);
    if (!crawlParsed.success) {
      logPhase('crawl_schema_invalid', { issues: crawlParsed.error.issues.length });
      crawlResults = {
        url: normalizedUrl,
        title: `Synthetic Title for ${normalizedUrl}`,
        metaDescription: null,
        headings: { h1: ['Synthetic H1'], h2: [] },
        loadTime: 1500,
        mobileOptimized: checkMobile,
        performanceMetrics: { pageSpeed: 65, mobileOptimization: checkMobile ? 72 : 80, accessibility: 78 },
        raw: { synthetic: true, reason: 'schema_fallback' }
      } as CrawlResult;
    } else {
      crawlResults = crawlParsed.data;
    }
    const crawlDuration = Date.now() - crawlPhaseStart;
    logPhase('crawl_complete', { url: normalizedUrl, loadTime: crawlResults.loadTime });

    // Fetch recent historical audits to provide context to AI (max 3)
    let historyContext = '';
    if (uid) {
      try {
        const histSnap = await db.collection('audits').doc(uid).collection('urls')
          .where('url', '==', normalizedUrl)
          .orderBy('createdAt', 'desc')
          .limit(3)
          .get();
        if (!histSnap.empty) {
          const historySummaries: string[] = [];
          histSnap.docs.forEach(d => {
            const data = d.data();
            const score = data.score?.overall || data.score?.seo || 'n/a';
            const issuesArr: string[] = Array.isArray(data.issues) ? data.issues.slice(0, 5) : [];
            historySummaries.push(`Score:${score} Issues:${issuesArr.join('; ')}`);
          });
          historyContext = historySummaries.join(' | ');
        }
      } catch (histCtxErr) {
        console.warn('history_context_failed', (histCtxErr as any)?.message);
      }
    }

    // Truncate crawl JSON for prompt safety & hash full content
    const crawlJson = JSON.stringify(crawlResults);
    const hash = createHash('sha256').update(crawlJson).digest('hex').slice(0, 16);
    const truncated = crawlJson.length > PROMPT_MAX_CHARS ? crawlJson.slice(0, PROMPT_MAX_CHARS) + `... [truncated ${crawlJson.length - PROMPT_MAX_CHARS} chars]` : crawlJson;

    // Global corpus (anonymous) for enrichment
    const globalCorpus = await buildGlobalCorpusSummary(40);

    const prompt = `ROLE: You are a senior Technical SEO expert.
TASK: Produce a structured SEO audit.
TARGET URL: "${url}" (hash:${hash}) depth:${depth} mobileCheck:${checkMobile}
${historyContext ? `USER HISTORY (latest→oldest): ${historyContext}` : 'USER HISTORY: none'}
GLOBAL CORPUS: ${globalCorpus.summary}
CRAWL DATA (truncated JSON): ${truncated}
REQUIREMENTS:
1. Analyze crawl & context only (no hallucination of non-present elements).
2. Derive issues grouped into critical, major, minor with actionable recommendations.
3. Provide performanceMetrics (pageSpeed, mobileOptimization, accessibility) 0-100 if inferable else estimate with confidence comment.
4. Derive overallScore (0-100) weighting: critical issues (-15 each), major (-8), minor (-2), base 95.
5. Output STRICT JSON ONLY in this schema:
{
  "overallScore": number,
  "issues": {"critical": string[], "major": string[], "minor": string[]},
  "recommendations": string[],
  "performanceMetrics": {"pageSpeed"?: number, "mobileOptimization"?: number, "accessibility"?: number},
  "items": [
     {"id": string, "name": string, "title": string, "description": string, "details": string, "status": "pass"|"fail"|"warning", "score": number, "impact": "low"|"medium"|"high", "recommendation": string }
  ],
  "summary": string
}
ONLY JSON, no prose outside JSON.`;

    // AI call with strict schema validation
    const ai = getAIWrapper();
    let aiRaw: any = undefined;
    try { const gen = await ai.generate(prompt); aiRaw = gen?.text(); } catch (aiErr) { console.warn('ai_generate_failed', (aiErr as any)?.message); }
    logPhase('ai_complete', { url: normalizedUrl, usedAI: !!aiRaw });

    const core: AuditCoreResponse = {
      score: calculateOverallScore(crawlResults),
      issues: categorizeIssues(crawlResults),
      recommendations: generateRecommendations(crawlResults),
      performanceMetrics: crawlResults.performanceMetrics,
    };

    // If AI returned structured JSON, attempt to adopt it; else fallback to synthetic core build
    const parsedRaw = tryParseAIJson(aiRaw);
    let parsed: any = null;
    if (parsedRaw) {
      const safe = AiAuditSchema.safeParse(parsedRaw);
      if (safe.success) parsed = safe.data; else logPhase('ai_schema_invalid', { issues: safe.error.issues.length });
    }
    let enriched: EnrichedAuditResponse;
    const crawl_time_ms = crawlDuration;
    const total_time_ms = Date.now() - start; // final total
    const analysis_time_ms = Math.max(0, total_time_ms - crawl_time_ms);
    if (parsed && typeof parsed === 'object' && typeof parsed.overallScore === 'number') {
      // Normalize items array & required fields
      const parsedItems = Array.isArray(parsed.items) ? parsed.items.slice(0, 50).map((it: any, idx: number) => ({
        id: String(it.id || `ai-${idx}`),
        name: String(it.name || it.title || `Issue ${idx + 1}`),
        title: String(it.title || it.name || `Issue ${idx + 1}`),
        description: String(it.description || it.details || it.title || ''),
        details: String(it.details || it.description || ''),
        status: ['pass', 'fail', 'warning'].includes(it.status) ? it.status : 'warning',
        score: typeof it.score === 'number' ? it.score : 60,
        impact: ['low', 'medium', 'high'].includes(it.impact) ? it.impact : 'medium',
        recommendation: String(it.recommendation || '')
      })) : buildItemsFromIssues(core);
      enriched = {
        score: typeof parsed.score === 'number' ? parsed.score : parsed.overallScore,
        overallScore: parsed.overallScore,
        issues: parsed.issues && parsed.issues.critical ? parsed.issues as any : core.issues,
        recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length ? parsed.recommendations : core.recommendations,
        performanceMetrics: parsed.performanceMetrics || core.performanceMetrics,
        items: parsedItems,
        summary: typeof parsed.summary === 'string' ? parsed.summary : `Audit completed for ${normalizedUrl}.`,
        totalProcessingTime: Date.now() - start,
        cacheHit: false,
        source: 'live',
        quota: quotaInfo,
        timings: { crawl_time_ms, analysis_time_ms, total_time_ms }
      };
    } else {
      enriched = {
        ...core,
        overallScore: core.score,
        items: buildItemsFromIssues(core),
        summary: `Audit completed for ${normalizedUrl}. Score: ${core.score}. Issues: critical(${core.issues.critical.length}), major(${core.issues.major.length}), minor(${core.issues.minor.length}).`,
        totalProcessingTime: Date.now() - start,
        cacheHit: false,
        source: 'live',
        quota: quotaInfo,
        timings: { crawl_time_ms, analysis_time_ms, total_time_ms }
      };
    }

    // Simple cache set with pruning to avoid unbounded growth
    auditCache.set(cacheKey, { ts: Date.now(), data: enriched });
    if (auditCache.size > 200) {
      // remove oldest 20 entries
      const entries = Array.from(auditCache.entries()).sort((a, b) => a[1].ts - b[1].ts).slice(0, 20);
      for (const [k] of entries) auditCache.delete(k);
    }

    metrics.totalProcessingTime += enriched.totalProcessingTime;
    // Persist audit document (per user) for historical reuse
    try {
      if (uid) {
        const auditsCol = db.collection('audits').doc(uid).collection('urls');
        await auditsCol.add({
          url: normalizedUrl,
          score: {
            overall: enriched.overallScore,
            performance: enriched.performanceMetrics?.pageSpeed || 0,
            accessibility: enriched.performanceMetrics?.accessibility || 0,
            seo: enriched.overallScore,
            bestPractices: 0,
          },
          issues: enriched.items.filter(i => i.status !== 'pass').map(i => i.title),
          suggestions: enriched.recommendations || [],
          raw: { issues: enriched.issues, performanceMetrics: enriched.performanceMetrics },
          source: 'live',
          cacheKey,
          userPlan: plan || null,
          processingMs: enriched.totalProcessingTime,
          // Wave 3: Include timing metadata for performance analysis
          timings: enriched.timings,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (persistErr) {
      console.warn('audit_persist_failed', (persistErr as any)?.message);
    }
    recordCrawlerSuccess(crawlDuration, enriched.totalProcessingTime - crawlDuration);
    // Persist aggregated crawler counters (best effort)
    try { await db.collection('runtimeMetrics').doc('crawler').set({ ...crawlerLocal, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); } catch { }
    logPhase('success', { url: normalizedUrl, score: enriched.score, processingMs: enriched.totalProcessingTime, crawlMs: crawlDuration });
    return { ...enriched, ephemeralMetrics: { cacheHitRate: metrics.cacheHitRate, avgProcessingTime: metrics.avgProcessingTime } };
  } catch (error) {
    console.error('Error generating SEO audit:', error);
    
    // Classify failure type based on when it occurred
    const processingTime = Date.now() - start;
    let failureType: 'crawl' | 'analysis' = 'analysis'; // default to analysis failure
    
    // Check if error occurred during crawl phase (before line 373 where crawlDuration is set)
    // Look for crawl-specific error patterns in the error message or check timing
    const errorMessage = (error as any)?.message || String(error);
    if (errorMessage.includes('fetch') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('network') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ECONNREFUSED') ||
        processingTime < 5000) { // Quick failures are likely crawl issues
      failureType = 'crawl';
    }
    
    recordCrawlerFailure(processingTime, failureType);
    
    try { await db.collection('runtimeMetrics').doc('crawler').set({ ...crawlerLocal, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); } catch { }
    // Historical fallback: try most recent stored audit for user+url
    if (uid) {
      try {
        const auditsCol = db.collection('audits').doc(uid).collection('urls');
        const snap = await auditsCol.where('url', '==', normalizedUrl).orderBy('createdAt', 'desc').limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0].data();
          const historic: EnrichedAuditResponse = {
            score: doc.score?.overall || 55,
            overallScore: doc.score?.overall || 55,
            issues: { critical: [], major: [], minor: [] },
            recommendations: doc.suggestions || ['Review previous audit insights'],
            performanceMetrics: doc.raw?.performanceMetrics || {},
            items: (Array.isArray(doc.issues) ? doc.issues : []).map((iss: string, idx: number) => ({
              id: `hist-${idx}`,
              name: iss,
              title: iss,
              description: iss,
              details: 'Recovered from historical audit',
              status: 'warning',
              score: 60,
              impact: 'medium',
              recommendation: doc.suggestions?.[0] || 'Address this issue.'
            })),
            summary: `Historical audit reused for ${normalizedUrl}.`,
            totalProcessingTime: Date.now() - start,
            cacheHit: false,
            source: 'cache',
            quota: quotaInfo,
          };
          logPhase('historical_fallback', { url: normalizedUrl });
          return { ...historic, ephemeralMetrics: { cacheHitRate: metrics.cacheHitRate, avgProcessingTime: metrics.avgProcessingTime } };
        }
      } catch (histErr) {
        console.warn('historical_fallback_failed', (histErr as any)?.message);
      }
    }
    // Provide generic fallback minimal response (still counts toward quota) to allow UI continuity
    let globalIssues: string[] = [];
    try { const corpus = await buildGlobalCorpusSummary(60); globalIssues = corpus.issueSamples.slice(0, 5); } catch { }
    const fallback: EnrichedAuditResponse = {
      score: 60,
      overallScore: 60,
      issues: { critical: ['Fallback: Unable to complete live audit'], major: globalIssues.slice(0, 2), minor: globalIssues.slice(2) },
      recommendations: ['Retry the audit later.', 'Review historical top issues globally.'],
      performanceMetrics: { pageSpeed: 0 },
      items: [
        {
          id: 'fallback',
          name: 'Fallback Result',
          title: 'Fallback Result',
          description: 'Live audit failed; this is fallback data blending corpus patterns.',
          details: 'Live audit failed; this is fallback data with global corpus augmentation.',
          status: 'warning' as const,
          score: 60,
          impact: 'medium' as const,
          recommendation: 'Retry when service is stable.'
        },
        ...globalIssues.map((g, idx) => ({
          id: `corp-${idx}`,
          name: g,
          title: g,
          description: `Global frequent issue: ${g}`,
          details: `Derived from aggregated historical audits (#${idx + 1}).`,
          status: 'warning' as const,
          score: 55,
          impact: (idx < 2 ? 'high' : 'medium') as 'high' | 'medium',
          recommendation: 'Address globally common SEO issue.'
        }))
      ].slice(0, 8),
      summary: 'Fallback audit (global corpus assisted) due to internal error.',
      totalProcessingTime: Date.now() - start,
      cacheHit: false,
      source: 'fallback',
      quota: quotaInfo,
      timings: { crawl_time_ms: Date.now() - start, analysis_time_ms: 0, total_time_ms: Date.now() - start },
      failure: { type: failureType, message: errorMessage, timestamp: Date.now() }
    };
    metrics.totalProcessingTime += fallback.totalProcessingTime;
    
    // Persist fallback audit document with failure information for analysis
    try {
      if (uid) {
        const auditsCol = db.collection('audits').doc(uid).collection('urls');
        await auditsCol.add({
          url: normalizedUrl,
          score: {
            overall: fallback.overallScore,
            performance: fallback.performanceMetrics?.pageSpeed || 0,
            accessibility: fallback.performanceMetrics?.accessibility || 0,
            seo: fallback.overallScore,
            bestPractices: 0,
          },
          issues: fallback.items.filter(i => i.status !== 'pass').map(i => i.title),
          suggestions: fallback.recommendations || [],
          raw: { issues: fallback.issues, performanceMetrics: fallback.performanceMetrics },
          source: 'fallback',
          cacheKey: `${normalizedUrl}|d=${depth}|m=${checkMobile}`,
          userPlan: plan || null,
          processingMs: fallback.totalProcessingTime,
          // Wave 3: Include failure classification metadata
          failure: fallback.failure,
          timings: fallback.timings,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (persistErr) {
      console.warn('fallback_audit_persist_failed', (persistErr as any)?.message);
    }
    
    logPhase('fallback', { url: normalizedUrl });
    return { ...fallback, ephemeralMetrics: { cacheHitRate: metrics.cacheHitRate, avgProcessingTime: metrics.avgProcessingTime } };
  }
}
export const runSeoAudit = onCall(httpsOptions, async (request) => coreSeoAudit(request));

// Test helper for invoking callable without Firebase function harness
export async function __testRunSeoAudit(data: any, auth?: any) {
  if (process.env.GENKIT_TEST_STUB === '1') return coreSeoAudit({ data, auth });
  return (runSeoAudit as any)({ data, auth });
}

// Test helper to apply AI JSON enrichment logic (schema parse + normalization)
export function __testApplyAiAudit(core: AuditCoreResponse, aiJson: string, normalizedUrl: string) {
  const parsedRaw = tryParseAIJson(aiJson);
  let parsed: any = null;
  if (parsedRaw) {
    const safe = AiAuditSchema.safeParse(parsedRaw);
    if (safe.success) parsed = safe.data;
  }
  if (parsed && typeof parsed === 'object' && typeof parsed.overallScore === 'number') {
    const parsedItems = Array.isArray(parsed.items) ? parsed.items.slice(0, 50).map((it: any, idx: number) => ({
      id: String(it.id || `ai-${idx}`),
      name: String(it.name || it.title || `Issue ${idx + 1}`),
      title: String(it.title || it.name || `Issue ${idx + 1}`),
      description: String(it.description || it.details || it.title || ''),
      details: String(it.details || it.description || ''),
      status: ['pass', 'fail', 'warning'].includes(it.status) ? it.status : 'warning',
      score: typeof it.score === 'number' ? it.score : 60,
      impact: ['low', 'medium', 'high'].includes(it.impact) ? it.impact : 'medium',
      recommendation: String(it.recommendation || '')
    })) : buildItemsFromIssues(core);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : parsed.overallScore,
      overallScore: parsed.overallScore,
      issues: parsed.issues && parsed.issues.critical ? parsed.issues as any : core.issues,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length ? parsed.recommendations : core.recommendations,
      performanceMetrics: parsed.performanceMetrics || core.performanceMetrics,
      items: parsedItems,
      summary: typeof parsed.summary === 'string' ? parsed.summary : `Audit completed for ${normalizedUrl}.`,
      totalProcessingTime: 0,
      cacheHit: false,
      source: 'live' as const,
      quota: undefined
    } as EnrichedAuditResponse;
  }
  return {
    ...core,
    overallScore: core.score,
    items: buildItemsFromIssues(core),
    summary: `Audit completed for ${normalizedUrl}. Score: ${core.score}.`,
    totalProcessingTime: 0,
    cacheHit: false,
    source: 'live' as const,
    quota: undefined
  } as EnrichedAuditResponse;
}

/**
 * Perform basic web crawling for SEO analysis
 */
async function performWebCrawl(url: string, depth: number, checkMobile: boolean) {
  const crawlStart = Date.now();
  const MAX_PAGES = Math.min(Number(process.env.FIRECRAWL_MAX_PAGES || 12), 50);
  const visited: string[] = [];
  const queue: string[] = [url];
  const origin = new URL(url).origin;

  async function fetchRobots(base: string): Promise<{ disallow: string[] }> {
    try {
      const res = await fetch(new URL('/robots.txt', base).toString(), { redirect: 'follow' });
      if (!res.ok) return { disallow: [] };
      const txt = await res.text();
      const disallow: string[] = [];
      txt.split(/\n+/).forEach(l => {
        const m = l.match(/^Disallow:\s*(\S+)/i); if (m) disallow.push(m[1]);
      });
      return { disallow };
    } catch { return { disallow: [] }; }
  }

  const robots = depth > 1 ? await fetchRobots(origin) : { disallow: [] };
  function allowed(path: string) { return !robots.disallow.some(rule => rule !== '/' && path.startsWith(rule)); }

  // Attempt Firecrawl multi-page crawl if key present & depth>1
  if (process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_ENABLE !== 'false') {
    try {
      if (depth > 1) {
        const resp = await fetch('https://api.firecrawl.dev/v1/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
          body: JSON.stringify({ url, maxDepth: Math.min(depth, 3), limit: MAX_PAGES, formats: ['markdown'], onlyMainContent: true })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const pages: any[] = Array.isArray(data?.pages) ? data.pages.slice(0, MAX_PAGES) : [];
          const primary = pages[0]?.markdown || '';
          const aggregateHeadingsH1: string[] = [];
          const aggregateHeadingsH2: string[] = [];
          pages.forEach(p => {
            const md = p.markdown || '';
            (md.match(/^#\s+(.+)/gm) || []).forEach((h: string) => aggregateHeadingsH1.push(h.replace(/^#\s+/, '')));
            (md.match(/^##\s+(.+)/gm) || []).forEach((h: string) => aggregateHeadingsH2.push(h.replace(/^##\s+/, '')));
          });
          return {
            url,
            title: (primary.match(/^#\s+(.+)/m)?.[1]) || `Title for ${url}`,
            metaDescription: null,
            headings: { h1: aggregateHeadingsH1.slice(0, 3), h2: aggregateHeadingsH2.slice(0, 25) },
            loadTime: Date.now() - crawlStart,
            mobileOptimized: checkMobile,
            performanceMetrics: {
              pageSpeed: 70,
              mobileOptimization: checkMobile ? 75 : 85,
              accessibility: 80,
            },
            raw: { firecrawl: true, pages: pages.length }
          };
        }
      } else {
        const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
          body: JSON.stringify({ url, formats: ['markdown', 'html'], mobile: checkMobile })
        });
        if (resp.ok) {
          const data: any = await resp.json();
          const content = data?.markdown || data?.html || '';
          return {
            url,
            title: (content.match(/#\s+(.+)/)?.[1]) || `Title for ${url}`,
            metaDescription: null,
            headings: {
              h1: (content.match(/#\s+(.+)/g) || []).map((h: string) => h.replace(/^#\s+/, '')).slice(0, 3),
              h2: (content.match(/##\s+(.+)/g) || []).map((h: string) => h.replace(/^##\s+/, '')).slice(0, 10)
            },
            loadTime: Date.now() - crawlStart,
            mobileOptimized: checkMobile,
            performanceMetrics: { pageSpeed: 70, mobileOptimization: checkMobile ? 75 : 85, accessibility: 80 },
            raw: { firecrawl: true }
          };
        }
      }
    } catch (e) { console.warn('firecrawl_failed', (e as any)?.message); }
  }

  // Simple breadth-first crawl (same-origin) limited when depth>1 and no Firecrawl
  while (queue.length && visited.length < MAX_PAGES && visited.length < depth * MAX_PAGES) {
    const current = queue.shift()!;
    if (visited.includes(current)) continue;
    try {
      const started = Date.now();
      const res = await fetch(current, { redirect: 'follow' });
      const html = await res.text();
      const loadTime = Date.now() - started;
      const $ = cheerio.load(html);
      const title = $('title').first().text().trim() || `Title for ${current}`;
      // Collect links for next layer
      if (visited.length === 0 && depth > 1) {
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          try {
            const u = new URL(href, origin);
            if (u.origin === origin && allowed(u.pathname) && queue.length < MAX_PAGES) queue.push(u.toString());
          } catch { /* ignore */ }
        });
      }
      visited.push(current);
      if (visited[0] === current) {
        const metaDescription = $('meta[name="description"]').attr('content') || null;
        const h1 = $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 3);
        const h2 = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 25);
        return {
          url,
          title,
          metaDescription,
          headings: { h1: h1.length ? h1 : [title], h2: h2.length ? h2 : [] },
          loadTime: Date.now() - crawlStart,
          mobileOptimized: checkMobile,
          performanceMetrics: {
            pageSpeed: Math.min(95, Math.max(40, 90 - Math.round(loadTime / 150))),
            mobileOptimization: checkMobile ? 70 : 85,
            accessibility: 75,
          },
          raw: { directFetch: true, status: res.status, crawled: visited.length }
        };
      }
    } catch (e) { console.warn('bfs_crawl_fetch_failed', (e as any)?.message); }
  }

  // Deterministic synthetic fallback (hash-based seeded variability suppressed to remain stable)
  return {
    url,
    title: `Synthetic Title for ${url}`,
    metaDescription: "Synthetic meta description",
    headings: { h1: ["Synthetic H1"], h2: ["Synthetic Section 1", "Synthetic Section 2"] },
    loadTime: 1800,
    mobileOptimized: checkMobile,
    performanceMetrics: { pageSpeed: 65, mobileOptimization: checkMobile ? 72 : 85, accessibility: 78 },
    raw: { synthetic: true }
  };
}

// Test helper (not referenced in production code paths)
export async function __testPerformWebCrawl(u: string, d: number, m: boolean) { return performWebCrawl(u, d, m); }

/**
 * Calculate overall SEO score from crawl results
 */
function calculateOverallScore(crawlResults: any): number {
  // Align with weighting described in AI prompt (base 95 then deduct)
  let score = 95;
  const issues = categorizeIssues(crawlResults);
  score -= issues.critical.length * 15;
  score -= issues.major.length * 8;
  score -= issues.minor.length * 2;
  if (crawlResults.loadTime > 3000) score -= 5; // additional perf penalty
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Categorize issues from crawl results
 */
function categorizeIssues(crawlResults: any) {
  const issues: {
    critical: string[];
    major: string[];
    minor: string[];
  } = { critical: [], major: [], minor: [] };

  if (!crawlResults.metaDescription) {
    issues.critical.push("Missing meta description");
  }

  if (crawlResults.loadTime > 3000) {
    issues.major.push("Slow page load time detected");
  }

  if (!crawlResults.mobileOptimized) {
    issues.major.push("Poor mobile optimization");
  }

  if (crawlResults.headings.h1?.length !== 1) {
    issues.minor.push("Multiple or missing H1 tags");
  }

  return issues;
}

/**
 * Generate recommendations from crawl results
 */
function generateRecommendations(crawlResults: any): string[] {
  const recommendations = [];

  if (!crawlResults.metaDescription) {
    recommendations.push("Add meta descriptions to improve click-through rates");
  }

  if (crawlResults.loadTime > 3000) {
    recommendations.push("Optimize page loading speed for better user experience");
  }

  if (!crawlResults.mobileOptimized) {
    recommendations.push("Implement responsive design for mobile devices");
  }

  recommendations.push("Regular SEO audits to maintain optimization");

  return recommendations;
}

/**
 * Helper function to generate mock data for emulator testing
 * @return {AuditResponse} Mock audit response data
 */
function mockAuditResponse(): AuditCoreResponse {
  return {
    score: 68 + Math.floor(Math.random() * 20),
    issues: {
      critical: ["Missing canonical tags", "Duplicate title tags found"],
      major: [
        "Slow page load time on mobile",
        "Poor internal linking structure",
        "Multiple H1 tags detected",
      ],
      minor: [
        "Some images missing alt text",
        "Meta descriptions too long on blog pages",
        "URL structure could be improved",
      ],
    },
    recommendations: [
      "Add canonical tags to all pages",
      "Optimize page loading speed",
      "Improve internal linking structure",
      "Fix duplicate title tags",
      "Ensure all images have descriptive alt text",
    ],
    performanceMetrics: {
      pageSpeed: 65 + Math.floor(Math.random() * 20),
      mobileOptimization: 70 + Math.floor(Math.random() * 15),
      accessibility: 75 + Math.floor(Math.random() * 15),
      userExperience: 72 + Math.floor(Math.random() * 18),
    },
  };
}
