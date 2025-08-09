// Quick Firestore inspector for a user and team
// Usage:
//   node scripts/inspect-firestore-docs.js <uid> [teamId]
// Defaults:
//   teamId = "debug-team-001"

/* eslint-disable no-console */

const path = require("path");
const fs = require("fs");

let serviceAccountPath = path.resolve(__dirname, "../serviceAccount.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("serviceAccount.json not found at:", serviceAccountPath);
  process.exit(1);
}

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const [,, uidArg, teamIdArg] = process.argv;
if (!uidArg) {
  console.error("Missing <uid>.\nUsage: node scripts/inspect-firestore-docs.js <uid> [teamId]");
  process.exit(1);
}
const TEAM_ID = teamIdArg || "debug-team-001";

const serviceAccount = require(serviceAccountPath);
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore();

typeof (async () => {
  try {
    console.log("\n=== Firestore Inspection ===");
    console.log("User UID:", uidArg);
    console.log("Team ID:", TEAM_ID);

    // Fetch user
    const userRef = db.collection("users").doc(uidArg);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      console.warn("[WARN] users/" + uidArg + " does not exist.");
    } else {
      const userData = userSnap.data();
      console.log("\nusers/" + uidArg + ":", JSON.stringify(userData, null, 2));
    }

    // Fetch team
    const teamRef = db.collection("teams").doc(TEAM_ID);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      console.warn("[WARN] teams/" + TEAM_ID + " does not exist.");
    } else {
      const teamData = teamSnap.data();
      // Summarize membership
      const memberIds = Array.isArray(teamData.memberIds) ? teamData.memberIds : [];
      const members = Array.isArray(teamData.members) ? teamData.members : [];
      const hasUidInMemberIds = memberIds.includes(uidArg);
      const hasUidInMembers = members.some(m => m && (m.userId === uidArg));
      const projects = Array.isArray(teamData.projects) ? teamData.projects : [];
      const integrations = Array.isArray(teamData.integrations) ? teamData.integrations : [];

      console.log("\nteams/" + TEAM_ID + " summary:");
      console.log("- name:", teamData.name);
      console.log("- description:", teamData.description);
      console.log("- memberIds.length:", memberIds.length, "contains uid?", hasUidInMemberIds);
      console.log("- members.length:", members.length, "contains uid?", hasUidInMembers);
      console.log("- projects:", projects);
      console.log("- integrations:", integrations.map(i => `${i.id}:${i.status}`).join(", "));

      if (!hasUidInMemberIds && !hasUidInMembers) {
        console.warn("[MISMATCH] UID not found in team membership. Team lookup via array-contains may fail.");
      }
    }

    // Query teams by memberIds
    const qSnap = await db.collection("teams").where("memberIds", "array-contains", uidArg).get();
    console.log("\nQuery teams where memberIds contains UID => matched:", qSnap.size);
    qSnap.forEach(d => console.log("  -", d.id));

    console.log("\nInspection complete.\n");
  } catch (err) {
    console.error("[ERROR]", err);
    process.exit(1);
  }
})();
