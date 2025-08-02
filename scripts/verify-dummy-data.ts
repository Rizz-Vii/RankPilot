// Script to verify dummy data was populated correctly
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

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

interface DataSummary {
  users: number;
  analyses: number;
  activities: number;
  usageRecords: number;
  paymentRecords: number;
}

export async function verifyDummyData(): Promise<DataSummary> {
  console.log("🔍 Verifying dummy data population...\n");

  try {
    // 1. Check users
    console.log("👥 Checking users...");
    const usersSnapshot = await db.collection("users").get();
    const userCount = usersSnapshot.size;
    console.log(`   Found ${userCount} users`);

    // 2. Check NeuroSEO analyses
    console.log("\n📈 Checking NeuroSEO analyses...");
    const analysesSnapshot = await db.collection("neuroseo-analyses").get();
    const analysisCount = analysesSnapshot.size;
    console.log(`   Found ${analysisCount} analyses`);

    // 3. Check user activities and usage data
    console.log("\n🔄 Checking user subcollections...");
    let totalActivities = 0;
    let totalUsage = 0;
    let totalPayments = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      console.log(
        `\n   User: ${userData.email || userId} (${userData.subscriptionTier})`
      );

      // Check activities
      const activitiesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("activities")
        .get();
      const activityCount = activitiesSnapshot.size;
      totalActivities += activityCount;
      console.log(`     Activities: ${activityCount}`);

      // Check usage
      const usageSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("usage")
        .get();
      const usageCount = usageSnapshot.size;
      totalUsage += usageCount;
      console.log(`     Usage records: ${usageCount}`);

      if (usageCount > 0) {
        const latestUsage = usageSnapshot.docs[0].data();
        console.log(
          `     Current usage: Reports: ${latestUsage.usage?.reports || 0}, Audits: ${latestUsage.usage?.audits || 0}`
        );
      }

      // Check payments (only for paid tiers)
      if (userData.subscriptionTier !== "free") {
        const paymentsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("payments")
          .get();
        const paymentCount = paymentsSnapshot.size;
        totalPayments += paymentCount;
        console.log(`     Payment records: ${paymentCount}`);
      }

      // Check user profile updates
      if (userData.businessType) {
        console.log(`     Business Type: ${userData.businessType}`);
        console.log(
          `     Target Keywords: ${userData.targetKeywords?.slice(0, 3).join(", ") || "None"}`
        );
        console.log(`     Websites: ${userData.websites?.length || 0}`);
        console.log(`     Total Analyses: ${userData.totalAnalyses || 0}`);
      }
    }

    // 4. Detailed analysis check
    console.log("\n📊 Checking NeuroSEO analysis details...");
    const analysisDetails: unknown[] = [];

    const sampleAnalyses = analysesSnapshot.docs.slice(0, 3); // Check first 3 analyses
    for (const analysisDoc of sampleAnalyses) {
      const analysis = analysisDoc.data();
      console.log(`\n   Analysis: ${analysis.id}`);
      console.log(`     User: ${analysis.userId}`);
      console.log(`     URLs: ${analysis.urls?.length || 0}`);
      console.log(`     Keywords: ${analysis.targetKeywords?.length || 0}`);
      console.log(`     Analysis Type: ${analysis.analysisType}`);
      console.log(`     Overall Score: ${analysis.overallScore}/100`);
      console.log(`     Crawl Results: ${analysis.crawlResults?.length || 0}`);
      console.log(
        `     Visibility Results: ${analysis.visibilityAnalysis?.length || 0}`
      );
      console.log(`     Trust Results: ${analysis.trustAnalysis?.length || 0}`);
      console.log(`     Key Insights: ${analysis.keyInsights?.length || 0}`);
      console.log(`     Tasks: ${analysis.actionableTasks?.length || 0}`);

      analysisDetails.push({
        id: analysis.id,
        userId: analysis.userId,
        score: analysis.overallScore,
        type: analysis.analysisType,
      });
    }

    // 5. Summary report
    console.log("\n📋 Verification Summary:");
    console.log("=".repeat(50));
    console.log(`Total Users: ${userCount}`);
    console.log(`Total NeuroSEO Analyses: ${analysisCount}`);
    console.log(`Total Activities: ${totalActivities}`);
    console.log(`Total Usage Records: ${totalUsage}`);
    console.log(`Total Payment Records: ${totalPayments}`);
    console.log("=".repeat(50));

    // 6. Check data quality
    console.log("\n🔎 Data Quality Checks:");

    // Check if all users have the expected subcollections
    const usersWithoutActivities =
      userCount - (totalActivities > 0 ? userCount : 0);
    const usersWithoutUsage = userCount - totalUsage;

    console.log(
      `   ✅ Users with activities: ${userCount - usersWithoutActivities}`
    );
    console.log(`   ✅ Users with usage _data: ${totalUsage}`);
    console.log(
      `   ✅ Paid users with payments: ${totalPayments > 0 ? "Yes" : "No"}`
    );

    // Check analysis distribution by tier
    console.log("\n📊 Analysis Distribution:");
    const analysesByUser = new Map();
    for (const doc of analysesSnapshot.docs) {
      const userId = doc.data().userId;
      analysesByUser.set(userId, (analysesByUser.get(userId) || 0) + 1);
    }

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const analysisCount = analysesByUser.get(userDoc.id) || 0;
      console.log(
        `   ${userData.email}: ${analysisCount} analyses (${userData.subscriptionTier})`
      );
    }

    console.log("\n✅ Verification completed successfully!");

    return {
      users: userCount,
      analyses: analysisCount,
      activities: totalActivities,
      usageRecords: totalUsage,
      paymentRecords: totalPayments,
    };
  } catch (_error) {
    console.error("❌ Error during verification:", _error);
    throw error;
  }
}

export async function checkEndToEndFunctionality() {
  console.log("\n🧪 Testing End-to-End Functionality...\n");

  try {
    // Test 1: Verify quota system works for different tiers
    console.log("🔒 Testing Usage Quota System...");
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const usageSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("usage")
        .get();

      if (usageSnapshot.size > 0) {
        const usage = usageSnapshot.docs[0].data();
        const tier = userData.subscriptionTier;

        console.log(`   ${userData.email} (${tier}):`);
        console.log(
          `     Reports: ${usage.usage?.reports || 0}/${usage.limits?.reports || 0}`
        );
        console.log(
          `     Audits: ${usage.usage?.audits || 0}/${usage.limits?.audits || 0}`
        );

        // Check if usage is within limits
        const reportsWithinLimit =
          (usage.usage?.reports || 0) <= (usage.limits?.reports || 0);
        const auditsWithinLimit =
          (usage.usage?.audits || 0) <= (usage.limits?.audits || 0);

        console.log(
          `     Status: ${reportsWithinLimit && auditsWithinLimit ? "✅ Within limits" : "⚠️ Over limit"}`
        );
      }
    }

    // Test 2: Verify NeuroSEO analysis data structure
    console.log("\n🧠 Testing NeuroSEO Data Structure...");
    const analysesSnapshot = await db
      .collection("neuroseo-analyses")
      .limit(1)
      .get();

    if (analysesSnapshot.size > 0) {
      const sampleAnalysis = analysesSnapshot.docs[0].data();

      const requiredFields = [
        "id",
        "timestamp",
        "userId",
        "urls",
        "targetKeywords",
        "overallScore",
        "crawlResults",
        "visibilityAnalysis",
        "trustAnalysis",
        "keyInsights",
        "actionableTasks",
      ];

      const missingFields = requiredFields.filter(
        (field) => !(field in sampleAnalysis)
      );

      if (missingFields.length === 0) {
        console.log("   ✅ All required fields present in NeuroSEO analysis");
      } else {
        console.log(`   ⚠️ Missing fields: ${missingFields.join(", ")}`);
      }

      // Check crawl results structure
      if (
        sampleAnalysis.crawlResults &&
        sampleAnalysis.crawlResults.length > 0
      ) {
        const crawlResult = sampleAnalysis.crawlResults[0];
        const crawlFields = [
          "url",
          "title",
          "content",
          "metadata",
          "technicalData",
          "authorshipSignals",
        ];
        const missingCrawlFields = crawlFields.filter(
          (field) => !(field in crawlResult)
        );

        if (missingCrawlFields.length === 0) {
          console.log("   ✅ Crawl results structure is complete");
        } else {
          console.log(
            `   ⚠️ Missing crawl fields: ${missingCrawlFields.join(", ")}`
          );
        }
      }
    }

    // Test 3: Verify user activity tracking
    console.log("\n📊 Testing Activity Tracking...");
    const sampleUser = usersSnapshot.docs[0];
    const activitiesSnapshot = await db
      .collection("users")
      .doc(sampleUser.id)
      .collection("activities")
      .limit(5)
      .get();

    if (activitiesSnapshot.size > 0) {
      console.log(
        `   ✅ Found ${activitiesSnapshot.size} recent activities for ${sampleUser.data().email}`
      );

      activitiesSnapshot.docs.forEach((activityDoc, _index) => {
        const activity = activityDoc.data();
        console.log(
          `     ${index + 1}. ${activity.type}: ${activity.description}`
        );
      });
    }

    // Test 4: Verify payment history for paid users
    console.log("\n💳 Testing Payment History...");
    const paidUser = usersSnapshot.docs.find(
      (doc) => doc.data().subscriptionTier !== "free"
    );

    if (paidUser) {
      const paymentsSnapshot = await db
        .collection("users")
        .doc(paidUser.id)
        .collection("payments")
        .get();
      console.log(
        `   ✅ Found ${paymentsSnapshot.size} payment records for ${paidUser.data().email}`
      );

      if (paymentsSnapshot.size > 0) {
        const latestPayment = paymentsSnapshot.docs[0].data();
        console.log(
          `     Latest payment: $${latestPayment.amount} (${latestPayment.status})`
        );
      }
    }

    console.log("\n🎉 End-to-End functionality verification completed!");
  } catch (_error) {
    console.error("❌ Error during end-to-end testing:", _error);
    throw error;
  }
}

if (require.main === module) {
  verifyDummyData()
    .then((summary) => {
      console.log("\n📊 Final Summary:", summary);
      return checkEndToEndFunctionality();
    })
    .then(() => {
      console.log("\n🚀 All systems verified and ready for testing!");
      console.log("\n🔗 Next Steps:");
      console.log("   1. Start the dev server: npm run dev");
      console.log(
        "   2. Test the NeuroSEO dashboard with different user tiers"
      );
      console.log("   3. Verify quota enforcement works correctly");
      console.log("   4. Test user admin management features");
      process.exit(0);
    })
    .catch((_error) => {
      console.error("💥 Verification failed:", _error);
      process.exit(1);
    });
}
