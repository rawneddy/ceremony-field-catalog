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
  metadata: Record<string, string>;
  fieldPath: string;
  maxOccurs: number;
  minOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
  firstObservedAt: string;
  lastObservedAt: string;
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
