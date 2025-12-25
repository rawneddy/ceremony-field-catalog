import { useMemo } from 'react';
import type { CatalogEntry, AggregatedField, TriState } from '../types';

/**
 * Compute a tri-state value from an array of booleans.
 * Returns 'yes' if all true, 'no' if all false, 'mixed' otherwise.
 */
function computeTriState(values: boolean[]): TriState {
  if (values.length === 0) return 'no';
  const allTrue = values.every(v => v);
  const allFalse = values.every(v => !v);
  if (allTrue) return 'yes';
  if (allFalse) return 'no';
  return 'mixed';
}

/**
 * Hook that aggregates CatalogEntry documents by fieldPath.
 * Computes ranges for min/max occurs and tri-state values for nullable/empty flags.
 *
 * @param entries - Array of CatalogEntry documents from the API
 * @returns Array of AggregatedField objects, sorted by fieldPath
 */
export const useAggregatedFields = (
  entries: CatalogEntry[] | undefined
): AggregatedField[] => {
  return useMemo(() => {
    if (!entries || entries.length === 0) return [];

    // Group entries by fieldPath
    const groupedMap = new Map<string, CatalogEntry[]>();
    entries.forEach(entry => {
      const existing = groupedMap.get(entry.fieldPath) || [];
      existing.push(entry);
      groupedMap.set(entry.fieldPath, existing);
    });

    // Transform each group into an AggregatedField
    const aggregated: AggregatedField[] = [];

    groupedMap.forEach((variants, fieldPath) => {
      // Compute ranges
      const minOccursValues = variants.map(v => v.minOccurs);
      const maxOccursValues = variants.map(v => v.maxOccurs);

      // Compute tri-states
      const nullValues = variants.map(v => v.allowsNull);
      const emptyValues = variants.map(v => v.allowsEmpty);

      // Compute distinct contexts
      const contextSet = new Set(variants.map(v => v.contextId));

      // Compute timeline bounds
      const firstDates = variants
        .map(v => new Date(v.firstObservedAt).getTime())
        .filter(t => !isNaN(t));
      const lastDates = variants
        .map(v => new Date(v.lastObservedAt).getTime())
        .filter(t => !isNaN(t));

      // Merge casing counts from all variants
      const mergedCasingCounts: Record<string, number> = {};
      variants.forEach(v => {
        if (v.casingCounts) {
          for (const [casing, count] of Object.entries(v.casingCounts)) {
            mergedCasingCounts[casing] = (mergedCasingCounts[casing] ?? 0) + count;
          }
        }
      });

      aggregated.push({
        fieldPath,
        variantCount: variants.length,
        variants,
        minOccursRange: [
          Math.min(...minOccursValues),
          Math.max(...minOccursValues)
        ],
        maxOccursRange: [
          Math.min(...maxOccursValues),
          Math.max(...maxOccursValues)
        ],
        allowsNull: computeTriState(nullValues),
        allowsEmpty: computeTriState(emptyValues),
        firstObservedAt: firstDates.length > 0
          ? new Date(Math.min(...firstDates)).toISOString()
          : variants[0]?.firstObservedAt || '',
        lastObservedAt: lastDates.length > 0
          ? new Date(Math.max(...lastDates)).toISOString()
          : variants[0]?.lastObservedAt || '',
        contexts: Array.from(contextSet).sort(),
        casingCounts: mergedCasingCounts,
      });
    });

    // Sort by fieldPath for consistent ordering
    return aggregated.sort((a, b) => a.fieldPath.localeCompare(b.fieldPath));
  }, [entries]);
};
