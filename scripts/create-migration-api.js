// Database migration script - Simple approach
const path = require("path");
const fs = require("fs");

console.log("🚨 Creating migration API endpoint...");

// Create API route content
const apiContent = `import { NextRequest, NextResponse } from 'next/server';
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

// Create directory and file
const apiDir = path.join(process.cwd(), "src", "app", "api", "migrate-db");
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

fs.writeFileSync(path.join(apiDir, "route.ts"), apiContent);

console.log("✅ Migration API created at: /api/migrate-db");
console.log("📋 Next steps:");
console.log("  1. npm run dev");
console.log("  2. Visit http://localhost:3000/api/migrate-db (POST request)");
console.log("  3. Check browser console for migration results");
