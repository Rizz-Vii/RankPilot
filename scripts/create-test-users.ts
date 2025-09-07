/**
 * Firebase Test User Creation Script
 *
 * Creates test users for role-based testing with proper subscription tiers
 * and access permissions in Firebase Authentication and Firestore.
 */

import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { TEST_USERS } from "../testing/utils/enhanced-auth";

// Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (avoid duplicate initialization)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  subscription: {
    tier: string;
    status: "active" | "inactive" | "trial";
    startDate: string;
    endDate?: string;
    features: string[];
  };
  createdAt: string;
  lastLogin?: string;
  testUser: boolean;
}

// Feature access configuration for each tier
const TIER_FEATURES: Record<string, string[]> = {
  free: ["dashboard_access", "basic_keyword_analysis", "limited_searches"],
  starter: [
    "dashboard_access",
    "keyword_analysis",
    "link_analysis",
    "serp_analysis",
    "basic_performance_metrics",
    "export_pdf",
  ],
  agency: [
    "dashboard_access",
    "keyword_analysis",
    "link_analysis",
    "serp_analysis",
    "performance_metrics",
    "competitor_analysis",
    "bulk_operations",
    "export_csv",
    "export_pdf",
  ],
  enterprise: [
    "dashboard_access",
    "keyword_analysis",
    "link_analysis",
    "serp_analysis",
    "performance_metrics",
    "competitor_analysis",
    "bulk_operations",
    "white_label",
    "api_access",
    "export_csv",
    "export_pdf",
    "priority_support",
  ],
  admin: [
    "dashboard_access",
    "keyword_analysis",
    "link_analysis",
    "serp_analysis",
    "performance_metrics",
    "competitor_analysis",
    "bulk_operations",
    "white_label",
    "api_access",
    "export_csv",
    "export_pdf",
    "priority_support",
    "admin_panel",
    "user_management",
    "system_settings",
  ],
};

async function createTestUser(userKey: string) {
  const user = TEST_USERS[userKey as keyof typeof TEST_USERS];

  if (!user) {
    throw new Error(`User configuration not found for key: ${userKey}`);
  }

  console.log(`🔐 Creating Firebase user: ${user.displayName} (${user.email})`);

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      user.email,
      user.password
    );
    const firebaseUser = userCredential.user;

    console.log(`✅ Firebase Auth user created: ${firebaseUser.uid}`);

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.tier,
      subscription: {
        tier: user.tier,
        status: "active",
        startDate: new Date().toISOString(),
        features: TIER_FEATURES[user.tier] || [],
      },
      createdAt: new Date().toISOString(),
      testUser: true,
    };

    // Save to Firestore users collection
    await setDoc(doc(db, "users", firebaseUser.uid), userProfile);
    console.log(`✅ User profile created in Firestore`);

    // Create subscription record
    const subscription = {
      userId: firebaseUser.uid,
      tier: user.tier,
      status: "active",
      startDate: new Date().toISOString(),
      features: TIER_FEATURES[user.tier] || [],
      testAccount: true,
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "subscriptions"), subscription);
    console.log(`✅ Subscription record created`);

    // Sign out the created user
    await signOut(auth);

    return {
      uid: firebaseUser.uid,
      email: user.email,
      role: user.tier,
      success: true,
    };
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "auth/email-already-in-use") {
      console.log(`⚠️ User ${user.email} already exists, updating profile...`);

      try {
        // Sign in and update existing user
        const userCredential = await signInWithEmailAndPassword(
          auth,
          user.email,
          user.password
        );
        const firebaseUser = userCredential.user;

        // Update Firestore profile
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.tier,
          subscription: {
            tier: user.tier,
            status: "active",
            startDate: new Date().toISOString(),
            features: TIER_FEATURES[user.tier] || [],
          },
          createdAt: new Date().toISOString(),
          testUser: true,
        };

        await setDoc(doc(db, "users", firebaseUser.uid), userProfile, {
          merge: true,
        });
        await signOut(auth);

        console.log(`✅ Updated existing user: ${user.email}`);
        return {
          uid: firebaseUser.uid,
          email: user.email,
          role: user.tier,
          success: true,
        };
      } catch (updateError: unknown) {
        const updateMsg =
          updateError &&
          typeof updateError === "object" &&
          "message" in updateError
            ? String((updateError as { message?: unknown }).message)
            : String(updateError);
        console.error(
          `❌ Failed to update existing user ${user.email}:`,
          updateMsg
        );
        return {
          email: user.email,
          role: user.tier,
          success: false,
          error: updateError,
        };
      }
    } else {
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : String(error);
      console.error(`❌ Failed to create user ${user.email}:`, msg);
      return {
        email: user.email,
        role: user.tier,
        success: false,
        error: error,
      };
    }
  }
}

async function createAllTestUsers() {
  console.log(`🚀 Starting Firebase test user creation...`);
  console.log(
    `📊 Creating users for roles: ${Object.keys(TEST_USERS).join(", ")}`
  );

  const results = [];

  for (const userKey of Object.keys(TEST_USERS)) {
    try {
      const result = await createTestUser(userKey);
      results.push(result);

      // Add delay between user creation to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to process user ${userKey}:`, error);
      results.push({
        role: userKey,
        success: false,
        error: error,
      });
    }
  }

  // Summary
  console.log(`\n📈 Test User Creation Summary:`);
  console.log(`=" ".repeat(50)`);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successfully created/updated: ${successful.length} users`);
  successful.forEach((user) => {
    const email = "email" in user ? user.email : "unknown";
    const role = "role" in user ? user.role : "unknown";
    console.log(`   - ${email} (${role})`);
  });

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} users`);
    failed.forEach((user) => {
      const identifier =
        "email" in user ? user.email : "role" in user ? user.role : "unknown";
      const errorMsg = user.error?.message || "Unknown error";
      console.log(`   - ${identifier}: ${errorMsg}`);
    });
  }

  console.log(`\n🎯 Ready for role-based testing!`);
  console.log(`Run: npm run test:role-based`);

  return results;
}

// CLI execution
if (require.main === module) {
  createAllTestUsers()
    .then(() => {
      console.log(`\n✅ Test user creation completed`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`\n❌ Test user creation failed:`, error);
      process.exit(1);
    });
}

export { createAllTestUsers, createTestUser, TIER_FEATURES };
