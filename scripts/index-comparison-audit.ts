#!/usr/bin/env npx ts-node

/**
 * RankPilot Firestore Index Audit & Comparison Tool
 * Compares local firestore.indexes.json with deployed Firebase indexes
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface FirestoreIndex {
    collectionGroup: string;
    queryScope: string;
    fields: Array<{
        fieldPath: string;
        order: string;
    }>;
}

interface IndexConfig {
    indexes: FirestoreIndex[];
    fieldOverrides?: Array<Record<string, unknown>>;
}

class IndexComparisonAuditor {
    private localIndexes: FirestoreIndex[] = [];
    private deployedIndexes: FirestoreIndex[] = [];

    async runAudit() {
        console.log('🔍 RankPilot Firestore Index Audit Starting...\n');

        // Load local indexes
        await this.loadLocalIndexes();

        // Load deployed indexes
        await this.loadDeployedIndexes();

        // Perform comparison
        await this.compareIndexes();

        console.log('\n✅ Index audit completed!');
    }

    private async loadLocalIndexes() {
        console.log('📁 Loading local firestore.indexes.json...');

        const indexPath = path.join(process.cwd(), 'firestore.indexes.json');

        if (!fs.existsSync(indexPath)) {
            throw new Error('firestore.indexes.json not found in project root');
        }

        const indexConfig: IndexConfig = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        this.localIndexes = indexConfig.indexes || [];

        console.log(`✅ Loaded ${this.localIndexes.length} local indexes`);
    }

    private async loadDeployedIndexes() {
        console.log('🌩️  Loading deployed Firebase indexes...');

        try {
            const output = execSync('firebase firestore:indexes', {
                encoding: 'utf8',
                cwd: process.cwd()
            });

            const deployedConfig: IndexConfig = JSON.parse(output);
            this.deployedIndexes = deployedConfig.indexes || [];

            console.log(`✅ Loaded ${this.deployedIndexes.length} deployed indexes`);
        } catch (error: unknown) {
            const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : String(error);
            throw new Error(`Failed to fetch deployed indexes: ${msg}`);
        }
    } private async compareIndexes() {
        console.log('\n🔍 Comparing local vs deployed indexes...\n');

        // Create index signatures for easy comparison
        const localSignatures = new Set(this.localIndexes.map(idx => this.createIndexSignature(idx)));
        const deployedSignatures = new Set(this.deployedIndexes.map(idx => this.createIndexSignature(idx)));

        // Find differences
        const onlyLocal = this.localIndexes.filter(idx =>
            !deployedSignatures.has(this.createIndexSignature(idx))
        );

        const onlyDeployed = this.deployedIndexes.filter(idx =>
            !localSignatures.has(this.createIndexSignature(idx))
        );

        const matching = this.localIndexes.filter(idx =>
            deployedSignatures.has(this.createIndexSignature(idx))
        );

        // Display results
        console.log('📊 COMPARISON RESULTS:');
        console.log('========================\n');

        console.log(`✅ Matching Indexes: ${matching.length}`);
        console.log(`⚠️  Local Only: ${onlyLocal.length}`);
        console.log(`🌩️  Deployed Only: ${onlyDeployed.length}\n`);

        if (matching.length > 0) {
            console.log('✅ MATCHING INDEXES:');
            console.log('-------------------');
            matching.forEach(idx => {
                console.log(`  ✓ ${idx.collectionGroup}: ${this.getFieldsDescription(idx)}`);
            });
            console.log();
        }

        if (onlyLocal.length > 0) {
            console.log('⚠️  INDEXES ONLY IN LOCAL CONFIG (need deployment):');
            console.log('--------------------------------------------------');
            onlyLocal.forEach(idx => {
                console.log(`  📝 ${idx.collectionGroup}: ${this.getFieldsDescription(idx)}`);
            });
            console.log();
        }

        if (onlyDeployed.length > 0) {
            console.log('🌩️  INDEXES ONLY DEPLOYED (missing from local):');
            console.log('-----------------------------------------------');
            onlyDeployed.forEach(idx => {
                console.log(`  🔍 ${idx.collectionGroup}: ${this.getFieldsDescription(idx)}`);
            });
            console.log();
        }

        // Collection coverage analysis
        await this.analyzeCollectionCoverage();

        // Recommendations
        await this.generateRecommendations(onlyLocal, onlyDeployed);
    }

    private createIndexSignature(index: FirestoreIndex): string {
        const fields = index.fields
            .map(f => `${f.fieldPath}:${f.order}`)
            .join(',');
        return `${index.collectionGroup}|${fields}`;
    }

    private getFieldsDescription(index: FirestoreIndex): string {
        return index.fields
            .map(f => `${f.fieldPath} (${f.order.toLowerCase()})`)
            .join(', ');
    }

    private async analyzeCollectionCoverage() {
        console.log('📋 COLLECTION COVERAGE ANALYSIS:');
        console.log('================================');

        const expectedCollections = [
            'users', 'projects', 'teams', 'neuroSeoAnalyses', 'keywordResearch',
            'contentAnalyses', 'seoAudits', 'contentBriefs', 'competitorAnalyses',
            'serpData', 'linkAnalyses', 'activities', 'billing', 'usageTracking',
            'systemMetrics'
        ];

        const localCollections = new Set(this.localIndexes.map(idx => idx.collectionGroup));
        const deployedCollections = new Set(this.deployedIndexes.map(idx => idx.collectionGroup));

        expectedCollections.forEach(collection => {
            const hasLocal = localCollections.has(collection);
            const hasDeployed = deployedCollections.has(collection);

            const status = hasLocal && hasDeployed ? '✅' :
                hasLocal ? '⚠️' :
                    hasDeployed ? '🌩️' : '❌';

            const description = hasLocal && hasDeployed ? 'Fully Indexed' :
                hasLocal ? 'Local Only' :
                    hasDeployed ? 'Deployed Only' :
                        'No Indexes';

            console.log(`  ${status} ${collection}: ${description}`);
        });
        console.log();
    }

    private async generateRecommendations(onlyLocal: FirestoreIndex[], onlyDeployed: FirestoreIndex[]) {
        console.log('🎯 RECOMMENDATIONS:');
        console.log('==================');

        if (onlyLocal.length === 0 && onlyDeployed.length === 0) {
            console.log('🎉 Perfect! Local and deployed indexes are in complete sync.');
            console.log('   No action required - your 1.2M+ records are optimally indexed.');
        } else {
            if (onlyLocal.length > 0) {
                console.log('🚀 DEPLOY MISSING INDEXES:');
                console.log('   Run: firebase deploy --only firestore:indexes');
                console.log(`   This will deploy ${onlyLocal.length} missing indexes to production.`);
                console.log();
            }

            if (onlyDeployed.length > 0) {
                console.log('📝 UPDATE LOCAL CONFIG:');
                console.log('   Consider adding these deployed indexes to firestore.indexes.json:');
                onlyDeployed.forEach(idx => {
                    console.log(`   - ${idx.collectionGroup}: ${this.getFieldsDescription(idx)}`);
                });
                console.log();
            }
        }

        console.log('💡 PERFORMANCE NOTES:');
        console.log('   - With 1.2M+ records, proper indexing is critical');
        console.log('   - All query patterns should have corresponding indexes');
        console.log('   - Monitor query performance in Firebase Console');
    }
}

// Execute the audit
async function main() {
    try {
        const auditor = new IndexComparisonAuditor();
        await auditor.runAudit();
        process.exit(0);
    } catch (error) {
        console.error('❌ Index audit failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { IndexComparisonAuditor };
