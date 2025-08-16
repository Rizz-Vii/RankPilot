// Template entity Firestore path utilities (T36 / DQ2)
// Provides minimal helper & placeholder types; no persistence logic yet.

export interface TemplateEntity {
  kind: string;          // e.g., 'automation' | 'dashboard'
  version: number;       // increment on publish change
  checksum: string;      // hash of definition for idempotency
  createdAt: number;     // epoch ms
  updatedAt: number;     // epoch ms
  authorRef: string;     // userId or system
  usageCount?: number;   // increment on apply (not derived ratios)
}

export const GLOBAL_TEMPLATES_COLLECTION = 'global/templates';

export function templateDocId(kind: string, version: number, checksum: string) {
  return `${kind}_${version}_${checksum}`;
}

// Placeholder: validation to be implemented in T37 (template validation pipeline)
export function isValidTemplate(t: Partial<TemplateEntity>): t is TemplateEntity {
  return !!(
    t.kind && typeof t.kind === 'string' &&
    typeof t.version === 'number' &&
    t.checksum && typeof t.checksum === 'string'
  );
}
