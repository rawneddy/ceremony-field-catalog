/**
 * Schema Export Validator
 *
 * Validates CatalogEntry input, tree structure, and generated output
 * to catch issues before they become invalid schemas.
 */

import type { CatalogEntry } from '../../types/catalog.types';
import type { FieldTreeNode } from './types';

/**
 * Validation error - blocks export.
 */
export interface ValidationError {
  code: string;
  message: string;
  fieldPath?: string;
}

/**
 * Validation warning - informational, doesn't block export.
 */
export interface ValidationWarning {
  code: string;
  message: string;
  fieldPath?: string;
}

/**
 * Complete validation result.
 */
export interface ValidationResult {
  /** True if export can proceed (no errors) */
  canExport: boolean;
  /** Errors that block export */
  errors: ValidationError[];
  /** Warnings that don't block but inform the user */
  warnings: ValidationWarning[];
}

/**
 * NCName pattern for valid XML element/attribute names.
 * Must start with letter or underscore, contain only valid chars.
 * Cannot start with "xml" (case-insensitive, reserved).
 */
const XML_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;

/**
 * Checks if a name is a valid XML NCName.
 */
export function isValidXmlName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (!XML_NAME_PATTERN.test(name)) return false;
  if (name.toLowerCase().startsWith('xml')) return false;
  return true;
}

/**
 * Checks if cardinality values are valid.
 */
export function isValidCardinality(minOccurs: number, maxOccurs: number): boolean {
  if (minOccurs < 0) return false;
  if (maxOccurs < -1) return false; // -1 is unbounded
  if (maxOccurs !== -1 && minOccurs > maxOccurs) return false;
  return true;
}

/**
 * Validates a field path format.
 * Valid: /ceremony/customer/name, /ceremony/@version
 * Invalid: ceremony/customer, /ceremony//name, /ceremony/, empty
 */
export function validateFieldPath(fieldPath: string): ValidationError | null {
  if (!fieldPath || fieldPath.length === 0) {
    return {
      code: 'EMPTY_PATH',
      message: 'Field path is empty',
      fieldPath
    };
  }

  if (!fieldPath.startsWith('/')) {
    return {
      code: 'PATH_NO_LEADING_SLASH',
      message: `Field path must start with /: "${fieldPath}"`,
      fieldPath
    };
  }

  if (fieldPath.endsWith('/') && fieldPath.length > 1) {
    return {
      code: 'PATH_TRAILING_SLASH',
      message: `Field path has trailing slash: "${fieldPath}"`,
      fieldPath
    };
  }

  // Check for empty segments (double slashes)
  if (fieldPath.includes('//')) {
    return {
      code: 'PATH_EMPTY_SEGMENT',
      message: `Field path has empty segment (//): "${fieldPath}"`,
      fieldPath
    };
  }

  // Validate each segment name
  const segments = fieldPath.slice(1).split('/');
  for (const segment of segments) {
    // Remove @ prefix for attributes
    const name = segment.startsWith('@') ? segment.slice(1) : segment;

    if (!isValidXmlName(name)) {
      return {
        code: 'INVALID_XML_NAME',
        message: `Invalid XML name "${segment}" in path "${fieldPath}"`,
        fieldPath
      };
    }
  }

  return null;
}

/**
 * Validates a single CatalogEntry.
 */
export function validateEntry(entry: CatalogEntry): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate field path
  const pathError = validateFieldPath(entry.fieldPath);
  if (pathError) {
    errors.push(pathError);
  }

  // Validate cardinality
  if (!isValidCardinality(entry.minOccurs, entry.maxOccurs)) {
    errors.push({
      code: 'INVALID_CARDINALITY',
      message: `Invalid cardinality (${entry.minOccurs}, ${entry.maxOccurs}) for "${entry.fieldPath}"`,
      fieldPath: entry.fieldPath
    });
  }

  return errors;
}

/**
 * Validates all CatalogEntry inputs before tree building.
 */
export function validateEntries(entries: CatalogEntry[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for empty input
  if (!entries || entries.length === 0) {
    errors.push({
      code: 'NO_ENTRIES',
      message: 'No fields to export'
    });
    return { canExport: false, errors, warnings };
  }

  // Validate each entry
  for (const entry of entries) {
    const entryErrors = validateEntry(entry);
    errors.push(...entryErrors);
  }

  // Check if all fields are optional
  const allOptional = entries.every(e => e.minOccurs === 0);
  if (allOptional && entries.length > 5) {
    warnings.push({
      code: 'ALL_OPTIONAL',
      message: `All ${entries.length} fields have minOccurs=0. This may indicate incomplete observations.`
    });
  }

  return {
    canExport: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Recursively collects tree validation issues.
 */
function validateTreeNode(
  node: FieldTreeNode,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  stats: { mixedContent: number; unobserved: number }
): void {
  // Check for mixed content
  if (node.isMixedContent) {
    stats.mixedContent++;
    warnings.push({
      code: 'MIXED_CONTENT',
      message: `Mixed content at "${node.fullPath}" - element has both text value and child elements`,
      fieldPath: node.fullPath
    });
  }

  // Count unobserved containers
  if (!node.hasObservation && node.children.size > 0) {
    stats.unobserved++;
  }

  // Validate node name (skip virtual root)
  if (node.name && !node.isAttribute) {
    if (!isValidXmlName(node.name)) {
      errors.push({
        code: 'INVALID_TREE_NAME',
        message: `Invalid XML element name "${node.name}" at "${node.fullPath}"`,
        fieldPath: node.fullPath
      });
    }
  }

  // Validate attribute names
  if (node.isAttribute) {
    const attrName = node.name.slice(1); // Remove @ prefix
    if (!isValidXmlName(attrName)) {
      errors.push({
        code: 'INVALID_ATTR_NAME',
        message: `Invalid XML attribute name "${attrName}" at "${node.fullPath}"`,
        fieldPath: node.fullPath
      });
    }
  }

  // Recurse into children
  for (const child of node.children.values()) {
    validateTreeNode(child, errors, warnings, stats);
  }
}

/**
 * Validates the built field tree structure.
 */
export function validateTree(tree: FieldTreeNode): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const stats = { mixedContent: 0, unobserved: 0 };

  // Validate the tree recursively
  for (const child of tree.children.values()) {
    validateTreeNode(child, errors, warnings, stats);
  }

  // Summarize unobserved containers
  if (stats.unobserved > 0) {
    warnings.push({
      code: 'UNOBSERVED_CONTAINERS',
      message: `${stats.unobserved} container element(s) were inferred (not directly observed). Their cardinality is determined by the selected policy.`
    });
  }

  return {
    canExport: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates generated XSD output is well-formed XML.
 */
export function validateXsdOutput(xsd: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xsd, 'application/xml');

    // Check for parser errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      errors.push({
        code: 'MALFORMED_XSD',
        message: `Generated XSD is not valid XML: ${parserError.textContent?.slice(0, 200)}`
      });
    }

    // Verify it's an xs:schema element
    const root = doc.documentElement;
    if (root && root.localName !== 'schema') {
      errors.push({
        code: 'INVALID_XSD_ROOT',
        message: `XSD root element should be "schema", got "${root.localName}"`
      });
    }
  } catch (e) {
    errors.push({
      code: 'XSD_PARSE_ERROR',
      message: `Failed to parse generated XSD: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  return {
    canExport: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates generated JSON Schema output is valid JSON.
 */
export function validateJsonSchemaOutput(jsonSchema: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const parsed = JSON.parse(jsonSchema);

    // Check for $schema property
    if (!parsed.$schema) {
      warnings.push({
        code: 'MISSING_SCHEMA_REF',
        message: 'JSON Schema is missing $schema property'
      });
    }

    // Check for type property
    if (!parsed.type) {
      warnings.push({
        code: 'MISSING_TYPE',
        message: 'JSON Schema root is missing type property'
      });
    }
  } catch (e) {
    errors.push({
      code: 'INVALID_JSON',
      message: `Generated JSON Schema is not valid JSON: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  return {
    canExport: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Merges multiple validation results.
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const result of results) {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    canExport: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Full validation pipeline for schema export.
 * Validates entries, builds tree, validates tree, generates output, validates output.
 */
export function validateForExport(
  entries: CatalogEntry[],
  tree: FieldTreeNode | null,
  output: string | null,
  format: 'xsd' | 'json-schema' | 'csv'
): ValidationResult {
  const results: ValidationResult[] = [];

  // Validate entries
  results.push(validateEntries(entries));

  // Validate tree if available
  if (tree) {
    results.push(validateTree(tree));
  }

  // Validate output if available
  if (output) {
    if (format === 'xsd') {
      results.push(validateXsdOutput(output));
    } else if (format === 'json-schema') {
      results.push(validateJsonSchemaOutput(output));
    }
    // CSV doesn't need output validation
  }

  return mergeValidationResults(...results);
}
