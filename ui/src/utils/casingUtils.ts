/**
 * Utility functions for working with field path casing variants.
 */

/**
 * Get the dominant (most frequently observed) casing from casingCounts.
 * Falls back to the provided fallback value if no casing data exists.
 */
export function getDominantCasing(
  casingCounts: Record<string, number> | undefined | null,
  fallback: string
): string {
  if (!casingCounts) {
    return fallback;
  }

  const entries = Object.entries(casingCounts);
  if (entries.length === 0) {
    return fallback;
  }

  // Find the casing with the highest count
  let dominant = entries[0];
  for (const entry of entries) {
    if (entry[1] > (dominant?.[1] ?? 0)) {
      dominant = entry;
    }
  }

  return dominant?.[0] ?? fallback;
}

/**
 * Get the total number of observations across all casing variants.
 */
export function getTotalObservations(
  casingCounts: Record<string, number> | undefined | null
): number {
  if (!casingCounts) {
    return 0;
  }

  return Object.values(casingCounts).reduce((sum, count) => sum + count, 0);
}

/**
 * Check if there are multiple casing variants for a field path.
 */
export function hasMultipleCasings(
  casingCounts: Record<string, number> | undefined | null
): boolean {
  if (!casingCounts) {
    return false;
  }

  return Object.keys(casingCounts).length > 1;
}

/**
 * Get all casing variants sorted by count (descending).
 * Returns array of [casing, count] tuples.
 */
export function getSortedCasingVariants(
  casingCounts: Record<string, number> | undefined | null
): [string, number][] {
  if (!casingCounts) {
    return [];
  }

  return Object.entries(casingCounts).sort((a, b) => b[1] - a[1]);
}

/**
 * Get the display casing for a field entry.
 * Priority: canonical casing (if set) > dominant casing > fallback.
 */
export function getDisplayCasing(
  canonicalCasing: string | undefined | null,
  casingCounts: Record<string, number> | undefined | null,
  fallback: string
): string {
  // If canonical is set, use it
  if (canonicalCasing) {
    return canonicalCasing;
  }
  // Otherwise use dominant (highest count)
  return getDominantCasing(casingCounts, fallback);
}

/**
 * Check if a field needs casing resolution before export.
 * Returns true if there are multiple casings and no canonical selection.
 */
export function needsCasingResolution(
  casingCounts: Record<string, number> | undefined | null,
  canonicalCasing: string | undefined | null
): boolean {
  return hasMultipleCasings(casingCounts) && !canonicalCasing;
}
