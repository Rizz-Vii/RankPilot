# NeuroSEO Aggregate Schema Definition (Wave 4)

**Purpose:** Define the final aggregate document shape for `neuroSeoAnalyses` collection to consolidate large SEO analysis documents into compact, queryable aggregates.

**Schema Version:** 1.0  
**Collection:** `neuroSeoAnalyses`  
**Strategy:** Consolidate from multiple legacy sources into single canonical collection

## Required Fields

### Core Identification
- `userId` (string) - User who requested the analysis
- `analysisId` (string) - Unique analysis identifier (deterministic hash-based)
- `createdAt` (timestamp) - Analysis creation time
- `updatedAt` (timestamp) - Last modification time
- `schemaVersion` (number) - Schema version for migrations (default: 1)

### Analysis Request Context
- `urls` (string[]) - Analyzed URLs (max 10, normalized)
- `targetKeywords` (string[]) - Target keywords for analysis (max 25)
- `analysisType` (enum) - Type: 'comprehensive' | 'seo-focused' | 'content-focused' | 'competitive'

### Core Metrics (Aggregated)
- `overallScore` (number, 0-100) - Weighted composite score
- `seoAvg` (number, 0-100) - Average SEO score across analyzed pages
- `visibilityAvg` (number, 0-100) - Average AI visibility score
- `trustAvg` (number, 0-100) - Average E-A-T trust score
- `semanticAvg` (number, 0-100) - Average semantic relevance score
- `engagementAvg` (number, 0-100) - Average engagement potential score

### Technical Metrics (Aggregated)
- `avgLoadTime` (number) - Average page load time in milliseconds
- `avgWordCount` (number) - Average word count across pages
- `canonicalMismatchCount` (number) - Count of pages with canonical URL issues
- `crawlResultCount` (number) - Number of successfully crawled pages
- `totalImages` (number) - Total images across all pages
- `totalInternalLinks` (number) - Total internal links found
- `totalExternalLinks` (number) - Total external links found

## Optional Fields

### Competitive Analysis
- `competitorUrls` (string[]) - Competitor URLs analyzed (max 5)
- `competitiveRanking` (number) - Overall ranking vs competitors (1-based)
- `competitiveStrengths` (string[]) - Identified strengths (max 10)
- `competitiveWeaknesses` (string[]) - Identified weaknesses (max 10)
- `keywordGapCount` (number) - Number of missing high-value keywords

### Content Insights (Top Slices Only)
- `topKeywords` (object[]) - Top performing keywords (max 15)
  - `keyword` (string)
  - `relevanceScore` (number, 0-100)
  - `volume` (number, optional)
  - `opportunity` (string, optional)
- `topTopicClusters` (object[]) - Top semantic topic clusters (max 8)
  - `topic` (string)
  - `semanticScore` (number, 0-100)
  - `opportunity` (string)
- `keyInsights` (object[]) - Actionable insights (max 15)
  - `category` (enum) - 'seo' | 'content' | 'technical' | 'competitive' | 'trust'
  - `title` (string)
  - `impact` (enum) - 'critical' | 'high' | 'medium' | 'low'
  - `confidence` (number, 0-1)
  - `recommendation` (string)

### Trend Data (Historical Context)
- `trends` (object, optional)
  - `seoAvg` (number[]) - Recent SEO score history (max 10 points)
  - `visibilityAvg` (number[]) - Recent visibility score history (max 10 points)
  - `trustAvg` (number[]) - Recent trust score history (max 10 points)
  - `overallScore` (number[]) - Recent overall score history (max 10 points)

### Metadata
- `__provenance` (enum) - Data source: 'live' | 'synthetic' | 'migrated'
- `migratedFrom` (string, optional) - Source collection for migrated documents
- `migratedAt` (timestamp, optional) - Migration timestamp
- `hashKey` (string) - Deterministic hash for deduplication

## Forbidden Fields

**Never store these derived ratios or large arrays:**
- `ctr`, `roi`, `conversionRate` (derive at read time)
- Full `crawlResults[]` array (store counts only)
- Full `semanticAnalysis[]` array (store top slices only)
- Full `visibilityAnalysis[]` array (store averages only)
- Full `trustAnalysis[]` array (store averages only)
- Full `content` fields (store summaries and metrics only)
- Full `semanticGraph.nodes[]` or `semanticGraph.edges[]` (store counts only)

## Size Constraints

- **Target document size:** < 15KB per document
- **Maximum document size:** < 25KB per document
- **Array limits:** All arrays capped to prevent bloat
- **String limits:** Descriptions max 500 chars, titles max 100 chars

## Indexes

**Primary indexes:**
- `(userId, createdAt desc)` - User timeline queries
- `(hashKey)` - Deduplication and idempotent writes
- `(analysisType, createdAt desc)` - Analysis type filtering

**Secondary indexes (if needed):**
- `(userId, analysisType, createdAt desc)` - Filtered user queries
- `(overallScore desc, createdAt desc)` - Performance ranking

## Schema Evolution

**Version 1.0 (Current):**
- Initial aggregate schema
- Consolidates legacy neuroseo-analyses, neuroSeoAnalysis collections
- Includes competitive analysis and trend tracking

**Future considerations:**
- Version 1.1: Add AI model versioning fields
- Version 1.2: Enhanced semantic categorization
- Version 2.0: Split large competitive data into subcollections if needed

## Validation Rules

```typescript
const NeuroSeoAggregateSchema = z.object({
  // Required core fields
  userId: z.string().min(1),
  analysisId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  schemaVersion: z.number().default(1),
  
  // Request context
  urls: z.array(z.string().url()).min(1).max(10),
  targetKeywords: z.array(z.string()).max(25),
  analysisType: z.enum(['comprehensive', 'seo-focused', 'content-focused', 'competitive']),
  
  // Core metrics
  overallScore: z.number().min(0).max(100),
  seoAvg: z.number().min(0).max(100),
  visibilityAvg: z.number().min(0).max(100),
  trustAvg: z.number().min(0).max(100),
  semanticAvg: z.number().min(0).max(100),
  engagementAvg: z.number().min(0).max(100),
  
  // Technical metrics
  avgLoadTime: z.number().min(0),
  avgWordCount: z.number().min(0),
  canonicalMismatchCount: z.number().min(0),
  crawlResultCount: z.number().min(0),
  
  // Optional fields
  competitorUrls: z.array(z.string().url()).max(5).optional(),
  topKeywords: z.array(z.object({
    keyword: z.string(),
    relevanceScore: z.number().min(0).max(100),
    volume: z.number().optional(),
    opportunity: z.string().optional()
  })).max(15).optional(),
  
  // Metadata
  __provenance: z.enum(['live', 'synthetic', 'migrated']),
  hashKey: z.string(),
});
```

## Migration Compatibility

This schema is designed to accommodate data from:
- `neuroseo-analyses` (legacy collection)
- `neuroSeoAnalysis` (alternate legacy collection)  
- `semanticMapResults` (semantic analysis results)
- `neuralCrawlerResults` (crawler output)
- Live analysis results from `NeuroSEOSuite`

See [Migration Plan](./neuroseo-migration-plan.md) for detailed mapping and backfill procedures.