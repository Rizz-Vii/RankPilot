# NeuroSEO Field Mapping Documentation

**Purpose:** Complete mapping from original large SEO document fields to `neuroSeoAnalyses` aggregate fields.

**Version:** 1.0  
**Date:** August 2025

## Source Collections

This mapping covers the following source collections:
- `neuroseo-analyses` (legacy primary)
- `neuroSeoAnalysis` (legacy secondary)  
- `semanticMapResults` (semantic analysis data)
- `neuralCrawlerResults` (crawler technical data)
- Live `NeuroSEOReport` objects

## Core Field Mappings

### Identity & Context Fields

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `userId` | `userId` | All | Direct copy | Required from all sources |
| `analysisId` | `id` OR computed | All | Hash-based if missing | `sha1(userId+urls+createdAt)` |
| `createdAt` | `createdAt` OR `timestamp` | All | Normalize to timestamp | Fallback to current time |
| `updatedAt` | `updatedAt` OR `createdAt` | All | Normalize to timestamp | Defaults to createdAt |
| `urls` | `urls` OR `url` | All | Array normalization | Single URL → array, limit 10 |
| `targetKeywords` | `targetKeywords` OR `keywords` | All | Array normalization | Limit to 25 keywords |
| `analysisType` | `analysisType` OR `request.analysisType` | All | Enum validation | Default: 'comprehensive' |

### Score Aggregations

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `overallScore` | `overallScore` | All | Direct copy | 0-100 scale |
| `seoAvg` | `seoAvg` OR derive from crawl | neuroseo-*, neuralCrawler | Average computation | From `seoMetrics.overallScore` |
| `visibilityAvg` | `visibilityAvg` OR derive | neuroseo-*, semanticMap | Average from visibility analysis | From `metrics.overallVisibilityScore` |
| `trustAvg` | `trustAvg` OR derive | neuroseo-*, all | Average from trust analysis | From `metrics.overallEATScore` |
| `semanticAvg` | `semanticAvg` OR derive | semanticMap, neuroseo-* | Average semantic relevance | From `overallRelevanceScore` |
| `engagementAvg` | `engagementAvg` OR derive | neuroseo-*, neuralCrawler | Computed from factors | Word count + load time + authorship |

### Technical Metrics Aggregations

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `avgLoadTime` | Computed | neuralCrawler, neuroseo-* | `avg(crawlResults[].technicalData.loadTime)` | Milliseconds |
| `avgWordCount` | Computed | neuralCrawler, neuroseo-* | `avg(crawlResults[].technicalData.wordCount)` | Words per page |
| `canonicalMismatchCount` | Computed | neuralCrawler, neuroseo-* | `count(crawlResults[].technicalData.canonicalMismatch)` | Boolean count |
| `crawlResultCount` | Computed | All | `length(crawlResults)` | Successful crawls |
| `totalImages` | Computed | neuralCrawler | `sum(images.length)` | Total image count |
| `totalInternalLinks` | Computed | neuralCrawler | `sum(links.filter(type='internal'))` | Internal link count |
| `totalExternalLinks` | Computed | neuralCrawler | `sum(links.filter(type='external'))` | External link count |

## Content Analysis Mappings

### Top Keywords (Array → Top Slice)

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `topKeywords[].keyword` | `keywordAnalysis[].keyword` | semanticMap | Top 15 by relevance | Sorted by semanticRelevance |
| `topKeywords[].relevanceScore` | `keywordAnalysis[].semanticRelevance` | semanticMap | Direct copy | 0-100 scale |
| `topKeywords[].volume` | `keywordAnalysis[].volume` | semanticMap | Optional copy | Search volume data |
| `topKeywords[].opportunity` | `keywordAnalysis[].opportunity` | semanticMap | Optional copy | Opportunity classification |

**Legacy compatibility:**
- `neuroseo-analyses.keywords[]` → Extract top keywords by position/volume
- `NeuroSEOReport.semanticAnalysis[]` → Aggregate across all semantic results

### Topic Clusters (Array → Top Slice)

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `topTopicClusters[].topic` | `topicClusters[].topic` | semanticMap | Top 8 by score | Sorted by semanticScore |
| `topTopicClusters[].semanticScore` | `topicClusters[].semanticScore` | semanticMap | Direct copy | 0-100 scale |
| `topTopicClusters[].opportunity` | `topicClusters[].opportunity` | semanticMap | Direct copy | Opportunity level |

### Key Insights (Array → Top Slice)

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `keyInsights[].category` | `keyInsights[].category` | neuroseo-* | Enum validation | seo/content/technical/competitive/trust |
| `keyInsights[].title` | `keyInsights[].title` | neuroseo-* | Truncate to 100 chars | Title normalization |
| `keyInsights[].impact` | `keyInsights[].impact` | neuroseo-* | Enum validation | critical/high/medium/low |
| `keyInsights[].confidence` | `keyInsights[].confidence` | neuroseo-* | Direct copy | 0-1 scale |
| `keyInsights[].recommendation` | `keyInsights[].recommendation` | neuroseo-* | Truncate to 500 chars | Action recommendation |

## Competitive Analysis Mappings

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `competitorUrls` | `competitorUrls` OR `request.competitorUrls` | neuroseo-* | Array limit 5 | URL validation |
| `competitiveRanking` | `competitivePositioning.overallRanking` | neuroseo-* | Direct copy | 1-based ranking |
| `competitiveStrengths` | `competitivePositioning.strengths` | neuroseo-* | Array limit 10 | String array |
| `competitiveWeaknesses` | `competitivePositioning.weaknesses` | neuroseo-* | Array limit 10 | String array |
| `keywordGapCount` | `competitivePositioning.keywordGap.missingKeywords.length` | neuroseo-* | Count computation | Missing opportunities |

## Trend Data Mappings

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `trends.seoAvg` | `trends.seoAvg` | neuroseo-* | Array limit 10 | Historical SEO scores |
| `trends.visibilityAvg` | `trends.visibilityAvg` | neuroseo-* | Array limit 10 | Historical visibility |
| `trends.trustAvg` | `trends.trustAvg` | neuroseo-* | Array limit 10 | Historical trust scores |
| `trends.overallScore` | `trends.overallScore` | neuroseo-* | Array limit 10 | Historical overall scores |

## Metadata & Provenance

| Aggregate Field | Source Field | Collection | Transform | Notes |
|-----------------|--------------|------------|-----------|--------|
| `__provenance` | Computed | All | Set based on source | 'migrated' for legacy data |
| `migratedFrom` | Source collection name | All | String identifier | e.g., 'neuroseo-analyses' |
| `migratedAt` | Migration timestamp | All | Current timestamp | When migration occurred |
| `hashKey` | Computed | All | Deterministic hash | `sha1(userId+urls+analysisType)` |

## Data Derivation Functions

### SEO Score Averaging
```typescript
function deriveSeoAvg(crawlResults: any[]): number {
  if (!crawlResults.length) return 0;
  const scores = crawlResults
    .map(r => r.seoMetrics?.overallScore || r.technicalData?.seoScore || 0)
    .filter(s => s > 0);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) || 0;
}
```

### Engagement Score Computation
```typescript
function deriveEngagementAvg(crawlResults: any[]): number {
  if (!crawlResults.length) return 0;
  const scores = crawlResults.map(r => {
    let score = 100;
    const tech = r.technicalData || {};
    const authorship = r.authorshipSignals || {};
    
    // Load time penalty
    if (tech.loadTime > 3000) score -= Math.min(25, Math.floor(tech.loadTime / 200));
    
    // Content depth factor
    if (tech.wordCount < 800) score -= (tech.wordCount < 400 ? 20 : 10);
    
    // Authorship signals
    if (!authorship.hasAuthorBio) score -= 5;
    if (!authorship.socialLinks?.length) score -= 3;
    
    // Technical issues
    if (tech.canonicalMismatch) score -= 4;
    
    return Math.max(0, Math.min(100, score));
  });
  
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}
```

### Hash Key Generation
```typescript
function generateHashKey(userId: string, urls: string[], analysisType: string): string {
  const payload = JSON.stringify({
    u: [...urls].sort(),
    t: analysisType || 'comprehensive',
    uid: userId
  });
  return createHash('sha1').update(payload).digest('hex').slice(0, 32);
}
```

## Excluded Large Fields

**These fields from source documents are NOT migrated to preserve size limits:**

### From `semanticMapResults`:
- `semanticGraph.nodes[]` (full node array) → Keep only `graphNodesCount`
- `semanticGraph.edges[]` (full edge array) → Keep only `graphEdgesCount`  
- `recommendations[]` (full array) → Keep only `recommendationsCount`
- Full `keywordAnalysis[]` → Keep only top 15 as `topKeywords`
- Full `topicClusters[]` → Keep only top 8 as `topTopicClusters`

### From `neuralCrawlerResults`:
- `content` (full page content) → Keep only metrics and counts
- `images[]` (full image array) → Keep only `totalImages` count
- `links[]` (full link array) → Keep only `totalInternalLinks`/`totalExternalLinks` counts
- `issues[]` (full issues array) → Keep only `issuesCount`
- `entities[]` (full entities array) → Keep only `entitiesCount`
- `headings` (full heading content) → Keep only heading counts by level

### From `neuroseo-analyses`:
- `crawlResults[]` (full crawl data) → Keep only aggregated metrics
- `visibilityAnalysis[]` (full visibility data) → Keep only `visibilityAvg`
- `trustAnalysis[]` (full trust data) → Keep only `trustAvg`
- `actionableTasks[]` (full task array) → Keep only top 15 in `keyInsights`

## Validation & Quality Checks

1. **Required field validation:** All core required fields must be present
2. **Size validation:** Final document must be < 25KB
3. **Array limit validation:** All arrays respect maximum sizes
4. **Score range validation:** All scores must be 0-100
5. **URL validation:** All URLs must be valid and normalized
6. **Enum validation:** All enum fields must match allowed values
7. **Deduplication:** `hashKey` must be unique within collection

## Migration Error Handling

- **Missing required fields:** Skip document, log warning
- **Invalid data types:** Attempt coercion, fallback to defaults
- **Oversized documents:** Truncate arrays, keep core metrics
- **Duplicate hash keys:** Skip duplicate, increment skip counter
- **Invalid URLs:** Normalize or exclude invalid URLs
- **Out-of-range scores:** Clamp to 0-100 range

This mapping ensures comprehensive coverage of all source data while maintaining the size and performance constraints of the aggregate schema.