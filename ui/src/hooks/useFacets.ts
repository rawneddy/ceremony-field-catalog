import { useState, useMemo, useEffect } from 'react';
import type { CatalogEntry, FacetIndex, FacetValue } from '../types';

export const useFacets = (results: CatalogEntry[] | undefined) => {
  const [selectedFacets, setSelectedFacets] = useState<Record<string, Set<string>>>({});
  const [facetModes, setFacetModes] = useState<Record<string, 'any' | 'one'>>({});

  // Reset facets when results change (new server-side search)
  useEffect(() => {
    setSelectedFacets({});
    setFacetModes({});
  }, [results]);

  const facets = useMemo(() => {
    if (!results) return {} as FacetIndex;

    const index: FacetIndex = {};

    // Get all metadata keys across all results
    const allKeys = new Set<string>();
    results.forEach(entry => {
      Object.keys(entry.metadata).forEach(key => allKeys.add(key));
    });

    allKeys.forEach(key => {
      const mode = facetModes[key] || 'any';
      const selected = selectedFacets[key] || new Set<string>();

      // Disjunctive counting: 
      // For the current key, apply ALL OTHER filters to see what values are available
      const resultsFilteredByOthers = results.filter(entry => {
        return Object.entries(selectedFacets).every(([otherKey, otherSelected]) => {
          if (otherKey === key || otherSelected.size === 0) return true;
          const entryValue = entry.metadata[otherKey];
          return entryValue && otherSelected.has(entryValue);
        });
      });

      const valueCounts: Record<string, number> = {};
      resultsFilteredByOthers.forEach(entry => {
        const val = entry.metadata[key];
        if (val) {
          valueCounts[val] = (valueCounts[val] || 0) + 1;
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
        if (selected.size === 0) return true;
        const entryValue = entry.metadata[key];
        return entryValue && selected.has(entryValue);
      });
    });
  }, [results, selectedFacets]);

  const setFacetMode = (key: string, mode: 'any' | 'one') => {
    setFacetModes(prev => ({ ...prev, [key]: mode }));
    // If switching to 'one', keep only the first selected value if multiple exist
    if (mode === 'one' && selectedFacets[key]?.size > 1) {
        const firstValue = Array.from(selectedFacets[key])[0];
        setSelectedFacets(prev => ({ ...prev, [key]: new Set([firstValue]) }));
    }
  };

  const toggleFacetValue = (key: string, value: string) => {
    const mode = facetModes[key] || 'any';
    setSelectedFacets(prev => {
      const current = new Set(prev[key] || []);
      if (mode === 'one') {
        if (current.has(value)) {
          current.clear();
        } else {
          current.clear();
          current.add(value);
        }
      } else {
        if (current.has(value)) {
          current.delete(value);
        } else {
          current.add(value);
        }
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
