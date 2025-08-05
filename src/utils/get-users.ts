// Direct User Retrieval from Your Project
// src/utils/get-users.ts

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FirestoreUser {
  uid: string;
  email?: string;
  role?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionMetadata?: unknown;
  createdAt?: unknown;
  lastLoginAt?: unknown;
  [_key: string]: unknown;
}

export async function getAllUsers(): Promise<{
  users: FirestoreUser[];
  summary: {
    total: number;
    complete: number;
    incomplete: number;
  };
  incompleteUsers: FirestoreUser[];
}> {
  try {
    console.log("🔍 Retrieving all users from Firestore...");

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      console.log("❌ No users found in Firestore");
      return {
        users: [],
        summary: { total: 0, complete: 0, incomplete: 0 },
        incompleteUsers: [],
      };
    }

    const users: FirestoreUser[] = [];
    const incompleteUsers: FirestoreUser[] = [];

    snapshot.forEach((doc) => {
      const userData = doc.data();
      const user: FirestoreUser = {
        uid: doc.id,
        ...userData,
      };

      users.push(user);

      // Check if user has complete subscription structure
      const hasCompleteStructure = !!(
        userData.subscriptionTier &&
        userData.subscriptionStatus &&
        userData.subscriptionMetadata
      );

      if (!hasCompleteStructure) {
        incompleteUsers.push(user);
      }

      // Log user info
      console.log(`🔷 User: ${userData.email || "No email"}`);
      console.log(`  UID: ${doc.id}`);
      console.log(`  Role: ${userData.role || "Not set"}`);
      console.log(`  Tier: ${userData.subscriptionTier || "Not set"}`);
      console.log(`  Status: ${userData.subscriptionStatus || "Not set"}`);
      console.log(`  Complete: ${hasCompleteStructure ? "✅" : "❌"}`);
      console.log("─".repeat(40));
    });

    const summary = {
      total: users.length,
      complete: users.length - incompleteUsers.length,
      incomplete: incompleteUsers.length,
    };

    console.log("\n📊 SUMMARY:");
    console.log(`👥 Total Users: ${summary.total}`);
    console.log(`✅ Complete Documents: ${summary.complete}`);
    console.log(`❌ Incomplete Documents: ${summary.incomplete}`);

    if (incompleteUsers.length > 0) {
      console.log("\n🔧 Users needing migration:");
      incompleteUsers.forEach((user) => {
        console.log(`  • ${user.email || "No email"} (${user.uid})`);
      });
    }

    return {
      users,
      summary,
      incompleteUsers,
    };
  } catch (error) {
    console.error("❌ Error retrieving users:", error);
    throw error;
  }
}

// Usage example:
export async function displayAllUsers() {
  try {
    const { users, summary, incompleteUsers } = await getAllUsers();

    console.table(
      users.map((user) => ({
        UID: user.uid,
        Email: user.email || "Not set",
        Role: user.role || "Not set",
        Tier: user.subscriptionTier || "Not set",
        Status: user.subscriptionStatus || "Not set",
        Complete: !!(
          user.subscriptionTier &&
          user.subscriptionStatus &&
          user.subscriptionMetadata
        ),
      }))
    );

    return { users, summary, incompleteUsers };
  } catch (_error) {
    console.error("Error displaying users:", _error);
    return null;
  }
}

// Quick function to check specific user
export async function getUserById(uid: string): Promise<FirestoreUser | null> {
  try {
    const { users } = await getAllUsers();
    return users.find((user) => user.uid === uid) || null;
  } catch (_error) {
    console.error("Error getting user by ID:", _error);
    return null;
  }
}

// Console helper - run in browser dev tools
if (typeof window !== "undefined") {
  (window as unknown as { getAllUsers: typeof getAllUsers; displayAllUsers: typeof displayAllUsers; getUserById: typeof getUserById; }).getAllUsers = getAllUsers;
  (window as unknown as { getAllUsers: typeof getAllUsers; displayAllUsers: typeof displayAllUsers; getUserById: typeof getUserById; }).displayAllUsers = displayAllUsers;
  (window as unknown as { getAllUsers: typeof getAllUsers; displayAllUsers: typeof displayAllUsers; getUserById: typeof getUserById; }).getUserById = getUserById;
  console.log(
    "🚀 User utilities available: getAllUsers(), displayAllUsers(), getUserById()"
  );
}
