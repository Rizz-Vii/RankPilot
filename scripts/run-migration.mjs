#!/usr/bin/env node
/**
 * Database Migration Runner - Executable Script
 * Fixes critical activity schema conflicts in production database
 */

// Import required modules using dynamic imports for Node.js compatibility
async function runMigration() {
  try {
    console.log("🚨 STARTING CRITICAL DATABASE MIGRATION...\n");

    // Dynamic import to handle ES modules in Node.js
    const { fixActivitySchemaConflicts } = await import(
      "./fix-activity-schema-conflicts.js"
    );

    await fixActivitySchemaConflicts();

    console.log("\n✅ DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("❌ MIGRATION FAILED:", error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration };
