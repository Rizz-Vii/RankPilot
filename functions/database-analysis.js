const admin = require("firebase-admin");

// Initialize Firebase Admin with minimal configuration
admin.initializeApp({
  projectId: "rankpilot-h3jpc",
});

const db = admin.firestore();

async function analyzeDatabase() {
  console.log("🔍 RANKPILOT DATABASE ANALYSIS - PRODUCTION REVIEW\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const collections = [
    "users",
    "projects",
    "neuroSeoAnalyses",
    "keywordResearch",
    "contentAnalyses",
    "competitorAnalyses",
    "seoAudits",
    "linkAnalyses",
    "contentBriefs",
    "activities",
    "teams",
    "billing",
    "usageTracking",
    "systemMetrics",
    "serpData",
  ];

  let totalDocs = 0;
  let activeCollections = 0;
  const collectionData = [];

  for (const collectionName of collections) {
    try {
      console.log(`📊 Analyzing ${collectionName}...`);
      const snapshot = await db.collection(collectionName).get();
      const count = snapshot.size;

      if (count > 0) {
        activeCollections++;
        totalDocs += count;

        // Get sample document for structure analysis
        const firstDoc = snapshot.docs[0];
        const sampleData = firstDoc.data();
        const fields = Object.keys(sampleData);

        collectionData.push({
          name: collectionName,
          count,
          fields: fields.slice(0, 8), // Show first 8 fields
          hasMoreFields: fields.length > 8,
          totalFields: fields.length,
        });
      } else {
        collectionData.push({
          name: collectionName,
          count: 0,
          fields: [],
          hasMoreFields: false,
          totalFields: 0,
        });
      }
    } catch (error) {
      console.log(`❌ Error analyzing ${collectionName}: ${error.message}`);
      collectionData.push({
        name: collectionName,
        count: "ERROR",
        error: error.message,
        fields: [],
        hasMoreFields: false,
        totalFields: 0,
      });
    }
  }

  // Display results
  console.log("\n📋 COLLECTION SUMMARY:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  collectionData.forEach((collection) => {
    const status =
      collection.count === 0
        ? "🔄 EMPTY"
        : collection.count === "ERROR"
          ? "❌ ERROR"
          : "✅ ACTIVE";
    const countStr =
      collection.count === "ERROR" ? "ERROR" : collection.count.toString();

    console.log(
      `${status} ${collection.name.padEnd(20)} | ${countStr.padStart(8)} docs`
    );

    if (collection.fields.length > 0) {
      const fieldsStr = collection.fields.join(", ");
      const moreIndicator = collection.hasMoreFields
        ? ` (+${collection.totalFields - collection.fields.length} more)`
        : "";
      console.log(`   📋 Fields: ${fieldsStr}${moreIndicator}`);
    }

    if (collection.error) {
      console.log(`   ⚠️  Error: ${collection.error.slice(0, 60)}...`);
    }
    console.log("");
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 DATABASE HEALTH REPORT:");
  console.log(`├─ Database Location: australia-southeast2`);
  console.log(
    `├─ Active Collections: ${activeCollections}/${collections.length}`
  );
  console.log(`├─ Total Documents: ${totalDocs.toLocaleString()}`);
  console.log(
    `├─ Data Density: ${totalDocs > 0 ? "Production Ready" : "Development/Testing"}`
  );
  console.log(
    `└─ Overall Status: ${totalDocs > 0 ? "✅ OPERATIONAL" : "⚠️  NEEDS DATA"}`
  );

  // Additional insights
  if (totalDocs > 0) {
    console.log("\n🔍 KEY INSIGHTS:");
    const topCollections = collectionData
      .filter((c) => typeof c.count === "number" && c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (topCollections.length > 0) {
      console.log("Top Collections by Document Count:");
      topCollections.forEach((col, idx) => {
        console.log(`${idx + 1}. ${col.name}: ${col.count} documents`);
      });
    }
  }

  console.log("\n🚀 Analysis Complete - RankPilot Database Review Finished");
}

// Run the analysis
analyzeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Database analysis failed:", error);
    process.exit(1);
  });
