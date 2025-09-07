export interface SiteContentChunkMeta {
  url: string;
  title?: string;
  hash: string; // stable content hash for dedupe
  section?: string; // e.g. h2 heading or inferred section
  tokens?: number;
  createdAt: number;
  updatedAt: number;
  sourceType: "crawl" | "manual" | "upload";
  keywords?: string[];
  etag?: string; // http etag if available
  lastHash?: string; // previous content hash to enable diffing
}

export interface SiteContentChunk {
  id?: string;
  meta: SiteContentChunkMeta;
  content: string; // plain text
  embedding?: number[]; // vector (optional if embeddings disabled)
}

export interface IngestionResult {
  added: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface CrawlIngestionConfig {
  baseUrl: string;
  maxPages?: number;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
  chunkSize?: number; // chars per chunk approx
  overlap?: number; // char overlap between chunks
  generateEmbeddings?: boolean; // override env flag
}
