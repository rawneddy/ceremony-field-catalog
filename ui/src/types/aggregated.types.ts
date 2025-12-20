import type { CatalogEntry } from './catalog.types';

/**
 * Tri-state for aggregated boolean fields across multiple variants
 */
export type TriState = 'yes' | 'no' | 'mixed';

/**
 * A field aggregated across multiple FieldKey variants.
 * Groups CatalogEntry documents by fieldPath, computing ranges and tri-state values.
 */
export interface AggregatedField {
  /** The field path (grouping key) */
  fieldPath: string;

  /** Number of distinct FieldKey variants for this field */
  variantCount: number;

  /** All underlying CatalogEntry documents */
  variants: CatalogEntry[];

  /** Range of minOccurs across variants: [min, max] */
  minOccursRange: [number, number];

  /** Range of maxOccurs across variants: [min, max] */
  maxOccursRange: [number, number];

  /** Tri-state: 'yes' if all allow null, 'no' if none, 'mixed' otherwise */
  allowsNull: TriState;

  /** Tri-state: 'yes' if all allow empty, 'no' if none, 'mixed' otherwise */
  allowsEmpty: TriState;

  /** Earliest firstObservedAt across all variants */
  firstObservedAt: string;

  /** Latest lastObservedAt across all variants */
  lastObservedAt: string;

  /** Distinct context IDs represented in variants */
  contexts: string[];
}

/**
 * Generates a human-readable schema key from a CatalogEntry.
 * Format: "contextId | value1 | value2 | ..." (pipe-separated metadata values)
 */
export function formatSchemaKey(entry: CatalogEntry): string {
  const values = Object.values(entry.metadata);
  return [entry.contextId, ...values].join(' | ');
}
