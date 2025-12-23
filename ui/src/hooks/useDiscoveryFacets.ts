import { useMemo } from 'react';
import type { AggregatedField, FacetValue, FacetIndex } from '../types';

/**
 * Extracts facet data from aggregated field results.
 * Unlike useFacets, this hook does NOT do client-side filtering.
 * Instead, facet values are used for display and Splunk-style "add to query" behavior.
 *
 * @param aggregatedFields - Array of AggregatedField objects
 * @param activeFilters - Currently active header filters (for marking selected state)
 * @returns Facet structure ready for display
 */
export const useDiscoveryFacets = (
  aggregatedFields: AggregatedField[],
  activeFilters: Record<string, string[]> = {}
): FacetIndex => {
  return useMemo(() => {
    if (!aggregatedFields || aggregatedFields.length === 0) {
      return {};
    }

    // Collect all metadata keys and values at the AGGREGATED FIELD level (not variant level)
    // This ensures facet counts match the "Filtering Results" count (unique field paths)
    const metadataMap = new Map<string, Map<string, number>>();

    // Also collect contextId as a facet
    const contextCounts = new Map<string, number>();

    for (const field of aggregatedFields) {
      // Collect unique contexts for this field (count field once per context it appears in)
      const fieldContexts = new Set(field.variants.map(v => v.contextId));
      for (const contextId of fieldContexts) {
        const currentContextCount = contextCounts.get(contextId) || 0;
        contextCounts.set(contextId, currentContextCount + 1);
      }

      // Collect unique metadata values for this field (count field once per unique value)
      // First, gather all unique values per key for this field
      const fieldMetadata = new Map<string, Set<string>>();
      for (const variant of field.variants) {
        for (const [key, value] of Object.entries(variant.metadata)) {
          if (!fieldMetadata.has(key)) {
            fieldMetadata.set(key, new Set());
          }
          fieldMetadata.get(key)!.add(value);
        }
      }

      // Now count each unique value once per field
      for (const [key, values] of fieldMetadata) {
        if (!metadataMap.has(key)) {
          metadataMap.set(key, new Map());
        }
        const valueCounts = metadataMap.get(key)!;
        for (const value of values) {
          const currentCount = valueCounts.get(value) || 0;
          valueCounts.set(value, currentCount + 1);
        }
      }
    }

    const facets: FacetIndex = {};

    // Add contextId facet
    if (contextCounts.size > 0) {
      const contextValues: FacetValue[] = Array.from(contextCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      const selectedContexts = new Set(activeFilters['contextId'] || []);

      facets['contextId'] = {
        values: contextValues,
        mode: 'one' as const,
        selected: selectedContexts,
      };
    }

    // Add metadata facets
    for (const [key, valueCounts] of metadataMap) {
      const values: FacetValue[] = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      const selectedValues = new Set(activeFilters[key] || []);

      facets[key] = {
        values,
        mode: 'one' as const,
        selected: selectedValues,
      };
    }

    return facets;
  }, [aggregatedFields, activeFilters]);
};

/**
 * Type for the callback when a facet value is selected.
 * This should add the value to the header filter and trigger a re-fetch.
 */
export type FacetSelectHandler = (key: string, value: string) => void;
