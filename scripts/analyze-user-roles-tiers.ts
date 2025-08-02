/**
 * Script to analyze user roles and tiers in Firebase database
 * This will help us understand the current data structure and identify inconsistencies
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface UserData {
  id: string;
  email?: string;
  role?: string;
  tier?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  displayName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

async function analyzeUserRolesAndTiers() {
  console.log("🔍 Analyzing user roles and tiers in Firebase database...\n");

  try {
    const usersCollection = collection(db, "users");
    const snapshot = await getDocs(usersCollection);

    const users: UserData[] = [];
    const roleStats: Record<string, number> = {};
    const tierStats: Record<string, number> = {};
    const subscriptionTierStats: Record<string, number> = {};
    const statusStats: Record<string, number> = {};

    console.log(`📊 Found ${snapshot.size} users in database\n`);

    snapshot.forEach((doc) => {
      const userData = doc.data() as UserData;
      userData.id = doc.id;
      users.push(userData);

      // Count roles
      const role = userData.role || "none";
      roleStats[role] = (roleStats[role] || 0) + 1;

      // Count tiers
      const tier = userData.tier || "none";
      tierStats[tier] = (tierStats[tier] || 0) + 1;

      // Count subscription tiers
      const subscriptionTier = userData.subscriptionTier || "none";
      subscriptionTierStats[subscriptionTier] =
        (subscriptionTierStats[subscriptionTier] || 0) + 1;

      // Count subscription status
      const status = userData.subscriptionStatus || "none";
      statusStats[status] = (statusStats[status] || 0) + 1;
    });

    // Print statistics
    console.log("📊 ROLE DISTRIBUTION:");
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });

    console.log("\n📊 TIER DISTRIBUTION:");
    Object.entries(tierStats).forEach(([tier, count]) => {
      console.log(`   ${tier}: ${count} users`);
    });

    console.log("\n📊 SUBSCRIPTION TIER DISTRIBUTION:");
    Object.entries(subscriptionTierStats).forEach(([tier, count]) => {
      console.log(`   ${tier}: ${count} users`);
    });

    console.log("\n📊 SUBSCRIPTION STATUS DISTRIBUTION:");
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} users`);
    });

    // Print detailed user information
    console.log("\n👥 DETAILED USER INFORMATION:");
    console.log("=".repeat(80));

    users.forEach((user, _index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email || "N/A"}`);
      console.log(`   Display Name: ${user.displayName || "N/A"}`);
      console.log(`   Role: ${user.role || "N/A"}`);
      console.log(`   Tier: ${user.tier || "N/A"}`);
      console.log(`   Subscription Tier: ${user.subscriptionTier || "N/A"}`);
      console.log(
        `   Subscription Status: ${user.subscriptionStatus || "N/A"}`
      );

      // Check for inconsistencies
      const inconsistencies = [];
      if (
        user.tier &&
        user.subscriptionTier &&
        user.tier !== user.subscriptionTier
      ) {
        inconsistencies.push(
          `tier (${user.tier}) ≠ subscriptionTier (${user.subscriptionTier})`
        );
      }

      if (inconsistencies.length > 0) {
        console.log(`   ⚠️  INCONSISTENCIES: ${inconsistencies.join(", ")}`);
      }
    });

    // Identify test users from our TEST_USERS object
    const testUserEmails = [
      "abbas_ali_rizvi@hotmail.com",
      "admin.user1@test.com",
      "enterprise.user1@test.com",
      "starter.user1@test.com",
      "free.user1@test.com",
    ];

    console.log("\n🧪 TEST USER ANALYSIS:");
    console.log("=".repeat(80));

    testUserEmails.forEach((email) => {
      const user = users.find((u) => u.email === email);
      if (user) {
        console.log(`\n✅ ${email} (ID: ${user.id})`);
        console.log(`   Role: ${user.role || "N/A"}`);
        console.log(`   Tier: ${user.tier || "N/A"}`);
        console.log(`   Subscription Tier: ${user.subscriptionTier || "N/A"}`);
        console.log(`   Status: ${user.subscriptionStatus || "N/A"}`);
      } else {
        console.log(`\n❌ ${email} - NOT FOUND IN DATABASE`);
      }
    });

    // Check for optimal test configuration
    console.log("\n🎯 RECOMMENDATIONS FOR TESTING:");
    console.log("=".repeat(80));

    const recommendations = [];

    // Check if we have proper tier coverage
    const requiredTiers = ["free", "starter", "agency", "enterprise"];
    const availableTiers = Object.keys(subscriptionTierStats).filter(
      (tier) => tier !== "none"
    );

    requiredTiers.forEach((tier) => {
      if (!availableTiers.includes(tier)) {
        recommendations.push(`Create user with subscriptionTier: ${tier}`);
      }
    });

    // Check if we have admin role
    if (!roleStats.admin) {
      recommendations.push("Create user with role: admin");
    }

    if (recommendations.length > 0) {
      console.log("\n📝 Recommended actions:");
      recommendations.forEach((rec, _index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    } else {
      console.log("\n✅ Database appears to have good coverage for testing");
    }

    console.log("\n✅ Analysis complete!");
  } catch (_error) {
    console.error("❌ Error analyzing users:", _error);
  }
}

// Run the analysis
analyzeUserRolesAndTiers();
