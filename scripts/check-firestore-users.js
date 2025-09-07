const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "rankpilot-h3jpc",
  });
}

const db = admin.firestore();

async function checkUsers() {
  try {
    console.log("🔍 Checking Firestore users collection...");

    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("❌ No users found in Firestore users collection");
      return;
    }

    console.log(`✅ Found ${usersSnapshot.size} users in Firestore:`);
    console.log("");

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`👤 User ID: ${doc.id}`);
      console.log(`   Email: ${userData.email || "N/A"}`);
      console.log(
        `   Subscription Tier: ${userData.subscriptionTier || "N/A"}`
      );
      console.log(
        `   Created: ${userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toISOString() : "N/A"}`
      );
      console.log(
        `   Last Active: ${userData.lastActiveAt ? new Date(userData.lastActiveAt.seconds * 1000).toISOString() : "N/A"}`
      );
      console.log("   ---");
    });
  } catch (error) {
    console.error("❌ Error checking users:", error.message);
  }
}

checkUsers()
  .then(() => {
    console.log("✅ User check complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
