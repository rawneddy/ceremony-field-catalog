/**
 * Field-level warning detection for display in results table.
 *
 * Detects issues that apply to individual fields based on the full set of entries.
 */

import type { CatalogEntry } from '../../types/catalog.types';

/**
 * Warning that applies to a specific field.
 */
export interface FieldWarning {
  code: string;
  shortLabel: string;
  message: string;
  severity: 'info' | 'warning';
}

/**
 * All possible field warning codes.
 */
export type FieldWarningCode =
  | 'MIXED_CONTENT'
  | 'ATTRIBUTE'
  | 'HIGH_VARIABILITY';

/**
 * Warning definitions with their display text.
 */
const WARNING_DEFINITIONS: Record<FieldWarningCode, Omit<FieldWarning, 'code'>> = {
  MIXED_CONTENT: {
    shortLabel: 'Mixed',
    message: 'This element has been observed with both a text value and child elements. In XSD, this generates a complexType with mixed="true".',
    severity: 'warning'
  },
  ATTRIBUTE: {
    shortLabel: 'Attr',
    message: 'This is an XML attribute (prefixed with @), not an element. Attributes cannot have child elements.',
    severity: 'info'
  },
  HIGH_VARIABILITY: {
    shortLabel: 'Variable',
    message: 'This field has high cardinality variability (appears 0 times in some documents, many times in others). Consider if this is expected.',
    severity: 'info'
  }
};

/**
 * Detects mixed content fields from the entries.
 *
 * A field has mixed content when:
 * - It has an observation (is in the entries list)
 * - AND another entry exists that is a direct or nested child of this field
 *
 * Example: If we have both "/ceremony/name" and "/ceremony/name/first",
 * then "/ceremony/name" has mixed content.
 */
export function detectMixedContentPaths(entries: CatalogEntry[]): Set<string> {
  const paths = new Set(entries.map(e => e.fieldPath));
  const mixedPaths = new Set<string>();

  for (const path of paths) {
    // Check if any other path starts with this path + "/"
    for (const otherPath of paths) {
      if (otherPath !== path && otherPath.startsWith(path + '/')) {
        mixedPaths.add(path);
        break;
      }
    }
  }

  return mixedPaths;
}

/**
 * Gets all warnings for a specific field based on the full entry set.
 */
export function getFieldWarnings(
  entry: CatalogEntry,
  allEntries: CatalogEntry[],
  options: {
    mixedContentPaths?: Set<string>;
  } = {}
): FieldWarning[] {
  const warnings: FieldWarning[] = [];
  const { mixedContentPaths } = options;

  // Mixed content detection
  const mixedPaths = mixedContentPaths ?? detectMixedContentPaths(allEntries);
  if (mixedPaths.has(entry.fieldPath)) {
    warnings.push({
      code: 'MIXED_CONTENT',
      ...WARNING_DEFINITIONS.MIXED_CONTENT
    });
  }

  // Attribute detection
  const segments = entry.fieldPath.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment?.startsWith('@')) {
    warnings.push({
      code: 'ATTRIBUTE',
      ...WARNING_DEFINITIONS.ATTRIBUTE
    });
  }

  // High variability detection (minOccurs=0 and maxOccurs > 1)
  if (entry.minOccurs === 0 && entry.maxOccurs > 1) {
    warnings.push({
      code: 'HIGH_VARIABILITY',
      ...WARNING_DEFINITIONS.HIGH_VARIABILITY
    });
  }

  return warnings;
}

/**
 * Precomputes warnings for all entries efficiently.
 *
 * Returns a Map of fieldPath -> FieldWarning[]
 */
export function computeAllFieldWarnings(
  entries: CatalogEntry[]
): Map<string, FieldWarning[]> {
  const result = new Map<string, FieldWarning[]>();

  // Precompute mixed content paths once
  const mixedContentPaths = detectMixedContentPaths(entries);

  for (const entry of entries) {
    const warnings = getFieldWarnings(entry, entries, { mixedContentPaths });
    result.set(entry.fieldPath, warnings);
  }

  return result;
}

/**
 * Gets warning color classes for display.
 */
export function getWarningSeverityClasses(severity: 'info' | 'warning'): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  if (severity === 'warning') {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: 'text-amber-500'
    };
  }
  return {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-500'
  };
}
