// Admin User Management Script
// This script helps diagnose and fix admin user access issues

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../src/lib/firebase";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "user";
  subscriptionTier: string;
  subscriptionStatus: string;
  displayName?: string;
  createdAt?: any;
}

export async function diagnoseAdminUsers() {
  console.log("🔍 Diagnosing admin user configurations...\n");

  try {
    // Find all users with admin role
    const usersRef = collection(db, "users");
    const adminQuery = query(usersRef, where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminQuery);

    console.log(`Found ${adminSnapshot.size} admin users:\n`);

    const adminUsers: UserProfile[] = [];

    adminSnapshot.forEach((doc) => {
      const userData = doc.data() as UserProfile;
      userData.uid = doc.id;
      adminUsers.push(userData);

      console.log(`👤 Admin User: ${userData.email}`);
      console.log(`   - UID: ${userData.uid}`);
      console.log(`   - Role: ${userData.role}`);
      console.log(
        `   - Subscription Tier: ${userData.subscriptionTier || "not set"}`
      );
      console.log(
        `   - Subscription Status: ${userData.subscriptionStatus || "not set"}`
      );
      console.log(`   - Display Name: ${userData.displayName || "not set"}`);
      console.log("");
    });

    // Also check for users with admin tier (incorrect configuration)
    const adminTierQuery = query(
      usersRef,
      where("subscriptionTier", "==", "admin")
    );
    const adminTierSnapshot = await getDocs(adminTierQuery);

    if (adminTierSnapshot.size > 0) {
      console.log(
        `⚠️  Found ${adminTierSnapshot.size} users with tier="admin" (should be role="admin" + tier="enterprise"):\n`
      );

      adminTierSnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log(`👤 User with admin tier: ${userData.email}`);
        console.log(`   - UID: ${doc.id}`);
        console.log(`   - Role: ${userData.role || "not set"}`);
        console.log(`   - Tier: ${userData.subscriptionTier}`);
        console.log("");
      });
    }

    return {
      adminUsers,
      adminTierUsers: adminTierSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })),
    };
  } catch (error) {
    console.error("❌ Error diagnosing admin users:", error);
    throw error;
  }
}

export async function fixAdminUserConfiguration(userEmail: string) {
  console.log(`🔧 Fixing admin configuration for: ${userEmail}\n`);

  try {
    // Find user by email
    const usersRef = collection(db, "users");
    const emailQuery = query(usersRef, where("email", "==", userEmail));
    const userSnapshot = await getDocs(emailQuery);

    if (userSnapshot.empty) {
      console.log(`❌ User not found: ${userEmail}`);
      return false;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    console.log("Current configuration:");
    console.log(`   - Role: ${userData.role || "not set"}`);
    console.log(
      `   - Subscription Tier: ${userData.subscriptionTier || "not set"}`
    );
    console.log(
      `   - Subscription Status: ${userData.subscriptionStatus || "not set"}`
    );

    // Fix admin user configuration
    const updatedData = {
      role: "admin",
      subscriptionTier: "enterprise", // Admin users get enterprise-level features
      subscriptionStatus: "active",
      updatedAt: new Date(),
    };

    await updateDoc(userDoc.ref, updatedData);

    console.log("\n✅ Updated configuration:");
    console.log(`   - Role: admin`);
    console.log(`   - Subscription Tier: enterprise`);
    console.log(`   - Subscription Status: active`);
    console.log("\n🎉 Admin user configuration fixed!");

    return true;
  } catch (error) {
    console.error("❌ Error fixing admin user:", error);
    throw error;
  }
}

export async function createAdminUser(
  email: string,
  displayName: string = "Admin User"
) {
  console.log(`🚀 Creating admin user: ${email}\n`);

  try {
    // Check if user already exists
    const usersRef = collection(db, "users");
    const emailQuery = query(usersRef, where("email", "==", email));
    const existingUser = await getDocs(emailQuery);

    if (!existingUser.empty) {
      console.log(`⚠️  User already exists: ${email}`);
      return await fixAdminUserConfiguration(email);
    }

    // Create new admin user document
    const adminUserData = {
      email,
      displayName,
      role: "admin",
      subscriptionTier: "enterprise",
      subscriptionStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate a document with auto-ID
    const newUserRef = doc(collection(db, "users"));
    await setDoc(newUserRef, adminUserData);

    console.log("✅ Admin user created successfully:");
    console.log(`   - UID: ${newUserRef.id}`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Role: admin`);
    console.log(`   - Tier: enterprise`);

    return true;
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    throw error;
  }
}

// Quick fix for the most common admin users
export async function quickFixKnownAdmins() {
  const knownAdminEmails = [
    "admin@rankpilot.com",
    "admin.enterprise@test.com",
    "admin@test.com",
  ];

  console.log("🔧 Quick fix for known admin emails...\n");

  for (const email of knownAdminEmails) {
    try {
      await fixAdminUserConfiguration(email);
      console.log(`✅ Fixed: ${email}\n`);
    } catch (error) {
      console.log(`❌ Failed to fix ${email}: ${error}\n`);
    }
  }

  console.log("🎉 Quick fix complete!");
}

// Export for console usage
if (typeof window !== "undefined") {
  (window as any).adminUserUtils = {
    diagnoseAdminUsers,
    fixAdminUserConfiguration,
    createAdminUser,
    quickFixKnownAdmins,
  };
}
