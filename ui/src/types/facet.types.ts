import type { CatalogEntry } from './catalog.types';

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

export interface UseFacetsReturn {
  facets: FacetIndex;
  filteredResults: CatalogEntry[];
  setFacetMode: (key: string, mode: 'any' | 'one') => void;
  toggleFacetValue: (key: string, value: string) => void;
  clearFacet: (key: string) => void;
  clearAllFacets: () => void;
}
