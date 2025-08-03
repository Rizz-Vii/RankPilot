import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/index";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";

const ACTIVITY_TYPE_MIGRATION_MAP: Record<string, string> = {
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
      const activitiesSnapshot = await getDocs(
        collection(db, "users", userId, "activities")
      );

      for (const activityDoc of activitiesSnapshot.docs) {
        totalActivitiesScanned++;
        const activityData = activityDoc.data();
        const currentType = activityData.type as string;
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
        const activityRef = doc(
          db,
          "users",
          activity.userId,
          "activities",
          activity.activityId
        );
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown migration error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
