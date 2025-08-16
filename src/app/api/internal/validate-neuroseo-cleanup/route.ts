import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Wave 7: NeuroSEO Large Documents Cleanup Validation API
 * 
 * Validates that no large SEO documents remain in Firestore collections.
 * Used by CI tests to ensure migration cleanup is complete.
 * 
 * Query Parameters:
 * - collection: Collection name to validate
 * - threshold: Size threshold in bytes (default: 2500)
 * - maxDocs: Maximum documents to check (default: 100)
 * 
 * Returns:
 * - totalDocs: Number of documents checked
 * - largeDocsCount: Number of documents over threshold
 * - unmigratedDocsCount: Number of documents with migrated:false
 * - sampleLargeDocs: Sample of large document IDs for debugging
 */

interface ValidationResult {
  totalDocs: number;
  largeDocsCount: number;
  unmigratedDocsCount: number;
  sampleLargeDocs: Array<{ id: string; size: number }>;
  collection: string;
  threshold: number;
}

function approxSize(obj: any): number {
  try {
    return Buffer.byteLength(JSON.stringify(obj));
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const threshold = parseInt(searchParams.get('threshold') || '2500', 10);
    const maxDocs = parseInt(searchParams.get('maxDocs') || '100', 10);

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection parameter is required' },
        { status: 400 }
      );
    }

    // Validate collection name to prevent injection
    const allowedCollections = [
      'semanticMapResults',
      'neuralCrawlerResults', 
      'semanticMapResultsAgg',
      'neuralCrawlerResultsAgg',
      'neuroSeoAnalyses'
    ];

    if (!allowedCollections.includes(collection)) {
      return NextResponse.json(
        { error: 'Invalid collection name' },
        { status: 400 }
      );
    }

    console.log(`[validate-neuroseo-cleanup] Checking collection=${collection} threshold=${threshold} maxDocs=${maxDocs}`);

    const snapshot = await adminDb.collection(collection).limit(maxDocs).get();
    
    let totalDocs = 0;
    let largeDocsCount = 0;
    let unmigratedDocsCount = 0;
    const sampleLargeDocs: Array<{ id: string; size: number }> = [];

    snapshot.forEach((doc) => {
      totalDocs++;
      const data = doc.data();
      const size = approxSize(data);

      // Check if document is over size threshold
      if (size > threshold) {
        largeDocsCount++;
        if (sampleLargeDocs.length < 5) {
          sampleLargeDocs.push({ id: doc.id, size });
        }
      }

      // Check for unmigrated flag
      if (data.migrated === false) {
        unmigratedDocsCount++;
      }
    });

    const result: ValidationResult = {
      totalDocs,
      largeDocsCount,
      unmigratedDocsCount,
      sampleLargeDocs,
      collection,
      threshold
    };

    console.log(`[validate-neuroseo-cleanup] Result: ${JSON.stringify(result)}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[validate-neuroseo-cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}