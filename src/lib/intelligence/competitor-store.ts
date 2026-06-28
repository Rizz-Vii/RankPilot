/**
 * Firestore-backed persistence for Competitive Intelligence.
 *
 * Replaces the previous in-memory `Map` storage in `FirecrawlCompetitiveIntelligence`, which lost
 * all competitor profiles and reports on every server restart / serverless cold start. Uses the
 * Admin SDK (`adminDb`) since this runs server-side from the competitive-intelligence API route.
 */

import { adminDb } from "@/lib/firebase-admin";
import type {
  CompetitiveAnalysisReport,
  CompetitorProfile,
} from "./firecrawl-competitive-intelligence";

const COMPETITORS_COLLECTION = "competitorProfiles";
const REPORTS_COLLECTION = "competitiveReports";

export async function saveCompetitor(
  profile: CompetitorProfile
): Promise<void> {
  await adminDb.collection(COMPETITORS_COLLECTION).doc(profile.id).set(profile);
}

export async function loadCompetitor(
  competitorId: string
): Promise<CompetitorProfile | undefined> {
  const snap = await adminDb
    .collection(COMPETITORS_COLLECTION)
    .doc(competitorId)
    .get();
  return snap.exists ? (snap.data() as CompetitorProfile) : undefined;
}

export async function loadUserCompetitors(
  userId: string
): Promise<CompetitorProfile[]> {
  const snap = await adminDb
    .collection(COMPETITORS_COLLECTION)
    .where("metadata.userId", "==", userId)
    .get();
  const competitors: CompetitorProfile[] = [];
  snap.forEach((doc) => competitors.push(doc.data() as CompetitorProfile));
  return competitors;
}

export async function deleteCompetitorDoc(competitorId: string): Promise<void> {
  await adminDb.collection(COMPETITORS_COLLECTION).doc(competitorId).delete();
}

export async function saveReport(
  report: CompetitiveAnalysisReport
): Promise<void> {
  await adminDb.collection(REPORTS_COLLECTION).doc(report.id).set(report);
}

export async function loadReport(
  reportId: string
): Promise<CompetitiveAnalysisReport | undefined> {
  const snap = await adminDb
    .collection(REPORTS_COLLECTION)
    .doc(reportId)
    .get();
  return snap.exists ? (snap.data() as CompetitiveAnalysisReport) : undefined;
}
