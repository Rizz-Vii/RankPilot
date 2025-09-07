/**
 * Simple Database Migration - Uses Next.js Environment
 * Executes via Next.js API route for proper Firebas    if (result.success) {
      console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!");
      console.log("  Total activities scanned: " + result.totalScanned);
      console.log("  Activities updated: " + result.updated);

      if (result.migrations.length > 0) {
        console.log("🔄 Migration details:");
        result.migrations.forEach(m => {
          console.log("  " + m.currentType + " → " + m.newType);
        });
      }tup
 */

const { execSync } = require("child_process");
const path = require("path");

async function runDatabaseMigration() {
  console.log("🚨 EXECUTING DATABASE MIGRATION VIA NEXT.JS...\n");

  try {
    // Create temporary API route for migration
    const migrationRoute = `
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

const ACTIVITY_TYPE_MIGRATION_MAP = {
  "SEO Audit": "audit",
  "Keyword Search": "keyword-research",
  "SERP View": "serp-analysis",
  "Competitor Analysis": "competitor-analysis",
  "Content Analysis": "content-analysis",
  "Content Brief Generation": "content-brief",
  "Link Analysis": "link-analysis",
};

export async function POST() {
  try {
    console.log("🚨 Starting activity schema migration...");

    const usersSnapshot = await getDocs(collection(db, "users"));
    const activitiesToUpdate = [];
    let totalActivitiesScanned = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const activitiesSnapshot = await getDocs(collection(db, "users", userId, "activities"));

      for (const activityDoc of activitiesSnapshot.docs) {
        totalActivitiesScanned++;
        const activityData = activityDoc.data();
        const currentType = activityData.type;
        const newType = ACTIVITY_TYPE_MIGRATION_MAP[currentType];

        if (newType && newType !== currentType) {
          activitiesToUpdate.push({
            userId,
            activityId: activityDoc.id,
            currentType,
            newType,
          });
        }
      }
    }

    if (activitiesToUpdate.length > 0) {
      const batch = writeBatch(db);

      for (const activity of activitiesToUpdate) {
        const activityRef = doc(db, "users", activity.userId, "activities", activity.activityId);
        batch.update(activityRef, {
          type: activity.newType,
          originalType: activity.currentType,
          schemaMigrationDate: new Date(),
        });
      }

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      totalScanned: totalActivitiesScanned,
      updated: activitiesToUpdate.length,
      migrations: activitiesToUpdate,
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

    // Write the temporary API route
    const fs = require("fs");
    const apiPath = path.join(
      process.cwd(),
      "src",
      "app",
      "api",
      "migrate-db",
      "route.ts"
    );
    const apiDir = path.dirname(apiPath);

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    fs.writeFileSync(apiPath, migrationRoute);
    console.log("📝 Created temporary migration API route");

    // Start Next.js dev server in background
    console.log("🚀 Starting Next.js server...");
    void execSync("npm run dev -- --port 3001 &", {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Execute migration via API call
    console.log("📡 Executing migration...");
    const response = await fetch("http://localhost:3001/api/migrate-db", {
      method: "POST",
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!");
      console.log(`  Total activities scanned: ${result.totalScanned}`);
      console.log(`  Activities updated: ${result.updated}`);

      if (result.migrations.length > 0) {
        console.log("🔄 Migration details:");
        result.migrations.forEach((m) => {
          console.log(`  ${m.currentType} → ${m.newType}`);
        });
      }
    } else {
      throw new Error(result.error);
    }

    // Cleanup
    fs.unlinkSync(apiPath);
    console.log("🧹 Cleaned up temporary files");
  } catch (error) {
    const msg =
      error && typeof error === "object" && "message" in error
        ? error.message
        : String(error);
    console.error("❌ Migration failed:", msg);
    process.exit(1);
  }
}

if (require.main === module) {
  runDatabaseMigration();
}

module.exports = { runDatabaseMigration };
