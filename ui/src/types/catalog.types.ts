export interface CatalogSearchRequest {
  q?: string;
  contextId?: string;
  fieldPathContains?: string;
  metadata?: Record<string, string[]>; // Multiple values per key for OR logic
  page?: number;
  size?: number;
  sort?: string;
  useRegex?: boolean;
}

export interface CatalogEntry {
  id: string;
  contextId: string;
  /**
   * Required metadata fields that form part of the field identity.
   * Single value per key, immutable after creation.
   * May be null/undefined for legacy entries.
   */
  requiredMetadata?: Record<string, string> | null;
  /**
   * Optional metadata fields tracking all observed values.
   * Values are accumulated over time as observations are merged.
   * Each key maps to an array of all values ever observed.
   * May be null/undefined for legacy entries.
   */
  optionalMetadata?: Record<string, string[]> | null;
  fieldPath: string;
  maxOccurs: number;
  minOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
  firstObservedAt: string;
  lastObservedAt: string;
  /** Map of observed field path casings to their counts. Null for legacy entries. */
  casingCounts?: Record<string, number>;
  /** User-selected canonical casing for schema export. Null means unresolved (use dominant). */
  canonicalCasing?: string | null;
}

export interface CatalogObservation {
  metadata: Record<string, string>;
  fieldPath: string;
  count: number;
  hasNull: boolean;
  hasEmpty: boolean;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
