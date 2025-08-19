/**
 * Historical Data Seeder
 * ---------------------------------------------
 * Generates multi-month historical mock data for test users & teams:
 *  - Extends existing enhanced test users (does not recreate them)
 *  - Backfills multi-month usage records (top-level /usage collection)
 *  - Creates /keywordResearch, /linkAnalyses, /neuroSeoAnalyses docs with chronological spread
 *  - Creates a shared cross-tier team with proper memberIds for chat + reports testing
 *  - Seeds multi-channel team chat history (timestamps over last 90 days)
 *  - Idempotent: deterministic IDs; skips existing docs
 *
 *  NOTE: Current security rules gate new collection access; this script uses Admin SDK
 *  so rules are bypassed. Only collections already covered by rules are used to avoid
 *  client read failures. Domain (sales/marketing/finance) history is represented via
 *  user activities (users/{uid}/activities) for future dashboard integration.
 */
 

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---------------------------------------------------------
const MONTHS_BACK = 6;               // Number of full months to backfill
const ANALYSES_PER_MONTH = 2;        // NeuroSEO analyses per month per user
const KEYWORD_RESEARCH_PER_MONTH = 3;
const LINK_ANALYSES_PER_MONTH = 1;
const ACTIVITIES_PER_MONTH = 8;      // Mixed domain activity events
const DEALS_PER_MONTH_BASE = 4;      // Scaled by tier
const CAMPAIGNS_PER_MONTH_BASE = 2;  // Scaled by tier
const INVOICES_PER_MONTH = 1;        // One invoice per month (paid tiers)
const CONTENT_BRIEFS_PER_MONTH_BASE = 1; // Scaled by tier (content briefs)
const COMPETITOR_ANALYSES_PER_MONTH_BASE = 1; // For starter+ tiers (scaled)
const SERP_KEYWORDS_PER_USER = 3;    // Number of tracked keywords per user for serpData
const CHAT_DAYS = 90;                // Days of chat history
const CHAT_MESSAGES_PER_DAY = 6;     // Average messages per day (distributed across channels)
const SHARED_TEAM_ID = 'shared_test_team';

// Channels to seed for shared team chat
const TEAM_CHANNELS = [
    { id: 'general', name: 'General', description: 'General coordination', type: 'general' },
    { id: 'sales', name: 'Sales', description: 'Sales pipeline updates', type: 'sales' },
    { id: 'marketing', name: 'Marketing', description: 'Marketing campaigns', type: 'marketing' },
    { id: 'finance', name: 'Finance', description: 'Finance & billing status', type: 'finance' },
    { id: 'announcements', name: 'Announcements', description: 'Important updates', type: 'announcements' }
];

// Domain activity blueprints
const DOMAIN_ACTIVITY_TYPES = [
    'marketing.email_campaign',
    'marketing.lead_generation',
    'sales.pipeline_update',
    'sales.deal_stage_change',
    'finance.invoice_generated',
    'finance.revenue_recorded',
    'seo.neuroseo_analysis_completed',
    'seo.keyword_research_completed'
];

// --- Firebase Admin Bootstrap ---------------------------------------------
function initFirebase() {
    if (!getApps().length) {
        const keyPath = path.resolve(__dirname, '../serviceAccount.json');
        if (!fs.existsSync(keyPath)) {
            console.error('Missing serviceAccount.json – aborting.');
            process.exit(1);
        }
        const serviceAccount = require(keyPath);
        initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
    }
    return getFirestore();
}

// CLI Flags
const argv = process.argv.slice(2);
const FLAG_ALL_USERS = argv.includes('--allUsers');
const FLAG_FORCE_CHAT_RESEED = argv.includes('--forceChatReseed');
const FLAG_ADD_MISSING_CHAT_PARTICIPANTS = argv.includes('--addMissingChatParticipants');

// Load users (testAccount by default; optionally all with qualifying roles)
interface TestUserDoc { uid: string; email: string; role: string; subscriptionTier?: string; createdAt?: any; }
async function getSeedUsers(db: FirebaseFirestore.Firestore): Promise<TestUserDoc[]> {
    const roleSet = new Set(['free', 'starter', 'agency', 'enterprise', 'admin']);
    const snap = FLAG_ALL_USERS
        ? await db.collection('users').get()
        : await db.collection('users').where('testAccount', '==', true).get();
    const users: TestUserDoc[] = [];
    let skipped = 0;
    const roleRank: Record<string, number> = { free: 1, starter: 2, agency: 3, enterprise: 4, admin: 5 };
    const byEmail: Record<string, TestUserDoc> = {};
    for (const doc of snap.docs) {
        const raw: any = doc.data() || {};
        const uid = raw.uid || doc.id; // fallback to doc id
        const email = raw.email;
        if (!uid || !email) { skipped++; continue; }
        const role = roleSet.has(raw.role) ? raw.role : 'free';
        const candidate: TestUserDoc = { uid, email, role, subscriptionTier: raw.subscriptionTier, createdAt: raw.createdAt };
        const existing = byEmail[email];
        if (!existing || roleRank[candidate.role] > roleRank[existing.role]) {
            byEmail[email] = candidate;
        }
    }
    users.push(...Object.values(byEmail));
    if (skipped) console.log(`  ↺ Skipped ${skipped} user doc(s) missing uid/email`);
    return users;
}

// Utility: deterministic pseudo-random generator (seeded by key)
function seededNumber(key: string, min: number, max: number) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = Math.imul(31, h) + key.charCodeAt(i) | 0;
    const x = Math.abs(Math.sin(h) * 10000) % 1; // 0..1
    return Math.round(min + x * (max - min));
}

function monthOffsets(back: number): { period: string; start: Date; end: Date }[] {
    const out: { period: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 0; i < back; i++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const period = d.toISOString().slice(0, 7); // YYYY-MM
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
        out.push({ period, start: d, end });
    }
    return out.reverse(); // oldest first
}

async function ensureSharedTeam(db: FirebaseFirestore.Firestore, users: TestUserDoc[]) {
    const ref = db.collection('teams').doc(SHARED_TEAM_ID);
    const snap = await ref.get();
    const memberIds = Array.from(new Set(users.map(u => u.uid).filter(Boolean)));
    const members = users.filter(u => u.uid && u.email).map(u => ({ userId: u.uid, email: u.email, role: u.role, joinedAt: Timestamp.fromDate(new Date()), permissions: ['read_projects', 'create_analyses', 'export_reports'] }));
    if (!memberIds.length) {
        throw new Error('No valid users to attach to shared team (all missing uid/email)');
    }
    if (snap.exists) {
        const data = snap.data() || {};
        const needsMemberIds = !Array.isArray(data.memberIds) || memberIds.some(id => !data.memberIds.includes(id));
        if (needsMemberIds) {
            await ref.set({ memberIds, members, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            console.log('  ↺ Updated shared team membership');
        } else {
            console.log('  ✓ Shared team already present');
        }
    } else {
        await ref.set({
            id: SHARED_TEAM_ID,
            name: 'Shared Test Team',
            description: 'Cross-tier shared test team for chat & collaboration features',
            ownerId: users.find(u => u.role === 'admin')?.uid || users[0].uid,
            plan: 'enterprise',
            memberIds,
            members,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            testData: true
        });
        console.log('  ✓ Created shared test team');
    }
}

async function seedChatHistory(db: FirebaseFirestore.Firestore, users: TestUserDoc[]) {
    const baseChatRef = db.collection('teamChats').doc(SHARED_TEAM_ID);
    // Channels metadata
    for (const ch of TEAM_CHANNELS) {
        await baseChatRef.collection('channels').doc(ch.id).set({
            name: ch.name,
            description: ch.description,
            type: ch.type,
            isPrivate: false,
            createdAt: FieldValue.serverTimestamp()
        }, { merge: true });
    }
    const messagesRef = baseChatRef.collection('messages');
    // Check existing messages
    const existing = await messagesRef.limit(5).get();
    if (!existing.empty && !FLAG_FORCE_CHAT_RESEED) {
        // Optionally add messages authored by newly added users only
        if (FLAG_ADD_MISSING_CHAT_PARTICIPANTS) {
            const authorIdsInMessages = new Set<string>();
            (await messagesRef.limit(500).get()).docs.forEach(d => authorIdsInMessages.add(d.data().authorId));
            const newAuthors = users.filter(u => !authorIdsInMessages.has(u.uid));
            if (newAuthors.length) {
                let batch = db.batch();
                let ops = 0;
                const now = new Date();
                for (const author of newAuthors) {
                    for (const ch of TEAM_CHANNELS) {
                        const msgRef = messagesRef.doc();
                        batch.set(msgRef, {
                            content: `Backfilled participation message for ${author.role} user ${author.email}`,
                            authorId: author.uid,
                            authorName: author.email,
                            channelId: ch.id,
                            timestamp: Timestamp.fromDate(new Date(now.getTime() - seededNumber(author.uid + ch.id, 1, 6) * 60 * 60 * 1000)),
                            type: 'text',
                            reactions: {},
                            testData: true
                        });
                        ops++;
                        if (ops % 400 === 0) { await batch.commit(); batch = db.batch(); }
                    }
                }
                if (ops % 400 !== 0) await batch.commit();
                console.log(`  ✓ Injected ${newAuthors.length} new participant(s) into existing chat history`);
            } else {
                console.log('  ✓ All users already represented in chat history');
            }
        } else {
            console.log('  (chat) Messages exist – skipping (use --forceChatReseed to override or --addMissingChatParticipants)');
        }
        return;
    }
    const now = new Date();
    const channelIds = TEAM_CHANNELS.map(c => c.id);
    const contentSamples = {
        general: ['Daily standup sync', 'Deploy succeeded', 'Reviewing metrics spike', 'Reminder: security rotation'],
        sales: ['New lead added to pipeline', 'Deal moved to negotiation', 'Monthly quota progress 72%', 'Lead score anomaly review'],
        marketing: ['Email campaign CTR 18%', 'Content calendar updated', 'Social presence growth +12%', 'A/B test variant B winning'],
        finance: ['Invoice RP-1004 paid', 'MRR updated', 'Refund processed', 'Expense report validated'],
        announcements: ['Platform maintenance scheduled', 'New feature flag enabled', 'Policy update published', 'Quarterly roadmap posted']
    } as Record<string, string[]>;
    const batchSize = 400; // adaptively small to avoid batch limits
    let batch = db.batch();
    let ops = 0;
    for (let day = CHAT_DAYS; day >= 1; day--) {
        const dayDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        const msgsToday = seededNumber('chat_' + dayDate.toISOString(), Math.max(2, CHAT_MESSAGES_PER_DAY - 2), CHAT_MESSAGES_PER_DAY + 2);
        for (let i = 0; i < msgsToday; i++) {
            const channelId = channelIds[seededNumber('ch_' + dayDate.toISOString() + i, 0, channelIds.length - 1)];
            const author = users[seededNumber('user_' + channelId + dayDate.toISOString() + i, 0, users.length - 1)];
            const samples = contentSamples[channelId] || contentSamples.general;
            const content = samples[seededNumber('ct_' + channelId + dayDate.toISOString() + i, 0, samples.length - 1)];
            const ts = new Date(dayDate.getTime() + seededNumber('ofs_' + i + channelId, 0, 60 * 60 * 1000));
            const ref = messagesRef.doc();
            batch.set(ref, {
                content,
                authorId: author.uid,
                authorName: author.email,
                channelId,
                timestamp: Timestamp.fromDate(ts),
                type: 'text',
                reactions: {},
                testData: true
            });
            ops++;
            if (ops % batchSize === 0) { await batch.commit(); batch = db.batch(); }
        }
    }
    if (ops % batchSize !== 0) await batch.commit();
    console.log(`  ✓ Seeded ${ops} chat messages across ${TEAM_CHANNELS.length} channels`);
}

async function seedMonthlyUsage(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    for (const p of periods) {
        const id = `${user.uid}_${p.period}`;
        const ref = db.collection('usage').doc(id);
        const snap = await ref.get();
        if (snap.exists) continue; // idempotent
        const factor = 0.4 + (periods.indexOf(p) / periods.length) * 0.8; // ascending trend
        const usage = {
            neuroSeoAnalyses: Math.round(ANALYSES_PER_MONTH * factor * 1.2),
            keywordSearches: Math.round(100 * factor * (user.role === 'enterprise' ? 25 : user.role === 'agency' ? 15 : user.role === 'starter' ? 8 : 3)),
            contentAnalyses: Math.round(40 * factor * (user.role === 'enterprise' ? 10 : user.role === 'agency' ? 6 : user.role === 'starter' ? 3 : 1)),
            competitorReports: Math.round(5 * factor * (user.role === 'enterprise' ? 8 : user.role === 'agency' ? 4 : 1)),
            apiCalls: Math.round(200 * factor * (user.role === 'enterprise' ? 50 : user.role === 'agency' ? 25 : user.role === 'starter' ? 10 : 4)),
        } as Record<string, number>;
        await ref.set({
            id,
            userId: user.uid,
            period: p.period,
            usage,
            limits: {},
            overage: {},
            createdAt: Timestamp.fromDate(p.end),
            updatedAt: Timestamp.fromDate(p.end),
            testData: true
        });
    }
}

async function seedAnalyticalDocs(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    let analysisCounter = 0, krCounter = 0, linkCounter = 0;
    for (const p of periods) {
        for (let i = 0; i < ANALYSES_PER_MONTH; i++) {
            const created = new Date(p.start.getTime() + i * 2 * 24 * 60 * 60 * 1000 + seededNumber(user.uid + 'an' + i + p.period, 0, 6) * 60 * 60 * 1000);
            const id = `${user.uid}_hist_analysis_${p.period}_${i}`;
            const ref = db.collection('neuroSeoAnalyses').doc(id);
            if (!(await ref.get()).exists) {
                await ref.set({
                    id,
                    userId: user.uid,
                    projectId: `${user.uid}_project_1`,
                    analysisType: 'comprehensive',
                    urls: [`https://example-${user.role}.demo.com/${p.period}/${i}`],
                    targetKeywords: ['historical', 'trend', user.role],
                    engines: {},
                    summary: { overallScore: seededNumber(id, 60, 90), keyFindings: ['Historical backfill'], quickWins: ['Review historical patterns'] },
                    status: 'completed',
                    createdAt: Timestamp.fromDate(created),
                    completedAt: Timestamp.fromDate(new Date(created.getTime() + 3 * 60 * 1000)),
                    testData: true
                });
                analysisCounter++;
            }
        }
        for (let i = 0; i < KEYWORD_RESEARCH_PER_MONTH; i++) {
            const id = `${user.uid}_hist_kw_${p.period}_${i}`;
            const ref = db.collection('keywordResearch').doc(id);
            if (!(await ref.get()).exists) {
                await ref.set({
                    id,
                    userId: user.uid,
                    keywords: ['sample', 'historical', user.role],
                    seedKeyword: 'historical sample',
                    createdAt: Timestamp.fromDate(new Date(p.start.getTime() + i * 24 * 60 * 60 * 1000)),
                    status: 'completed',
                    testData: true
                });
                krCounter++;
            }
        }
        for (let i = 0; i < LINK_ANALYSES_PER_MONTH; i++) {
            const id = `${user.uid}_hist_link_${p.period}_${i}`;
            const ref = db.collection('linkAnalyses').doc(id);
            if (!(await ref.get()).exists) {
                await ref.set({
                    id,
                    userId: user.uid,
                    targetUrl: `https://example-${user.role}.demo.com/${p.period}/link-audit`,
                    findings: { backlinks: seededNumber(id, 50, 250) },
                    createdAt: Timestamp.fromDate(new Date(p.start.getTime() + 12 * 60 * 60 * 1000)),
                    status: 'completed',
                    testData: true
                });
                linkCounter++;
            }
        }
    }
    console.log(`  ✓ ${user.email}: analyses ${analysisCounter}, keywordResearch ${krCounter}, linkAnalyses ${linkCounter}`);
}

async function seedUserActivities(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    for (const p of periods) {
        for (let i = 0; i < ACTIVITIES_PER_MONTH; i++) {
            const dayOffset = seededNumber(user.uid + p.period + 'act' + i, 0, 26);
            const date = new Date(p.start.getTime() + dayOffset * 24 * 60 * 60 * 1000 + seededNumber('hr' + i + user.uid, 0, 20) * 60 * 60 * 1000);
            const type = DOMAIN_ACTIVITY_TYPES[seededNumber(user.uid + 't' + p.period + i, 0, DOMAIN_ACTIVITY_TYPES.length - 1)];
            const id = `${p.period.replace('-', '')}_${i}_${type.replace(/\./g, '_')}`;
            const ref = db.collection('users').doc(user.uid).collection('activities').doc(id);
            if ((await ref.get()).exists) continue;
            await ref.set({
                type,
                createdAt: Timestamp.fromDate(date),
                meta: {
                    value: seededNumber(user.uid + type + id, 1, 1000),
                    description: 'Historical domain event',
                    period: p.period
                },
                testData: true
            });
        }
    }
}

// --- New Domain Collections Seeding ---------------------------------------

function tierScale(role: string) {
    switch (role || 'free') {
        case 'enterprise': return 5;
        case 'agency': return 3;
        case 'starter': return 2;
        default: return 1; // free/admin (admin treated as observer)
    }
}

async function seedSalesDeals(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    const scale = tierScale(user.role);
    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
    let created = 0;
    for (const p of periods) {
        const count = DEALS_PER_MONTH_BASE * scale;
        for (let i = 0; i < count; i++) {
            const id = `${user.uid}_${p.period}_deal_${i}`;
            const ref = db.collection('salesDeals').doc(id);
            if ((await ref.get()).exists) continue;
            const stageIndex = seededNumber(id + 'stage', 0, stages.length - 1);
            const stage = stages[stageIndex];
            const isClosed = stage.startsWith('closed_');
            const value = seededNumber(id + 'val', 500 * scale, 5000 * scale);
            const createdAt = new Date(p.start.getTime() + seededNumber(id + 'day', 0, 25) * 24 * 60 * 60 * 1000);
            const closedAt = isClosed ? new Date(createdAt.getTime() + seededNumber(id + 'cls', 1, 15) * 24 * 60 * 60 * 1000) : null;
            await ref.set({
                id,
                userId: user.uid,
                period: p.period,
                title: `Deal ${i + 1} ${p.period}`,
                stage,
                status: isClosed ? stage : 'open',
                value,
                currency: 'USD',
                probability: stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 : seededNumber(id + 'prob', 20, 90),
                createdAt: Timestamp.fromDate(createdAt),
                updatedAt: Timestamp.fromDate(closedAt || createdAt),
                closedAt: closedAt ? Timestamp.fromDate(closedAt) : null,
                testData: true
            });
            created++;
        }
    }
    console.log(`  ✓ ${user.email}: salesDeals ${created}`);
}

async function seedMarketingCampaigns(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    const scale = tierScale(user.role);
    const channels = ['email', 'social', 'content', 'paid'] as const;
    let created = 0;
    for (const p of periods) {
        const count = CAMPAIGNS_PER_MONTH_BASE * scale;
        for (let i = 0; i < count; i++) {
            const id = `${user.uid}_${p.period}_camp_${i}`;
            const ref = db.collection('marketingCampaigns').doc(id);
            if ((await ref.get()).exists) continue;
            const channel = channels[seededNumber(id + 'chn', 0, channels.length - 1)];
            const impressions = seededNumber(id + 'imp', 1000 * scale, 25000 * scale);
            const clicks = Math.max(1, Math.round(impressions * (0.02 + seededNumber(id + 'ctr', 1, 5) / 100)));
            const leads = Math.round(clicks * (0.05 + seededNumber(id + 'conv', 1, 10) / 100));
            const spend = channel === 'paid' ? seededNumber(id + 'sp', 100 * scale, 5000 * scale) : seededNumber(id + 'sp', 10 * scale, 500 * scale);
            const revenue = leads * seededNumber(id + 'rev', 50, 200);
            const roi = spend ? Number(((revenue - spend) / spend * 100).toFixed(2)) : 0;
            const createdAt = new Date(p.start.getTime() + seededNumber(id + 'day', 0, 25) * 24 * 60 * 60 * 1000);
            await ref.set({
                id,
                userId: user.uid,
                period: p.period,
                name: `${channel.toUpperCase()} Campaign ${i + 1} ${p.period}`,
                channel,
                impressions,
                clicks,
                ctr: Number((clicks / impressions * 100).toFixed(2)),
                leads,
                spend,
                revenue,
                roi,
                status: 'completed',
                createdAt: Timestamp.fromDate(createdAt),
                updatedAt: Timestamp.fromDate(createdAt),
                testData: true
            });
            created++;
        }
    }
    console.log(`  ✓ ${user.email}: marketingCampaigns ${created}`);
}

async function seedFinanceInvoices(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    let created = 0;
    // Skip free tier (no invoices), admin optional (skip)
    if (user.role === 'free' || user.role === 'admin') {
        console.log(`  ↺ ${user.email}: invoices skipped (role=${user.role})`);
        return;
    }
    for (const p of periods) {
        for (let i = 0; i < INVOICES_PER_MONTH; i++) {
            const id = `${user.uid}_${p.period}_inv_${i}`;
            const ref = db.collection('financeInvoices').doc(id);
            if ((await ref.get()).exists) continue;
            const amountBase = user.role === 'starter' ? 99 : user.role === 'agency' ? 499 : 1999; // example plan pricing
            const issuedAt = new Date(p.start.getTime() + seededNumber(id + 'day', 0, 3) * 24 * 60 * 60 * 1000);
            const paid = seededNumber(id + 'paid', 0, 100) > 5; // 95% paid
            const paidAt = paid ? new Date(issuedAt.getTime() + seededNumber(id + 'lag', 1, 10) * 24 * 60 * 60 * 1000) : null;
            await ref.set({
                id,
                userId: user.uid,
                period: p.period,
                amount: amountBase,
                currency: 'USD',
                status: paid ? 'paid' : 'issued',
                issuedAt: Timestamp.fromDate(issuedAt),
                paidAt: paidAt ? Timestamp.fromDate(paidAt) : null,
                dueAt: Timestamp.fromDate(new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000)),
                planTier: user.role,
                testData: true
            });
            created++;
        }
    }
    console.log(`  ✓ ${user.email}: financeInvoices ${created}`);
}

// --- Additional NeuroSEO Related Collections ---------------------------------

function tierMultiplier(role: string) {
    switch (role) {
        case 'enterprise': return 4;
        case 'agency': return 3;
        case 'starter': return 2;
        default: return 1; // free/admin
    }
}

async function seedContentBriefs(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    // Content briefs for starter+ tiers; free gets occasional (every other month)
    let created = 0;
    const scale = tierMultiplier(user.role);
    for (const p of periods) {
        const allow = user.role !== 'free' || (periods.indexOf(p) % 2 === 0); // every other month for free
        if (!allow) continue;
        const count = CONTENT_BRIEFS_PER_MONTH_BASE * scale;
        for (let i = 0; i < count; i++) {
            const id = `${user.uid}_${p.period}_brief_${i}`;
            const ref = db.collection('contentBriefs').doc(id);
            if ((await ref.get()).exists) continue;
            const targetKeyword = `historical keyword ${i + 1} ${p.period}`;
            const createdAt = new Date(p.start.getTime() + seededNumber(id + 'dt', 0, 20) * 24 * 60 * 60 * 1000);
            await ref.set({
                id,
                userId: user.uid,
                targetKeyword,
                contentType: 'blog',
                brief: {
                    title: `Historical Brief ${targetKeyword}`,
                    metaDescription: `Generated historical content brief for ${targetKeyword}`,
                    outline: [
                        { heading: 'Introduction', subheadings: ['Context', 'Goal'], keyPoints: ['Historical seeding'], wordCount: 250 },
                        { heading: 'Main Strategy', subheadings: ['Tactics'], keyPoints: ['Optimize content'], wordCount: 600 }
                    ],
                    targetAudience: { demographics: 'Test audience', painPoints: ['Need data'], goals: ['Improve SEO'], expertiseLevel: 'beginner' },
                    seoGuidelines: { primaryKeyword: targetKeyword, secondaryKeywords: [targetKeyword + ' strategy'], semanticKeywords: [targetKeyword + ' guide'], keywordDensity: 1.2, targetWordCount: 1500 },
                    competitorAnalysis: [],
                    callsToAction: ['Sign up free'],
                    internalLinkSuggestions: [],
                    externalReferences: []
                },
                status: 'completed',
                createdAt: Timestamp.fromDate(createdAt),
                updatedAt: Timestamp.fromDate(createdAt),
                period: p.period,
                testData: true
            });
            created++;
        }
    }
    console.log(`  ✓ ${user.email}: contentBriefs ${created}`);
}

async function seedCompetitorAnalyses(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    // Competitor analyses for starter+ only
    if (['free', 'admin'].includes(user.role)) { console.log(`  ↺ ${user.email}: competitorAnalyses skipped (role=${user.role})`); return; }
    let created = 0;
    const scale = tierMultiplier(user.role);
    for (const p of periods) {
        const count = COMPETITOR_ANALYSES_PER_MONTH_BASE * scale;
        for (let i = 0; i < count; i++) {
            const id = `${user.uid}_${p.period}_comp_${i}`;
            const ref = db.collection('competitorAnalyses').doc(id);
            if ((await ref.get()).exists) continue;
            const createdAt = new Date(p.start.getTime() + seededNumber(id + 'ca', 0, 25) * 24 * 60 * 60 * 1000);
            const competitors = ['example.com', 'competitor-a.com', 'competitor-b.com'].slice(0, 2 + (seededNumber(id + 'ct', 0, 1)));
            await ref.set({
                id,
                userId: user.uid,
                competitors,
                analysis: {
                    overview: competitors.map((domain, idx) => ({ domain, domainAuthority: 50 + idx * 5, organicTraffic: 10000 + idx * 5000, organicKeywords: 1500 + idx * 500, backlinks: 300 + idx * 120, estimatedValue: 20000 + idx * 8000 })),
                    keywordGaps: [],
                    contentGaps: [],
                    backLinkGaps: [],
                    swotAnalysis: { strengths: ['Strong baseline'], weaknesses: ['Limited authority'], opportunities: ['Expand content'], threats: ['Emerging competitors'] }
                },
                createdAt: Timestamp.fromDate(createdAt),
                period: p.period,
                testData: true
            });
            created++;
        }
    }
    console.log(`  ✓ ${user.email}: competitorAnalyses ${created}`);
}

async function seedSerpDataForUser(db: FirebaseFirestore.Firestore, user: TestUserDoc) {
    // Small set of SERP snapshots (not monthly heavy) – deterministic keywords
    const baseKeywords = ['ai seo tools', 'content optimization', 'competitor analysis'];
    const keywords = baseKeywords.slice(0, SERP_KEYWORDS_PER_USER);
    let created = 0;
    for (const kw of keywords) {
        const id = `${user.uid}_serp_${kw.replace(/\s+/g, '_')}`;
        const ref = db.collection('serpData').doc(id);
        if ((await ref.get()).exists) continue;
        const results = Array.from({ length: 10 }, (_, i) => ({ position: i + 1, title: `Result ${i + 1} for ${kw}`, url: `https://result-${i + 1}.${user.role}.demo.com/${kw.replace(/\s+/g, '-')}`, snippet: `Snippet ${i + 1} about ${kw}` }));
        await ref.set({
            id,
            userId: user.uid,
            keyword: kw,
            location: 'US',
            device: 'desktop',
            searchEngine: 'google',
            results,
            createdAt: Timestamp.fromDate(new Date(Date.now() - seededNumber(id, 1, 20) * 24 * 60 * 60 * 1000)),
            testData: true
        });
        created++;
    }
    console.log(`  ✓ ${user.email}: serpData ${created}`);
}

async function augmentUserProfileAndSettings(db: FirebaseFirestore.Firestore, user: TestUserDoc) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) return; // rely on enhanced test seeder
    const data: any = snap.data() || {};
    const update: any = {};
    if (!data.profile) {
        update.profile = {
            company: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Demo Co`,
            website: `https://${user.role}.demo.rankpilot.test`,
            industry: 'Technology',
            teamSize: user.role === 'enterprise' ? '500+' : user.role === 'agency' ? '11-50' : '1-10',
            goals: ['Improve SEO', 'Test historical dataset'],
            timezone: 'UTC',
            language: 'en'
        };
    }
    if (!data.preferences) {
        update.preferences = {
            emailNotifications: true,
            weeklyReports: user.role !== 'free',
            competitorAlerts: ['agency', 'enterprise'].includes(user.role),
            seoRecommendations: true,
            darkMode: false,
            dashboardLayout: 'standard'
        };
    }
    if (Object.keys(update).length) {
        update.updatedAt = FieldValue.serverTimestamp();
        await ref.set(update, { merge: true });
        console.log(`  ↺ Augmented profile/settings for ${user.email}`);
    }
}

// Lightweight content analyses (1 per month for starter+, every other month for free) and seo audits (quarterly)
async function seedContentAnalysesLite(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    let created = 0;
    for (const p of periods) {
        const allow = user.role !== 'free' || (periods.indexOf(p) % 2 === 0);
        if (!allow) continue;
        const id = `${user.uid}_${p.period}_content_analysis`;
        const ref = db.collection('contentAnalyses').doc(id);
        if ((await ref.get()).exists) continue;
        const createdAt = new Date(p.start.getTime() + seededNumber(id + 'c', 0, 25) * 24 * 60 * 60 * 1000);
        await ref.set({
            id,
            userId: user.uid,
            url: `https://example-${user.role}.demo.com/${p.period}/content`,
            analysis: {
                readabilityScore: seededNumber(id + 'r', 60, 85),
                seoScore: seededNumber(id + 's', 55, 90),
                wordCount: 1200 + seededNumber(id + 'w', 0, 800),
                readingTime: 5 + seededNumber(id + 't', 0, 6),
                keywordDensity: {},
                headingStructure: { h1: 1, h2: 5, h3: 3, h4: 0, h5: 0, h6: 0 },
                technicalSeo: { titleTag: { present: true, length: 55, optimized: true }, metaDescription: { present: true, length: 150, optimized: true }, altTags: { total: 10, missing: 1, optimized: 7 }, internalLinks: 12, externalLinks: 4 },
                contentQuality: { originalityScore: 80, expertiseLevel: 'intermediate', topicDepth: 75, sentimentScore: 0.4 },
                improvementSuggestions: []
            },
            createdAt: Timestamp.fromDate(createdAt),
            period: p.period,
            testData: true
        });
        created++;
    }
    console.log(`  ✓ ${user.email}: contentAnalyses ${created}`);
}

async function seedSeoAuditsLite(db: FirebaseFirestore.Firestore, user: TestUserDoc, periods: { period: string; start: Date; end: Date }[]) {
    // One audit every 3 months for starter+, skip free/admin
    if (['free', 'admin'].includes(user.role)) { console.log(`  ↺ ${user.email}: seoAudits skipped (role=${user.role})`); return; }
    let created = 0;
    for (const p of periods.filter((_, idx) => idx % 3 === 0)) {
        const id = `${user.uid}_${p.period}_audit`;
        const ref = db.collection('seoAudits').doc(id);
        if ((await ref.get()).exists) continue;
        await ref.set({
            id,
            userId: user.uid,
            url: `https://audit-${user.role}.demo.com/${p.period}`,
            auditType: 'technical',
            results: { overallScore: seededNumber(id + 'o', 60, 90) },
            createdAt: Timestamp.fromDate(new Date(p.start.getTime() + 5 * 24 * 60 * 60 * 1000)),
            period: p.period,
            testData: true
        });
        created++;
    }
    console.log(`  ✓ ${user.email}: seoAudits ${created}`);
}

async function run() {
    console.log('🚀 Historical data seeding started');
    const db = initFirebase();
    const users = await getSeedUsers(db);
    if (!users.length) {
        console.error('No test users (testAccount=true) found. Run enhanced test user seeder first.');
        process.exit(1);
    }
    console.log(`Found ${users.length} seedable users${FLAG_ALL_USERS ? ' (allUsers mode)' : ''}`);
    await ensureSharedTeam(db, users);
    await seedChatHistory(db, users);
    const periods = monthOffsets(MONTHS_BACK);
    for (const user of users) {
        await augmentUserProfileAndSettings(db, user);
        await seedMonthlyUsage(db, user, periods);
        await seedAnalyticalDocs(db, user, periods);
        await seedUserActivities(db, user, periods);
        await seedSalesDeals(db, user, periods);
        await seedMarketingCampaigns(db, user, periods);
        await seedFinanceInvoices(db, user, periods);
        await seedContentBriefs(db, user, periods);
        await seedCompetitorAnalyses(db, user, periods);
        await seedSerpDataForUser(db, user);
        await seedContentAnalysesLite(db, user, periods);
        await seedSeoAuditsLite(db, user, periods);
    }
    console.log('✅ Historical data seeding complete');
}

run().catch(e => { console.error(e); process.exit(1); });
