/**
 * Updated Unified Authentication Script - Resolves User Creation Conflicts
 * 
 * Creates Firebase Auth users that match our unified test configuration.
 * Replaces create-auth-users.ts with consistent user management.
 * 
 * Generated: July 26, 2025
 * Integration: Unified test users, Firestore documents, enhanced auth service
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import {
    UNIFIED_TEST_USERS,
    DEV_USER,
    createFirestoreUserDoc,
    type UnifiedTestUser
} from "../testing/config/unified-test-users";

// Load environment variables
dotenv.config({ path: ".env.test" });

// Initialize Firebase Admin
if (!getApps().length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
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
const firestore = getFirestore();

/**
 * Create unified test users in Firebase Auth and Firestore
 */
async function createUnifiedTestUsers() {
    console.log("🔧 Creating unified Firebase Auth and Firestore test users...");

    const allUsers = [...Object.values(UNIFIED_TEST_USERS), DEV_USER];

    for (const user of allUsers) {
        try {
            console.log(`\n📝 Processing user: ${user.displayName} (${user.email})`);

            // Check if user already exists in Auth
            let authUser;
            try {
                authUser = await auth.getUserByEmail(user.email);
                console.log(`  ✅ Auth user already exists: ${user.email} (UID: ${authUser.uid})`);
            } catch (_error: unknown) {
                if (error.code === 'auth/user-not-found') {
                    // Create new auth user
                    try {
                        authUser = await auth.createUser({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            password: user.password,
                            emailVerified: true, // Mark as verified for testing
                        });
                        console.log(`  ✅ Created Auth user: ${user.email} (UID: ${authUser.uid})`);
                    } catch (createError: unknown) {
                        if (createError.code === 'auth/uid-already-exists') {
                            // UID exists but email doesn't match, get by UID
                            authUser = await auth.getUser(user.uid);
                            console.log(`  ✅ Found existing user by UID: ${user.uid}`);
                        } else {
                            throw createError;
                        }
                    }
                } else {
                    throw error;
                }
            }

            // Use the actual UID from Firebase Auth for all operations
            const actualUid = authUser.uid;

            // Create or update Firestore document
            const userDoc = createFirestoreUserDoc(user);
            const userRef = firestore.collection('users').doc(actualUid);

            try {
                await userRef.set(userDoc, { merge: true });
                console.log(`  ✅ Created/updated Firestore document for: ${user.email} (UID: ${actualUid})`);
            } catch (firestoreError) {
                console.error(`  ❌ Failed to create Firestore document for ${user.email}:`, firestoreError);
            }

            // Set custom claims for enhanced auth service integration
            const customClaims = {
                role: user.role,
                tier: user.tier,
                subscriptionStatus: user.subscriptionStatus,
                isTestUser: true
            };

            try {
                await auth.setCustomUserClaims(actualUid, customClaims);
                console.log(`  ✅ Set custom claims for: ${user.email} (UID: ${actualUid})`);
            } catch (claimsError) {
                console.error(`  ⚠️ Failed to set custom claims for ${user.email}:`, claimsError);
            }

            // Create subscription document for paid tiers
            if (user.tier !== 'free') {
                const subscriptionDoc = {
                    userId: actualUid,
                    tier: user.tier,
                    status: user.subscriptionStatus,
                    stripeCustomerId: `test_customer_${actualUid}`,
                    stripeSubscriptionId: `test_sub_${actualUid}`,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    quotas: user.expectedQuotas,
                    isTestSubscription: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                try {
                    await firestore.collection('subscriptions').doc(actualUid).set(subscriptionDoc, { merge: true });
                    console.log(`  ✅ Created subscription document for: ${user.email} (UID: ${actualUid})`);
                } catch (subError) {
                    console.error(`  ⚠️ Failed to create subscription document for ${user.email}:`, subError);
                }
            }

            // Create usage tracking document
            const usageDoc = {
                userId: actualUid,
                currentPeriod: {
                    monthlyAnalyses: 0,
                    keywordTracking: 0,
                    competitorTracking: 0,
                    resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                quotas: user.expectedQuotas,
                isTestUser: true,
                lastUpdated: new Date()
            };

            try {
                await firestore.collection('usage').doc(actualUid).set(usageDoc, { merge: true });
                console.log(`  ✅ Created usage tracking document for: ${user.email} (UID: ${actualUid})`);
            } catch (usageError) {
                console.error(`  ⚠️ Failed to create usage document for ${user.email}:`, usageError);
            }

        } catch (_error: unknown) {
            console.error(`❌ Failed to process user ${user.email}:`, error.message);
        }
    }

    console.log("\n🎉 Unified test user creation completed!");
}

/**
 * Clean up existing test users before creating new ones
 */
async function cleanupExistingTestUsers() {
    console.log("🧹 Cleaning up existing test users...");

    const allUsers = [...Object.values(UNIFIED_TEST_USERS), DEV_USER];

    for (const user of allUsers) {
        try {
            // Delete from Auth
            try {
                await auth.deleteUser(user.uid);
                console.log(`  🗑️ Deleted Auth user: ${user.email}`);
            } catch (_error: unknown) {
                if (error.code !== 'auth/user-not-found') {
                    console.error(`  ⚠️ Failed to delete Auth user ${user.email}:`, error.message);
                }
            }

            // Delete Firestore documents
            const collections = ['users', 'subscriptions', 'usage'];
            for (const collection of collections) {
                try {
                    await firestore.collection(collection).doc(user.uid).delete();
                    console.log(`  🗑️ Deleted ${collection} document for: ${user.email}`);
                } catch (_error) {
                    // Document might not exist, which is fine
                }
            }

        } catch (_error: unknown) {
            console.error(`❌ Failed to cleanup user ${user.email}:`, error.message);
        }
    }

    console.log("✅ Cleanup completed!");
}

/**
 * Verify test users are properly configured
 */
async function verifyTestUsers() {
    console.log("\n🔍 Verifying test user configuration...");

    const allUsers = [...Object.values(UNIFIED_TEST_USERS), DEV_USER];
    let successCount = 0;

    for (const user of allUsers) {
        try {
            // Check Auth user by email to get actual UID
            const authUser = await auth.getUserByEmail(user.email);
            const actualUid = authUser.uid;

            // Check Firestore document using actual UID
            const userDoc = await firestore.collection('users').doc(actualUid).get();

            if (authUser && userDoc.exists) {
                const userData = userDoc.data();
                console.log(`  ✅ ${user.displayName}: Auth ✓, Firestore ✓, Tier: ${userData?.subscriptionTier}, UID: ${actualUid}`);
                successCount++;
            } else {
                console.log(`  ❌ ${user.displayName}: Missing data (UID: ${actualUid})`);
            }

        } catch (_error: unknown) {
            console.log(`  ❌ ${user.displayName}: ${error.message}`);
        }
    }

    console.log(`\n📊 Verification complete: ${successCount}/${allUsers.length} users properly configured`);

    if (successCount === allUsers.length) {
        console.log("🎉 All test users are ready for testing!");
    } else {
        console.log("⚠️ Some test users may need attention");
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'create';

    try {
        switch (command) {
            case 'cleanup':
                await cleanupExistingTestUsers();
                break;
            case 'create':
                await createUnifiedTestUsers();
                break;
            case 'verify':
                await verifyTestUsers();
                break;
            case 'reset':
                await cleanupExistingTestUsers();
                await createUnifiedTestUsers();
                await verifyTestUsers();
                break;
            default:
                console.log("Usage: npm run create-test-users [cleanup|create|verify|reset]");
                break;
        }
    } catch (_error) {
        console.error("❌ Script failed:", _error);
        process.exit(1);
    }
}

main();
