#!/usr/bin/env node
/**
 * Wave 7: Standalone NeuroSEO Large Documents Verification Script
 * 
 * This script validates that no large SEO documents remain in Firestore
 * after migration to aggregated documents. Can be run independently
 * of the full test suite for quick validation.
 * 
 * Usage:
 *   node scripts/verify-neuroseo-large-docs-cleanup.js
 *   THRESHOLD_BYTES=3000 node scripts/verify-neuroseo-large-docs-cleanup.js
 * 
 * Exit codes:
 *   0 - All validations passed
 *   1 - Large documents found (cleanup incomplete)
 *   2 - Script error
 */

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const COLLECTIONS_TO_CHECK = {
  'semanticMapResults': 'Legacy semantic map results (should be empty or small)',
  'neuralCrawlerResults': 'Legacy neural crawler results (should be empty or small)'
};

const AGGREGATE_COLLECTIONS = {
  'semanticMapResultsAgg': 'Aggregated semantic map results',
  'neuralCrawlerResultsAgg': 'Aggregated neural crawler results'
};

const DEFAULT_THRESHOLD = 2500;
const MAX_DOCS_PER_COLLECTION = 200;

function approxSize(obj) {
  try {
    return Buffer.byteLength(JSON.stringify(obj));
  } catch {
    return 0;
  }
}

async function validateCollection(db, collectionName, description, threshold) {
  console.log(`\n🔍 Checking ${collectionName}: ${description}`);
  
  try {
    const snapshot = await db.collection(collectionName).limit(MAX_DOCS_PER_COLLECTION).get();
    
    let totalDocs = 0;
    let largeDocsCount = 0;
    let unmigratedCount = 0;
    const largeDocs = [];
    
    snapshot.forEach((doc) => {
      totalDocs++;
      const data = doc.data();
      const size = approxSize(data);
      
      if (size > threshold) {
        largeDocsCount++;
        largeDocs.push({ id: doc.id, size });
      }
      
      if (data.migrated === false) {
        unmigratedCount++;
      }
    });
    
    console.log(`   📊 Total documents: ${totalDocs}`);
    console.log(`   📏 Documents over ${threshold} bytes: ${largeDocsCount}`);
    console.log(`   🔄 Unmigrated documents: ${unmigratedCount}`);
    
    if (largeDocsCount > 0) {
      console.log(`   ⚠️  Large documents found:`);
      largeDocs.slice(0, 5).forEach(doc => {
        console.log(`      - ${doc.id}: ${doc.size} bytes`);
      });
      if (largeDocs.length > 5) {
        console.log(`      ... and ${largeDocs.length - 5} more`);
      }
    }
    
    if (unmigratedCount > 0) {
      console.log(`   ⚠️  Found ${unmigratedCount} documents marked as unmigrated`);
    }
    
    return {
      collectionName,
      totalDocs,
      largeDocsCount,
      unmigratedCount,
      passed: largeDocsCount === 0 && unmigratedCount === 0
    };
    
  } catch (error) {
    console.error(`   ❌ Error checking ${collectionName}:`, error.message);
    return {
      collectionName,
      totalDocs: 0,
      largeDocsCount: 0,
      unmigratedCount: 0,
      passed: false,
      error: error.message
    };
  }
}

async function checkAggregateCollections(db) {
  console.log(`\n📈 Checking aggregate collections...`);
  
  for (const [collectionName, description] of Object.entries(AGGREGATE_COLLECTIONS)) {
    try {
      const snapshot = await db.collection(collectionName).limit(10).get();
      const count = snapshot.size;
      console.log(`   ✓ ${collectionName}: ${count} documents (${description})`);
      
      if (count === 0) {
        console.log(`   ⚠️  Warning: ${collectionName} is empty - migration may not be complete`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking ${collectionName}:`, error.message);
    }
  }
}

async function main() {
  const threshold = parseInt(process.env.THRESHOLD_BYTES || DEFAULT_THRESHOLD, 10);
  
  console.log(`🚀 NeuroSEO Large Documents Cleanup Verification`);
  console.log(`   Size threshold: ${threshold} bytes`);
  console.log(`   Max docs per collection: ${MAX_DOCS_PER_COLLECTION}`);
  
  // Initialize Firebase Admin
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();
  
  const results = [];
  let overallPassed = true;
  
  // Check legacy collections for large documents
  for (const [collectionName, description] of Object.entries(COLLECTIONS_TO_CHECK)) {
    const result = await validateCollection(db, collectionName, description, threshold);
    results.push(result);
    
    if (!result.passed) {
      overallPassed = false;
    }
  }
  
  // Check aggregate collections exist and have data
  await checkAggregateCollections(db);
  
  // Summary
  console.log(`\n📋 SUMMARY`);
  console.log(`===========`);
  
  let hasIssues = false;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} ${result.collectionName}`);
    
    if (!result.passed) {
      hasIssues = true;
      if (result.largeDocsCount > 0) {
        console.log(`      → ${result.largeDocsCount} large documents found`);
      }
      if (result.unmigratedCount > 0) {
        console.log(`      → ${result.unmigratedCount} unmigrated documents found`);
      }
      if (result.error) {
        console.log(`      → Error: ${result.error}`);
      }
    }
  });
  
  if (hasIssues) {
    console.log(`\n❌ CLEANUP INCOMPLETE: Large documents or unmigrated documents remain`);
    console.log(`\nNext steps:`);
    console.log(`   1. Run migration scripts if not completed`);
    console.log(`   2. Run pruning script: npm run prune:neuroseo-legacy`);
    console.log(`   3. Check adoption metrics: /api/health`);
    process.exit(1);
  } else {
    console.log(`\n✅ CLEANUP COMPLETE: No large documents found in legacy collections`);
    console.log(`\n🎉 Wave 7 validation passed - ready for production`);
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n💥 Script failed:', error);
  process.exit(2);
});