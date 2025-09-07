// Firestore debug team seeder for all tiers
// Usage: node scripts/firestore-debug-team-seed.js

const serviceAccount = require("../serviceAccount.json");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = getFirestore();

const TEAM_ID = "debug-team-001";
const PROJECTS = [
  { id: "project1", name: "SEO Audit", description: "SEO Audit Project" },
  {
    id: "project2",
    name: "Content Plan",
    description: "Content Planning Project",
  },
];
const INTEGRATIONS = [
  { id: "slack", name: "Slack", status: "connected" },
  { id: "zapier", name: "Zapier", status: "disconnected" },
];
const USERS = [
  {
    userId: "Y0hv244mtsYk4dwsxBCS1xBOhab2",
    name: "Starter User",
    email: "starter@rankpilot.com",
    role: "starter",
  },
  {
    userId: "agencyUserId",
    name: "Agency User",
    email: "agency@rankpilot.com",
    role: "agency",
  },
  {
    userId: "m7nbs1tNrxYIlaclebE5sKI6ok53",
    name: "Enterprise User",
    email: "enterprise@rankpilot.com",
    role: "enterprise",
  },
  {
    userId: "UFGrzIf2N3UTPd5Xz7vT8tMZpHJ3",
    name: "Admin User",
    email: "admin@rankpilot.com",
    role: "admin",
  },
];

async function seed() {
  // Create projects
  for (const project of PROJECTS) {
    await db
      .collection("projects")
      .doc(project.id)
      .set(
        {
          ...project,
          teamId: TEAM_ID,
          // Optional owner for owner-based rules; tie to admin user in this seed
          userId: "UFGrzIf2N3UTPd5Xz7vT8tMZpHJ3",
        },
        { merge: true }
      );
  }
  // Create integrations
  for (const integration of INTEGRATIONS) {
    await db
      .collection("integrations")
      .doc(integration.id)
      .set(integration, { merge: true });
  }
  // Create team
  await db
    .collection("teams")
    .doc(TEAM_ID)
    .set(
      {
        id: TEAM_ID,
        name: "Debug All-Tiers Team",
        description: "Team for cross-tier feature debugging.",
        projects: PROJECTS.map((p) => p.id),
        integrations: INTEGRATIONS,
        members: USERS,
        memberIds: USERS.map((u) => u.userId),
      },
      { merge: true }
    );
  // Create users
  for (const user of USERS) {
    // Set subscriptionTier and subscriptionStatus for correct dashboard access
    let subscriptionTier = "free";
    if (user.email === "starter@rankpilot.com") subscriptionTier = "starter";
    if (user.email === "agency@rankpilot.com") subscriptionTier = "agency";
    if (user.email === "enterprise@rankpilot.com")
      subscriptionTier = "enterprise";
    if (user.email === "admin@rankpilot.com") subscriptionTier = "admin";

    await db.collection("users").doc(user.userId).set(
      {
        email: user.email,
        role: user.role,
        name: user.name,
        teamId: TEAM_ID,
        subscriptionTier,
        subscriptionStatus: "active",
      },
      { merge: true }
    );
  }
  console.log("Debug team, users, projects, and integrations seeded.");
}

seed().catch(console.error);
