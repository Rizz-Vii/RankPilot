/**
 * Script to identify and correct user subscription tiers
 * This script will find users with old tier names and update them to new ones
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* diagnostics removed during lint remediation */

// Mapping from old tier names to new tier names
const TIER_MIGRATION_MAP: Record<string, string> = {
  starter: "professional",
  agency: "enterprise",
  // Keep existing valid tiers
  free: "free",
  professional: "professional",
  enterprise: "enterprise",
};

interface UserSubscriptionData {
  id: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  updatedAt?: unknown;
}

export async function identifyAndCorrectUserTiers(): Promise<void> {
  try {
    console.log("🔍 Starting user tier identification and correction...");

    // Get all users from Firestore
    const usersCollection = collection(db, "users");
    const snapshot = await getDocs(usersCollection);

    const usersToUpdate: UserSubscriptionData[] = [];
    const userStats = {
      total: 0,
      free: 0,
      professional: 0,
      enterprise: 0,
      outdatedTiers: 0,
      starter: 0,
      agency: 0,
      unknown: 0,
    };

    console.log(`📊 Found ${snapshot.size} total users`);

    // Analyze all users
    snapshot.forEach((docSnap) => {
      const userData = docSnap.data() as Record<string, unknown>;
      const userId = docSnap.id;

      userStats.total++;

      const currentTier =
        typeof userData.subscriptionTier === "string"
          ? userData.subscriptionTier
          : "free";
      const email =
        typeof userData.email === "string" ? userData.email : "unknown";

      // Count current tier distribution
      switch (currentTier) {
        case "free":
          userStats.free++;
          break;
        case "professional":
          userStats.professional++;
          break;
        case "enterprise":
          userStats.enterprise++;
          break;
        case "starter":
          userStats.starter++;
          userStats.outdatedTiers++;
          usersToUpdate.push({
            id: userId,
            email,
            subscriptionTier: currentTier,
            subscriptionStatus:
              typeof userData.subscriptionStatus === "string"
                ? userData.subscriptionStatus
                : "free",
          });
          break;
        case "agency":
          userStats.agency++;
          userStats.outdatedTiers++;
          usersToUpdate.push({
            id: userId,
            email,
            subscriptionTier: currentTier,
            subscriptionStatus:
              typeof userData.subscriptionStatus === "string"
                ? userData.subscriptionStatus
                : "free",
          });
          break;
        default:
          userStats.unknown++;
          console.warn(
            `❓ Unknown tier found: ${currentTier} for user ${email}`
          );
          break;
      }
    });

    // Print statistics
    console.log("\n📈 Current User Tier Distribution:");
    console.log(`  Free: ${userStats.free} users`);
    console.log(`  Professional: ${userStats.professional} users`);
    console.log(`  Enterprise: ${userStats.enterprise} users`);
    console.log(`  Starter (outdated): ${userStats.starter} users`);
    console.log(`  Agency (outdated): ${userStats.agency} users`);
    console.log(`  Unknown tiers: ${userStats.unknown} users`);
    console.log(`  Total outdated tiers: ${userStats.outdatedTiers} users`);

    if (usersToUpdate.length === 0) {
      console.log("✅ No users need tier corrections!");
      return;
    }

    console.log(
      `\n🔧 Updating ${usersToUpdate.length} users with outdated tiers...`
    );

    // Update users with outdated tiers
    for (const user of usersToUpdate) {
      const newTier =
        TIER_MIGRATION_MAP[
          user.subscriptionTier as keyof typeof TIER_MIGRATION_MAP
        ];

      if (newTier && newTier !== user.subscriptionTier) {
        console.log(
          `  Updating ${user.email}: ${user.subscriptionTier} → ${newTier}`
        );

        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          subscriptionTier: newTier,
          updatedAt: new Date(),
          tierMigrationDate: new Date(),
          previousTier: user.subscriptionTier,
        });
      }
    }

    console.log("✅ User tier correction completed!");

    // Final verification
    await verifyTierCorrections();
  } catch (error) {
    console.error("❌ Error during tier identification and correction:", error);
    throw error;
  }
}

async function verifyTierCorrections(): Promise<void> {
  console.log("\n🔍 Verifying tier corrections...");

  try {
    const usersCollection = collection(db, "users");
    const snapshot = await getDocs(usersCollection);

    const finalStats = {
      free: 0,
      professional: 0,
      enterprise: 0,
      outdated: 0,
      unknown: 0,
    };

    snapshot.forEach((docSnap) => {
      const userData = docSnap.data() as Record<string, unknown>;
      const currentTier =
        typeof userData.subscriptionTier === "string"
          ? userData.subscriptionTier
          : "free";

      switch (currentTier) {
        case "free":
          finalStats.free++;
          break;
        case "professional":
          finalStats.professional++;
          break;
        case "enterprise":
          finalStats.enterprise++;
          break;
        case "starter":
        case "agency":
          finalStats.outdated++;
          break;
        default:
          finalStats.unknown++;
          break;
      }
    });

    console.log("📊 Final Tier Distribution:");
    console.log(`  Free: ${finalStats.free} users`);
    console.log(`  Professional: ${finalStats.professional} users`);
    console.log(`  Enterprise: ${finalStats.enterprise} users`);
    console.log(`  Remaining outdated: ${finalStats.outdated} users`);
    console.log(`  Unknown: ${finalStats.unknown} users`);

    if (finalStats.outdated === 0) {
      console.log("✅ All tiers successfully updated!");
    } else {
      console.warn(
        `⚠️  ${finalStats.outdated} users still have outdated tiers`
      );
    }
  } catch (error) {
    console.error("❌ Error during verification:", error);
  }
}

// Export the function for use in admin interface or scripts
export { TIER_MIGRATION_MAP };
