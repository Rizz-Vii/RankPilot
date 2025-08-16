// Snapshot Freshness Tracking (Wave 5)
// Tracks when KPI snapshots were last generated and calculates staleness

import { adminDb } from '@/lib/firebase-admin';

export interface SnapshotFreshnessResult {
  snapshotFreshnessHours: number | null;
  details: {
    lastSnapshotTime: string | null;
    staleness: 'fresh' | 'stale' | 'outdated';
    ageMs: number | null;
  } | null;
}

/**
 * Calculate hours since last KPI snapshot was taken
 * Returns null if no snapshot history available
 */
export async function calculateSnapshotFreshness(): Promise<SnapshotFreshnessResult> {
  try {
    // Look for the most recent KPI daily snapshot
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    // Check multiple sources for snapshot timestamps
    const [dailySnapshots, unifiedExports] = await Promise.all([
      // KPI daily snapshots
      adminDb.collection('kpiDaily')
        .where('date', 'in', [today, yesterday])
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get(),
      // Unified metrics exports (fallback)
      adminDb.collection('unifiedMetricsDaily')
        .where('date', 'in', [today, yesterday])
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get()
    ]);

    let lastSnapshotTime: Date | null = null;

    // Find the most recent snapshot
    if (!dailySnapshots.empty) {
      const doc = dailySnapshots.docs[0];
      const data = doc.data();
      if (data.timestamp) {
        lastSnapshotTime = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      }
    }

    // Fallback to unified metrics if no KPI snapshots
    if (!lastSnapshotTime && !unifiedExports.empty) {
      const doc = unifiedExports.docs[0];
      const data = doc.data();
      if (data.timestamp) {
        lastSnapshotTime = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      }
    }

    if (!lastSnapshotTime) {
      return { snapshotFreshnessHours: null, details: null };
    }

    const now = new Date();
    const ageMs = now.getTime() - lastSnapshotTime.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Determine staleness level
    let staleness: 'fresh' | 'stale' | 'outdated';
    if (ageHours <= 2) {
      staleness = 'fresh';
    } else if (ageHours <= 6) {
      staleness = 'stale';
    } else {
      staleness = 'outdated';
    }

    return {
      snapshotFreshnessHours: +ageHours.toFixed(2),
      details: {
        lastSnapshotTime: lastSnapshotTime.toISOString(),
        staleness,
        ageMs
      }
    };
  } catch (error) {
    console.error('Error calculating snapshot freshness:', error);
    return { snapshotFreshnessHours: null, details: null };
  }
}

/**
 * Update the snapshot timestamp to mark a fresh snapshot
 * Called whenever KPI snapshots are generated
 */
export async function recordSnapshotTimestamp(): Promise<void> {
  try {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    
    await adminDb.collection('kpiDaily').doc(dateKey).set({
      timestamp: now,
      date: dateKey,
      lastUpdate: now
    }, { merge: true });
  } catch (error) {
    console.error('Error recording snapshot timestamp:', error);
  }
}