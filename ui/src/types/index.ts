export interface Context {
  contextId: string;
  displayName: string;
  description: string | null;
  requiredMetadata: string[];
  optionalMetadata: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ContextWithCount extends Context {
  fieldCount: number;
}

export interface CatalogSearchRequest {
  q?: string;
  contextId?: string;
  fieldPathContains?: string;
  metadata?: Record<string, string>;
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

export interface UploadStatus {
  fileName: string;
  status: 'pending' | 'parsing' | 'submitting' | 'complete' | 'error';
  observationCount?: number;
  error?: string;
}

export interface ErrorResponse {
  message: string;
  status: number;
  timestamp: string;
  error: string;
  errors?: string[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetState {
  values: FacetValue[];
  mode: 'any' | 'one';
  selected: Set<string>;
}

export interface FacetIndex {
  [key: string]: FacetState;
}

export interface useFacetsReturn {
  facets: FacetIndex;
  filteredResults: CatalogEntry[];
  setFacetMode: (key: string, mode: 'any' | 'one') => void;
  toggleFacetValue: (key: string, value: string) => void;
  clearFacet: (key: string) => void;
  clearAllFacets: () => void;
}
