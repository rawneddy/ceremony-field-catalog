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
  /** The field path (grouping key) - lowercase canonical form */
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

  /** Merged casing counts from all variants */
  casingCounts: Record<string, number>;
}

/**
 * Generates a human-readable schema key from a CatalogEntry.
 * Format: "contextId | value1 | value2 | ..." (pipe-separated metadata values)
 * Uses only required metadata values since they define the schema variant.
 */
export function formatSchemaKey(entry: CatalogEntry): string {
  const values = Object.values(entry.requiredMetadata ?? {});
  return [entry.contextId, ...values].join(' | ');
}

/**
 * Combines required and optional metadata into a single map for display purposes.
 * Required metadata values are single strings.
 * Optional metadata values are joined with ", " for display.
 */
export function getCombinedMetadata(entry: CatalogEntry): Record<string, string> {
  const combined: Record<string, string> = {};

  // Add required metadata (single values)
  if (entry.requiredMetadata) {
    for (const [key, value] of Object.entries(entry.requiredMetadata)) {
      combined[key] = value;
    }
  }

  // Add optional metadata (join arrays for display)
  // Only add if key doesn't already exist from required metadata
  if (entry.optionalMetadata) {
    for (const [key, values] of Object.entries(entry.optionalMetadata)) {
      if (values && values.length > 0 && !(key in combined)) {
        combined[key] = values.join(', ');
      }
    }
  }

  return combined;
}

/**
 * Gets all metadata values for facet extraction.
 * Returns an array of {key, value} pairs, with optional metadata values expanded.
 */
export function getAllMetadataValues(entry: CatalogEntry): Array<{ key: string; value: string }> {
  const pairs: Array<{ key: string; value: string }> = [];

  // Add required metadata values
  if (entry.requiredMetadata) {
    for (const [key, value] of Object.entries(entry.requiredMetadata)) {
      pairs.push({ key, value });
    }
  }

  // Add optional metadata values (expanded)
  if (entry.optionalMetadata) {
    for (const [key, values] of Object.entries(entry.optionalMetadata)) {
      if (values) {
        for (const value of values) {
          pairs.push({ key, value });
        }
      }
    }
  }

  return pairs;
}
