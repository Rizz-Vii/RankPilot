# NeuroSEO Migration Plan - Dual-Read Strategy

**Purpose:** Comprehensive migration plan for consolidating large NeuroSEO documents into the `neuroSeoAnalyses` aggregate collection.

**Version:** 1.0  
**Target Collections:** `neuroseo-analyses`, `neuroSeoAnalysis`, `semanticMapResults`, `neuralCrawlerResults`  
**Destination:** `neuroSeoAnalyses` (canonical aggregate collection)

## Migration Overview

### Strategy: Dual-Read with Progressive Cutover
1. **Phase 1:** Backfill aggregate collection from legacy sources
2. **Phase 2:** Enable dual-write (new analyses write to both legacy + aggregate)
3. **Phase 3:** Enable dual-read (read aggregate first, fallback to legacy)
4. **Phase 4:** Monitor and validate (ensure zero fallback rate)
5. **Phase 5:** Cut over to aggregate-only (disable legacy writes)
6. **Phase 6:** Archive legacy collections

### Timeline
- **Pre-migration checks:** 1-2 days
- **Backfill execution:** 2-5 days (depending on data volume)
- **Dual-write period:** 2-4 weeks
- **Dual-read monitoring:** 1-2 weeks
- **Legacy cleanup:** 1-2 weeks

## Pre-Migration Checks

### Data Inventory & Health Check
```bash
# 1. Count documents in each source collection
npm run scripts:inventory-neuroseo-sources

# 2. Analyze document size distribution
npm run scripts:analyze-neuroseo-sizes

# 3. Validate data quality
npm run scripts:validate-neuroseo-integrity

# 4. Check for orphaned documents
npm run scripts:check-neuroseo-orphans
```

### Environment Preparation
```bash
# 1. Create Firestore indexes for aggregate collection
npm run firebase:deploy-indexes

# 2. Validate schema mapping functions
npm run test:unit:neuroseo-derivation

# 3. Set up monitoring alerts
npm run scripts:setup-migration-monitoring

# 4. Create migration state tracking collection
npm run scripts:init-migration-state
```

### Pre-Migration Validation Checklist
- [ ] All source collections accessible and healthy
- [ ] Aggregate schema validation functions tested
- [ ] Firestore indexes created and active
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures documented and tested
- [ ] Migration state tracking initialized

## Phase 1: Backfill Execution

### Backfill Script Configuration
```bash
# Environment variables for backfill control
export MIGRATION_BATCH_SIZE=100          # Documents per batch
export MIGRATION_CONCURRENCY=3           # Parallel workers  
export MIGRATION_DRY_RUN=false          # Set true for testing
export MIGRATION_MAX_RETRIES=3          # Retry failed documents
export MIGRATION_RATE_LIMIT_MS=100      # Delay between batches
export MIGRATION_SIZE_THRESHOLD=2500    # Only migrate large docs
```

### Backfill Execution Steps
```bash
# 1. Start with dry run to validate
DRY_RUN=1 npm run migrate:neuroseo-aggregate

# 2. Execute actual backfill (idempotent, resumable)
npm run migrate:neuroseo-aggregate

# 3. Validate backfill results
npm run scripts:validate-backfill-results

# 4. Generate migration report
npm run scripts:generate-migration-report
```

### Backfill Progress Monitoring
```typescript
interface MigrationProgress {
  source: string;
  examined: number;
  migrated: number;
  skipped: number;
  errors: number;
  avgDocSizeReduction: number;
  estimatedTimeRemaining: number;
}
```

### Error Handling & Recovery
- **Document-level errors:** Log and continue, retry up to 3 times
- **Batch-level errors:** Pause, alert, manual intervention required
- **Schema validation errors:** Skip document, log for manual review
- **Size constraint violations:** Truncate arrays, preserve core data
- **Duplicate detection:** Use `hashKey` for idempotent operation

## Phase 2: Enable Dual-Write

### Implementation Strategy
```typescript
// Add to NeuroSEOSuite.persistReport()
async function persistReportDualWrite(report: NeuroSEOReport): Promise<void> {
  const aggregate = deriveNeuroSeoAggregate(report);
  
  // Write to canonical aggregate collection
  await adminDb.collection('neuroSeoAnalyses').doc(aggregate.analysisId).set(aggregate);
  
  // Continue writing to legacy format (if enabled)
  if (process.env.NEUROSEO_LEGACY_WRITE_ENABLED === 'true') {
    await this.persistReportLegacy(report);
  }
}
```

### Configuration Flags
```bash
# Feature flags for dual-write control
NEUROSEO_DUAL_WRITE_ENABLED=true          # Enable dual-write mode
NEUROSEO_LEGACY_WRITE_ENABLED=true        # Continue legacy writes
NEUROSEO_AGGREGATE_WRITE_ENABLED=true     # Enable aggregate writes
```

### Monitoring During Dual-Write
- **Write success rates:** Both legacy and aggregate writes
- **Write latency comparison:** Performance impact measurement
- **Data consistency checks:** Periodic validation between formats
- **Error rate monitoring:** Alert on write failures

## Phase 3: Enable Dual-Read

### Read Strategy Implementation
```typescript
async function fetchNeuroSeoAnalysis(userId: string, analysisId: string): Promise<NeuroSeoAggregate | null> {
  // Try aggregate collection first
  try {
    const aggregateDoc = await adminDb.collection('neuroSeoAnalyses').doc(analysisId).get();
    if (aggregateDoc.exists) {
      recordAggregateHit('neuroseo_analysis');
      return aggregateDoc.data() as NeuroSeoAggregate;
    }
  } catch (error) {
    logger.warn('aggregate.read.failed', { analysisId, error: error.message });
  }
  
  // Fallback to legacy collection
  for (const legacyCollection of ['neuroseo-analyses', 'neuroSeoAnalysis']) {
    try {
      const legacyDoc = await adminDb.collection(legacyCollection).doc(analysisId).get();
      if (legacyDoc.exists) {
        recordLegacyFallback('neuroseo_analysis', legacyCollection);
        // Optionally: trigger background migration of this document
        this.triggerBackgroundMigration(legacyCollection, analysisId);
        return this.transformLegacyToAggregate(legacyDoc.data());
      }
    } catch (error) {
      logger.warn('legacy.read.failed', { collection: legacyCollection, analysisId, error: error.message });
    }
  }
  
  return null;
}
```

### Configuration Flags
```bash
# Feature flags for dual-read control
NEUROSEO_DUAL_READ_ENABLED=true           # Enable dual-read mode
NEUROSEO_AGGREGATE_READ_ENABLED=true      # Read aggregate first
NEUROSEO_LEGACY_FALLBACK_ENABLED=true     # Fallback to legacy
NEUROSEO_BACKGROUND_MIGRATION_ENABLED=true # Auto-migrate on fallback
```

### Read Performance Monitoring
```typescript
interface ReadMetrics {
  aggregateHits: number;          // Successful aggregate reads
  legacyFallbacks: number;        // Fallback to legacy collections  
  aggregateReadLatency: number;   // Average read time from aggregate
  legacyReadLatency: number;      // Average fallback read time
  fallbackRate: number;          // Percentage of reads requiring fallback
  backgroundMigrations: number;   // Documents migrated on demand
}
```

## Phase 4: Monitoring & Validation

### Key Performance Indicators
1. **Fallback Rate:** Target < 5% after 2 weeks, < 1% after 4 weeks
2. **Read Latency:** Aggregate reads should be ≥20% faster than legacy
3. **Data Consistency:** 100% consistency between formats during dual-write
4. **Write Success Rate:** >99.9% for both aggregate and legacy writes
5. **Background Migration Rate:** Trend toward zero as coverage improves

### Monitoring Dashboard Metrics
```typescript
interface MigrationKPIs {
  coverage: {
    totalLegacyDocuments: number;
    migratedDocuments: number;
    coveragePercentage: number;
  };
  performance: {
    avgAggregateReadTime: number;
    avgLegacyReadTime: number;
    readSpeedupPercentage: number;
  };
  health: {
    fallbackRate: number;
    errorRate: number;
    dataInconsistencies: number;
  };
  migration: {
    remainingDocuments: number;
    migrationRate: number;
    estimatedCompletion: Date;
  };
}
```

### Validation Queries
```typescript
// Daily validation checks
async function validateMigrationHealth(): Promise<ValidationReport> {
  // 1. Check coverage metrics
  const coverage = await calculateMigrationCoverage();
  
  // 2. Sample data consistency between formats
  const consistency = await validateDataConsistency(100); // Sample 100 docs
  
  // 3. Monitor fallback patterns
  const fallbacks = await analyzeFallbackPatterns();
  
  // 4. Check for orphaned or corrupted documents
  const orphans = await detectOrphanedDocuments();
  
  return { coverage, consistency, fallbacks, orphans };
}
```

## Phase 5: Cut Over to Aggregate-Only

### Cutover Criteria
**All criteria must be met for at least 7 consecutive days:**
- Fallback rate < 1%
- Data consistency checks pass with 100% accuracy
- Read performance improvement ≥20%
- No critical errors in aggregate read path
- Background migration queue empty

### Cutover Process
```bash
# 1. Disable legacy writes (aggregate-only writes)
export NEUROSEO_LEGACY_WRITE_ENABLED=false

# 2. Monitor for 48 hours
npm run scripts:monitor-aggregate-only-writes

# 3. Disable legacy reads (aggregate-only reads)  
export NEUROSEO_LEGACY_FALLBACK_ENABLED=false

# 4. Monitor for 1 week
npm run scripts:monitor-aggregate-only-reads

# 5. Begin legacy collection archival
npm run scripts:archive-legacy-neuroseo-collections
```

### Rollback Triggers
**Immediate rollback if any of these occur:**
- Aggregate read success rate < 95%
- Data loss detected (missing documents in aggregate)
- Performance degradation > 50%
- Critical application errors related to aggregate reads

## Phase 6: Legacy Cleanup & Archival

### Archival Strategy
1. **Export legacy data:** Full backup before deletion
2. **Gradual deletion:** Delete in batches to monitor impact
3. **Index cleanup:** Remove legacy collection indexes
4. **Code cleanup:** Remove dual-read/write code paths

### Archival Commands
```bash
# 1. Export legacy collections for backup
npm run scripts:export-legacy-neuroseo-collections

# 2. Validate export completeness
npm run scripts:validate-legacy-exports

# 3. Delete legacy collections (gradual)
npm run scripts:delete-legacy-neuroseo-collections --batch-size=1000

# 4. Clean up legacy indexes
npm run scripts:cleanup-legacy-indexes

# 5. Remove feature flags and dual-path code
npm run scripts:cleanup-migration-code
```

## Rollback Procedures

### Emergency Rollback (Phase 2-3)
```bash
# 1. Immediately disable aggregate reads
export NEUROSEO_AGGREGATE_READ_ENABLED=false
export NEUROSEO_DUAL_READ_ENABLED=false

# 2. Revert to legacy-only operation
export NEUROSEO_LEGACY_FALLBACK_ENABLED=false
export NEUROSEO_LEGACY_WRITE_ENABLED=true

# 3. Validate legacy system health
npm run scripts:validate-legacy-system-health

# 4. Investigate and fix aggregate issues
npm run scripts:diagnose-aggregate-issues
```

### Partial Rollback (Phase 4-5)
```bash
# 1. Re-enable legacy fallback
export NEUROSEO_LEGACY_FALLBACK_ENABLED=true

# 2. Increase monitoring frequency
export MIGRATION_MONITORING_INTERVAL=30s

# 3. Trigger manual validation
npm run scripts:emergency-validation-check
```

### Complete Rollback (Phase 6)
```bash
# 1. Restore legacy collections from backup
npm run scripts:restore-legacy-collections

# 2. Revert code to pre-migration state
git checkout pre-migration-tag

# 3. Redeploy legacy system
npm run deploy:legacy-system

# 4. Validate full system restoration
npm run scripts:validate-complete-rollback
```

## Success Criteria

### Migration Success Indicators
- **100% data coverage:** All source documents successfully migrated
- **Size reduction achieved:** Average document size reduced by ≥60%
- **Performance improvement:** Read operations ≥20% faster
- **Zero data loss:** All critical data preserved in aggregate format
- **System stability:** No degradation in application performance
- **Clean cutover:** Successful removal of legacy dependencies

### Long-term Benefits
- **Reduced storage costs:** Smaller document sizes
- **Improved query performance:** Better indexes and data locality
- **Simplified data model:** Single canonical collection
- **Enhanced analytics:** Consistent aggregate metrics
- **Easier maintenance:** Reduced complexity in data access patterns

## Risk Mitigation

### High-Risk Scenarios
1. **Data corruption during migration**
   - Mitigation: Extensive validation, checksums, rollback procedures
2. **Performance degradation**
   - Mitigation: Gradual rollout, performance monitoring, quick rollback
3. **Application downtime**
   - Mitigation: Dual-read strategy, zero-downtime deployment
4. **Data inconsistency**
   - Mitigation: Continuous validation, consistency checks

### Monitoring & Alerting
- **Real-time metrics:** Dashboard with key migration KPIs
- **Automated alerts:** Threshold-based notifications for errors
- **Manual checkpoints:** Regular validation reports
- **Escalation procedures:** Clear chain of responsibility for issues

This migration plan ensures a safe, monitored transition to the aggregate schema while maintaining system reliability and data integrity throughout the process.