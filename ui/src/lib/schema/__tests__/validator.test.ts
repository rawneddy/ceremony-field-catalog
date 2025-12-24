import { describe, it, expect } from 'vitest';
import {
  isValidXmlName,
  isValidCardinality,
  validateFieldPath,
  validateEntry,
  validateEntries,
  validateTree,
  validateXsdOutput,
  validateJsonSchemaOutput,
  mergeValidationResults
} from '../validator';
import { buildFieldTree } from '../fieldTree';
import type { CatalogEntry } from '../../../types/catalog.types';

/**
 * Helper to create a CatalogEntry with sensible defaults.
 */
function createEntry(
  fieldPath: string,
  overrides: Partial<CatalogEntry> = {}
): CatalogEntry {
  return {
    id: `test-${fieldPath.replace(/\//g, '-')}`,
    contextId: 'test-context',
    requiredMetadata: {},
    optionalMetadata: {},
    fieldPath,
    minOccurs: 1,
    maxOccurs: 1,
    allowsNull: false,
    allowsEmpty: false,
    firstObservedAt: '2024-01-01T00:00:00Z',
    lastObservedAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

describe('isValidXmlName', () => {
  it('should accept valid XML names', () => {
    expect(isValidXmlName('ceremony')).toBe(true);
    expect(isValidXmlName('customer')).toBe(true);
    expect(isValidXmlName('Customer123')).toBe(true);
    expect(isValidXmlName('_private')).toBe(true);
    expect(isValidXmlName('my-element')).toBe(true);
    expect(isValidXmlName('my.element')).toBe(true);
    expect(isValidXmlName('my_element')).toBe(true);
  });

  it('should reject names starting with numbers', () => {
    expect(isValidXmlName('123element')).toBe(false);
    expect(isValidXmlName('1name')).toBe(false);
  });

  it('should reject names with spaces', () => {
    expect(isValidXmlName('my element')).toBe(false);
    expect(isValidXmlName(' name')).toBe(false);
    expect(isValidXmlName('name ')).toBe(false);
  });

  it('should reject names with special characters', () => {
    expect(isValidXmlName('my!element')).toBe(false);
    expect(isValidXmlName('my@element')).toBe(false);
    expect(isValidXmlName('my#element')).toBe(false);
    expect(isValidXmlName('my$element')).toBe(false);
  });

  it('should reject names starting with xml (reserved)', () => {
    expect(isValidXmlName('xml')).toBe(false);
    expect(isValidXmlName('xmlfoo')).toBe(false);
    expect(isValidXmlName('XML')).toBe(false);
    expect(isValidXmlName('XmlName')).toBe(false);
  });

  it('should reject empty names', () => {
    expect(isValidXmlName('')).toBe(false);
  });
});

describe('isValidCardinality', () => {
  it('should accept valid cardinality values', () => {
    expect(isValidCardinality(0, 1)).toBe(true);
    expect(isValidCardinality(1, 1)).toBe(true);
    expect(isValidCardinality(0, -1)).toBe(true); // unbounded
    expect(isValidCardinality(1, -1)).toBe(true);
    expect(isValidCardinality(0, 10)).toBe(true);
    expect(isValidCardinality(5, 10)).toBe(true);
  });

  it('should reject negative minOccurs', () => {
    expect(isValidCardinality(-1, 1)).toBe(false);
    expect(isValidCardinality(-5, 10)).toBe(false);
  });

  it('should reject maxOccurs less than -1', () => {
    expect(isValidCardinality(0, -2)).toBe(false);
    expect(isValidCardinality(0, -100)).toBe(false);
  });

  it('should reject minOccurs greater than maxOccurs (when maxOccurs is not unbounded)', () => {
    expect(isValidCardinality(5, 3)).toBe(false);
    expect(isValidCardinality(10, 1)).toBe(false);
  });

  it('should allow minOccurs greater than maxOccurs when maxOccurs is unbounded', () => {
    // This is valid: minOccurs=5, maxOccurs=unbounded means "at least 5"
    expect(isValidCardinality(5, -1)).toBe(true);
  });
});

describe('validateFieldPath', () => {
  it('should accept valid paths', () => {
    expect(validateFieldPath('/ceremony')).toBeNull();
    expect(validateFieldPath('/ceremony/customer')).toBeNull();
    expect(validateFieldPath('/ceremony/customer/name')).toBeNull();
    expect(validateFieldPath('/ceremony/@version')).toBeNull();
  });

  it('should reject empty paths', () => {
    const error = validateFieldPath('');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('EMPTY_PATH');
  });

  it('should reject paths without leading slash', () => {
    const error = validateFieldPath('ceremony/customer');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('PATH_NO_LEADING_SLASH');
  });

  it('should reject paths with trailing slash', () => {
    const error = validateFieldPath('/ceremony/');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('PATH_TRAILING_SLASH');
  });

  it('should reject paths with empty segments (double slashes)', () => {
    const error = validateFieldPath('/ceremony//customer');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('PATH_EMPTY_SEGMENT');
  });

  it('should reject paths with invalid XML names', () => {
    const error = validateFieldPath('/ceremony/123invalid');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('INVALID_XML_NAME');
  });

  it('should reject single slash as it produces empty segment', () => {
    // "/" splits to empty string which is not a valid XML name
    const error = validateFieldPath('/');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('INVALID_XML_NAME');
  });
});

describe('validateEntry', () => {
  it('should return empty array for valid entries', () => {
    const entry = createEntry('/ceremony/customer/name');
    const errors = validateEntry(entry);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for invalid path', () => {
    const entry = createEntry('invalid/path');
    const errors = validateEntry(entry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.code === 'PATH_NO_LEADING_SLASH')).toBe(true);
  });

  it('should return errors for invalid cardinality', () => {
    const entry = createEntry('/ceremony', { minOccurs: -1 });
    const errors = validateEntry(entry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.code === 'INVALID_CARDINALITY')).toBe(true);
  });

  it('should return multiple errors if both path and cardinality are invalid', () => {
    const entry = createEntry('invalid', { minOccurs: -1 });
    const errors = validateEntry(entry);
    expect(errors.length).toBe(2);
  });
});

describe('validateEntries', () => {
  it('should return canExport: true for valid entries', () => {
    const entries = [
      createEntry('/ceremony/customer/name'),
      createEntry('/ceremony/amount')
    ];
    const result = validateEntries(entries);

    expect(result.canExport).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return canExport: false for empty entries', () => {
    const result = validateEntries([]);

    expect(result.canExport).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_ENTRIES')).toBe(true);
  });

  it('should return canExport: false if any entry has errors', () => {
    const entries = [
      createEntry('/ceremony/customer/name'),
      createEntry('invalid/path') // Invalid
    ];
    const result = validateEntries(entries);

    expect(result.canExport).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should warn if all fields are optional', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      createEntry(`/ceremony/field${i}`, { minOccurs: 0 })
    );
    const result = validateEntries(entries);

    expect(result.canExport).toBe(true); // Warning doesn't block
    expect(result.warnings.some(w => w.code === 'ALL_OPTIONAL')).toBe(true);
  });

  it('should NOT warn about optional if fewer than 6 fields', () => {
    const entries = [
      createEntry('/ceremony/a', { minOccurs: 0 }),
      createEntry('/ceremony/b', { minOccurs: 0 })
    ];
    const result = validateEntries(entries);

    expect(result.warnings.some(w => w.code === 'ALL_OPTIONAL')).toBe(false);
  });
});

describe('validateTree', () => {
  it('should return canExport: true for valid tree', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const tree = buildFieldTree(entries);
    const result = validateTree(tree);

    expect(result.canExport).toBe(true);
  });

  it('should warn about mixed content', () => {
    const entries = [
      createEntry('/ceremony/description'),
      createEntry('/ceremony/description/format')
    ];
    const tree = buildFieldTree(entries);
    const result = validateTree(tree);

    expect(result.warnings.some(w => w.code === 'MIXED_CONTENT')).toBe(true);
  });

  it('should warn about unobserved containers', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const tree = buildFieldTree(entries);
    const result = validateTree(tree);

    expect(result.warnings.some(w => w.code === 'UNOBSERVED_CONTAINERS')).toBe(true);
  });
});

describe('validateXsdOutput', () => {
  it('should return canExport: true for valid XSD', () => {
    const validXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="test" type="xs:string"/>
</xs:schema>`;

    const result = validateXsdOutput(validXsd);
    expect(result.canExport).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return canExport: false for malformed XML', () => {
    const invalidXsd = `<?xml version="1.0"?>
<xs:schema>
  <xs:element name="test"
</xs:schema>`;

    const result = validateXsdOutput(invalidXsd);
    expect(result.canExport).toBe(false);
    expect(result.errors.some(e => e.code === 'MALFORMED_XSD')).toBe(true);
  });

  it('should return error if root is not schema', () => {
    const invalidXsd = `<?xml version="1.0"?>
<notschema></notschema>`;

    const result = validateXsdOutput(invalidXsd);
    expect(result.canExport).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_XSD_ROOT')).toBe(true);
  });
});

describe('validateJsonSchemaOutput', () => {
  it('should return canExport: true for valid JSON Schema', () => {
    const validSchema = JSON.stringify({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {}
    });

    const result = validateJsonSchemaOutput(validSchema);
    expect(result.canExport).toBe(true);
  });

  it('should return canExport: false for invalid JSON', () => {
    const invalidJson = '{ invalid json }';

    const result = validateJsonSchemaOutput(invalidJson);
    expect(result.canExport).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_JSON')).toBe(true);
  });

  it('should warn if $schema is missing', () => {
    const schemaWithoutRef = JSON.stringify({
      type: 'object'
    });

    const result = validateJsonSchemaOutput(schemaWithoutRef);
    expect(result.canExport).toBe(true); // Warning doesn't block
    expect(result.warnings.some(w => w.code === 'MISSING_SCHEMA_REF')).toBe(true);
  });

  it('should warn if type is missing', () => {
    const schemaWithoutType = JSON.stringify({
      $schema: 'https://json-schema.org/draft/2020-12/schema'
    });

    const result = validateJsonSchemaOutput(schemaWithoutType);
    expect(result.canExport).toBe(true);
    expect(result.warnings.some(w => w.code === 'MISSING_TYPE')).toBe(true);
  });
});

describe('mergeValidationResults', () => {
  it('should merge errors and warnings from multiple results', () => {
    const result1 = {
      canExport: true,
      errors: [],
      warnings: [{ code: 'WARN1', message: 'Warning 1' }]
    };
    const result2 = {
      canExport: true,
      errors: [],
      warnings: [{ code: 'WARN2', message: 'Warning 2' }]
    };

    const merged = mergeValidationResults(result1, result2);

    expect(merged.warnings).toHaveLength(2);
    expect(merged.canExport).toBe(true);
  });

  it('should set canExport: false if any result has errors', () => {
    const result1 = {
      canExport: true,
      errors: [],
      warnings: []
    };
    const result2 = {
      canExport: false,
      errors: [{ code: 'ERR1', message: 'Error 1' }],
      warnings: []
    };

    const merged = mergeValidationResults(result1, result2);

    expect(merged.canExport).toBe(false);
    expect(merged.errors).toHaveLength(1);
  });

  it('should handle empty results array', () => {
    const merged = mergeValidationResults();

    expect(merged.canExport).toBe(true);
    expect(merged.errors).toHaveLength(0);
    expect(merged.warnings).toHaveLength(0);
  });
});
