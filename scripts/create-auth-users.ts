// Script to create Firebase Auth users for testing
import * as dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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

const auth = getAuth();

// Test users to create
const testUsers = [
  {
    uid: "test-free-user-1",
    email: "free.user1@test.com",
    displayName: "Free User 1",
    password: "testPassword123",
  },
  {
    uid: "test-admin-free",
    email: "admin.free@test.com",
    displayName: "Admin Free",
    password: "testPassword123",
  },
  {
    uid: "test-starter-user-1",
    email: "starter.user1@test.com",
    displayName: "Starter User 1",
    password: "testPassword123",
  },
  {
    uid: "test-agency-user-1",
    email: "agency.user1@test.com",
    displayName: "Agency User 1",
    password: "testPassword123",
  },
  {
    uid: "test-enterprise-user-1",
    email: "enterprise.user1@test.com",
    displayName: "Enterprise User 1",
    password: "testPassword123",
  },
  {
    uid: "test-admin-enterprise",
    email: "admin.enterprise@test.com",
    displayName: "Admin Enterprise",
    password: "testPassword123",
  },
];

async function createTestUsers() {
  console.log("🔧 Creating Firebase Auth test users...");

  for (const user of testUsers) {
    try {
      // Check if user already exists
      try {
        const existingUser = await auth.getUser(user.uid);
        console.log(
          `   ✅ User ${user.email} already exists (UID: ${existingUser.uid})`
        );
        continue;
      } catch (error: unknown) {
        // User doesn't exist, we can create it (only swallow not-found)
        const code = (error && typeof error === 'object' && 'code' in error)
          ? String((error as { code?: unknown }).code)
          : undefined;
        if (code !== "auth/user-not-found") {
          throw error;
        }
      }

      // Create the user
      const userRecord = await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        password: user.password,
        emailVerified: true, // Set to verified for testing
      });

      console.log(`   ✅ Created user: ${user.email} (UID: ${userRecord.uid})`);
    } catch (error: unknown) {
      const msg = (error && typeof error === 'object' && 'message' in error)
        ? String((error as { message?: unknown }).message)
        : String(error);
      console.error(
        `   ❌ Failed to create user ${user.email}:`,
        msg
      );
    }
  }

  console.log("🎉 Firebase Auth user creation completed!");
}

async function main() {
  try {
    await createTestUsers();
  } catch (error) {
    console.error("❌ Error creating test users:", error);
    process.exit(1);
  }
}

main();
