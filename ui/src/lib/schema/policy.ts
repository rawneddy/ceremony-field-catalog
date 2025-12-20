/**
 * Schema Export Policy Utilities
 *
 * Helper functions for working with export policies.
 */

import type {
  SchemaExportPolicy,
  ExportConfig,
  ExportFormat
} from './types';
import { DEFAULT_POLICY } from './types';

/**
 * Creates a default export configuration.
 */
export function createDefaultConfig(
  contextId: string,
  metadata: Record<string, string>
): ExportConfig {
  return {
    format: 'xsd',
    policy: { ...DEFAULT_POLICY },
    xsdVersion: '1.1',
    contextId,
    metadata
  };
}

/**
 * Generates a filename for the export based on context and metadata.
 *
 * Format: {contextId}_{meta1}_{meta2}_{...}_{YYYYMMDD}.{ext}
 *
 * @param config - Export configuration
 * @returns Filename string
 */
export function generateFilename(config: ExportConfig): string {
  const { format, contextId, metadata } = config;

  // Get extension based on format
  const ext = format === 'json-schema' ? 'json' : format;

  // Build filename parts
  const parts: string[] = [sanitizeForFilename(contextId)];

  // Add metadata values in consistent order
  const metaKeys = Object.keys(metadata).sort();
  for (const key of metaKeys) {
    const value = metadata[key];
    if (value) {
      parts.push(sanitizeForFilename(value));
    }
  }

  // Add date
  const date = new Date();
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('');
  parts.push(dateStr);

  return `${parts.join('_')}.${ext}`;
}

/**
 * Sanitizes a string for use in a filename.
 * Lowercases, replaces spaces/special chars with hyphens.
 */
function sanitizeForFilename(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validates an export configuration.
 * Returns array of error messages (empty if valid).
 */
export function validateConfig(config: ExportConfig): string[] {
  const errors: string[] = [];

  if (!config.contextId) {
    errors.push('Context ID is required');
  }

  if (config.format === 'xsd' && config.xsdVersion === '1.0') {
    errors.push('XSD 1.0 is not yet supported - requires tree view with element ordering');
  }

  return errors;
}

/**
 * Checks if a format supports hierarchy.
 * CSV is flat, XSD and JSON Schema are hierarchical.
 */
export function supportsHierarchy(format: ExportFormat): boolean {
  return format !== 'csv';
}

/**
 * Gets the MIME type for a format.
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'xsd':
      return 'application/xml';
    case 'json-schema':
      return 'application/json';
    case 'csv':
      return 'text/csv';
  }
}

/**
 * Merges partial policy with defaults.
 */
export function mergeWithDefaults(
  partial?: Partial<SchemaExportPolicy>
): SchemaExportPolicy {
  return {
    ...DEFAULT_POLICY,
    ...partial
  };
}
