import { useState, useMemo, useEffect } from 'react';
import type { CatalogEntry, FacetIndex, FacetValue } from '../types';
import { getAllMetadataValues } from '../types';

/**
 * Helper to check if an entry matches any of the selected values for a key.
 */
const entryMatchesFacetSelection = (entry: CatalogEntry, key: string, selected: Set<string>): boolean => {
  if (selected.size === 0) return true;

  // Check required metadata
  const reqValue = entry.requiredMetadata?.[key];
  if (reqValue && selected.has(reqValue)) {
    return true;
  }

  // Check optional metadata (any value in array matches any selected value)
  const optValues = entry.optionalMetadata?.[key];
  if (optValues && optValues.some(v => selected.has(v))) {
    return true;
  }

  return false;
};

export const useFacets = (results: CatalogEntry[] | undefined) => {
  const [selectedFacets, setSelectedFacets] = useState<Record<string, Set<string>>>({});
  const [facetModes, setFacetModes] = useState<Record<string, 'any' | 'all'>>({});

  // Reset facets when results change (new server-side search)
  useEffect(() => {
    setSelectedFacets({});
    setFacetModes({});
  }, [results]);

  const facets = useMemo(() => {
    if (!results) return {} as FacetIndex;

    const index: FacetIndex = {};

    // Get all metadata keys across all results (from both required and optional)
    const allKeys = new Set<string>();
    results.forEach(entry => {
      if (entry.requiredMetadata) {
        Object.keys(entry.requiredMetadata).forEach(key => allKeys.add(key));
      }
      if (entry.optionalMetadata) {
        Object.keys(entry.optionalMetadata).forEach(key => allKeys.add(key));
      }
    });

    allKeys.forEach(key => {
      const mode = facetModes[key] || 'any';
      const selected = selectedFacets[key] || new Set<string>();

      // Disjunctive counting:
      // For the current key, apply ALL OTHER filters to see what values are available
      const resultsFilteredByOthers = results.filter(entry => {
        return Object.entries(selectedFacets).every(([otherKey, otherSelected]) => {
          if (otherKey === key || otherSelected.size === 0) return true;
          return entryMatchesFacetSelection(entry, otherKey, otherSelected);
        });
      });

      const valueCounts: Record<string, number> = {};
      resultsFilteredByOthers.forEach(entry => {
        // Get all values for this key from the entry (both required and optional)
        for (const { key: k, value } of getAllMetadataValues(entry)) {
          if (k === key && value) {
            valueCounts[value] = (valueCounts[value] || 0) + 1;
          }
        }
      });

      const values: FacetValue[] = Object.entries(valueCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));

      index[key] = {
        values,
        mode,
        selected
      };
    });

    return index;
  }, [results, selectedFacets, facetModes]);

  const filteredResults = useMemo(() => {
    if (!results) return [];

    return results.filter(entry => {
      return Object.entries(selectedFacets).every(([key, selected]) => {
        return entryMatchesFacetSelection(entry, key, selected);
      });
    });
  }, [results, selectedFacets]);

  const setFacetMode = (key: string, mode: 'any' | 'all') => {
    setFacetModes(prev => ({ ...prev, [key]: mode }));
    // Both modes support multi-select, no need to truncate selections
  };

  const toggleFacetValue = (key: string, value: string) => {
    // Both 'any' and 'all' modes support multi-select toggle
    setSelectedFacets(prev => {
      const current = new Set(prev[key] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [key]: current };
    });
  };

  const clearFacet = (key: string) => {
    setSelectedFacets(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearAllFacets = () => {
    setSelectedFacets({});
  };

  return {
    facets,
    filteredResults,
    setFacetMode,
    toggleFacetValue,
    clearFacet,
    clearAllFacets,
  };
};
