// Seed sample data for quick visual checks: team report, chat messages, and enriched projects
// Usage: node scripts/seed-team-samples.js

const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin using env variables or serviceAccount.json if present (local only)
const saPath = path.resolve(__dirname, '../serviceAccount.json');
let creds;
if (fs.existsSync(saPath)) {
  creds = require(saPath);
} else {
  creds = {
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    private_key: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
}

initializeApp({
  credential: cert(creds),
  projectId: creds.project_id,
});

const db = getFirestore();

const TEAM_ID = 'debug-team-001';
const ADMIN_UID = 'UFGrzIf2N3UTPd5Xz7vT8tMZpHJ3';
const ADMIN_EMAIL = 'admin@rankpilot.com';

async function seedReport() {
  const reportsCol = db.collection('teams').doc(TEAM_ID).collection('reports');
  const sample = {
    title: 'Monthly SEO Performance Report',
    description: 'Comprehensive monthly overview of SEO metrics and progress',
    type: 'monthly', // weekly | monthly | quarterly | custom
    status: 'published', // draft | published | scheduled
    createdBy: ADMIN_EMAIL,
    createdAt: FieldValue.serverTimestamp(),
    lastModified: FieldValue.serverTimestamp(),
    metrics: { totalViews: 156, downloads: 42, shares: 8 },
    content: {
      keywordTracking: true,
      competitorAnalysis: true,
      contentPerformance: true,
      technicalSEO: true,
    },
    recipients: ['team@company.com', 'manager@company.com'],
    tags: ['monthly', 'overview', 'performance'],
  };
  const docRef = await reportsCol.add(sample);
  console.log(`Seeded report: ${docRef.id}`);
}

async function seedChat() {
  const msgs = db.collection('teamChats').doc(TEAM_ID).collection('messages');
  const channelsMeta = db.collection('teamChats').doc(TEAM_ID).collection('channels');
  const now = FieldValue.serverTimestamp();

  const channels = [
    { id: 'general', name: 'General', description: 'General team discussions', type: 'general' },
    { id: 'support', name: 'Support', description: 'Customer support coordination', type: 'support' },
    { id: 'development', name: 'Development', description: 'Technical discussions and updates', type: 'development' },
    { id: 'announcements', name: 'Announcements', description: 'Important team announcements', type: 'announcements' },
    { id: 'random', name: 'Random', description: 'Off-topic conversations', type: 'random' },
  ];

  // Seed channels metadata (optional for UI enhancements)
  for (const ch of channels) {
    await channelsMeta.doc(ch.id).set({
      name: ch.name,
      description: ch.description,
      type: ch.type,
      isPrivate: false,
      createdAt: now,
    }, { merge: true });
  }

  const base = (channelId) => ({
    authorId: ADMIN_UID,
    authorName: 'Admin User',
    authorAvatar: null,
    channelId,
    timestamp: now,
    type: 'text',
    reactions: {},
  });

  const messagesByChannel = {
    general: [
      'Welcome to the team chat! 🎉',
      'Kick off discussion for our SEO sprint.',
      'Share updates here throughout the week.',
    ],
    support: [
      'Ticket RP-1243: 404 on sitemap.xml — investigating.',
      'Customer asked about enterprise limits — replied with docs.',
    ],
    development: [
      'Deploying functions to australia-southeast2 in 10 minutes.',
      'Feature flag for NeuroSEO cache is now enabled.',
    ],
    announcements: [
      'Release 4.0 goes live tonight at 8pm AEST.',
      'All-hands on Friday to review Q3 roadmap.',
    ],
    random: [
      'Friday meme thread starts here 😄',
      'Coffee recommendations near the office?',
    ],
  };

  let total = 0;
  for (const [channelId, texts] of Object.entries(messagesByChannel)) {
    for (const content of texts) {
      await msgs.add({ content, ...base(channelId) });
      total++;
    }
  }
  console.log(`Seeded ${total} chat messages across ${Object.keys(messagesByChannel).length} channels`);
}

async function enrichProjects() {
  // Ensure sample fields exist on existing projects
  const snap = await db.collection('projects').where('teamId', '==', TEAM_ID).get();
  if (snap.empty) {
    console.log('No projects found to enrich for team:', TEAM_ID);
    return;
  }
  const updates = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const enriched = {
      status: data.status || 'active',
      priority: data.priority || 'medium',
      assignedMembers: data.assignedMembers || [ADMIN_EMAIL],
      keywords: data.keywords || [],
      targetUrls: data.targetUrls || [],
      createdAt: data.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      deadline: data.deadline || null,
      progress: typeof data.progress === 'number' ? data.progress : 10,
      metrics: data.metrics || {
        totalKeywords: 0,
        rankedKeywords: 0,
        avgPosition: 0,
        trafficIncrease: 0,
      },
    };
    updates.push(db.collection('projects').doc(docSnap.id).set(enriched, { merge: true }));
  }
  await Promise.all(updates);
  console.log(`Enriched ${updates.length} project(s)`);
}

async function run() {
  await seedReport();
  await seedChat();
  await enrichProjects();
  console.log('Seed complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
