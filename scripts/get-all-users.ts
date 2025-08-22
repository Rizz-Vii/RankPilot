// Script to retrieve all users from Firestore
import * as dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load environment variables
dotenv.config({ path: ".env.test" });

// Initialize Firebase Admin
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "rankpilot-h3jpc";

  if (!privateKey || !clientEmail) {
    throw new Error("Missing Firebase Admin credentials in .env.test file");
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

const db = getFirestore();

interface UserData {
  id: string;
  email?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  role?: string;
  displayName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  nextBillingDate?: Date;
  [key: string]: unknown;
}

export async function getAllUsers() {
  try {
    console.log("🔍 Retrieving all users from database...");

    const usersSnapshot = await db.collection("users").get();
    const users: UserData[] = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate?.(),
        updatedAt: userData.updatedAt?.toDate?.(),
        lastLoginAt: userData.lastLoginAt?.toDate?.(),
        nextBillingDate: userData.nextBillingDate?.toDate?.(),
      });
    });

    console.log(`📊 Found ${users.length} users in database`);

    // Group by subscription tier
    const usersByTier: Record<string, UserData[]> = users.reduce(
      (acc, user) => {
        const tier = user.subscriptionTier || "free";
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(user);
        return acc;
      },
      {} as Record<string, UserData[]>
    );

    console.log("📈 Users by tier:");
    Object.entries(usersByTier).forEach(([tier, tierUsers]) => {
      console.log(`  ${tier}: ${tierUsers.length} users`);
    });

    return { users, usersByTier };
  } catch (error) {
    console.error("❌ Error retrieving users:", error);
    throw error;
  }
}

if (require.main === module) {
  getAllUsers()
    .then(({ users, usersByTier }) => {
      console.log("\n📋 User Details:");
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email || "No email"}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Tier: ${user.subscriptionTier || "free"}`);
        console.log(`   Status: ${user.subscriptionStatus || "free"}`);
        console.log(`   Role: ${user.role || "user"}`);
        console.log(`   Created: ${user.createdAt || "Unknown"}`);
        console.log(`   Last Login: ${user.lastLoginAt || "Never"}`);
      });

      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed to retrieve users:", error);
      process.exit(1);
    });
}
