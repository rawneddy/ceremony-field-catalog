import { describe, it, expect } from 'vitest';
import { generateJsonSchema, generateJsonSchemaString } from '../jsonSchemaGenerator';
import { buildFieldTreeWithPolicy } from '../fieldTree';
import type { CatalogEntry } from '../../../types/catalog.types';
import type { ExportConfig, SchemaExportPolicy } from '../types';

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

/**
 * Helper to create export config.
 */
function createConfig(overrides: Partial<ExportConfig> = {}): ExportConfig {
  return {
    format: 'json-schema',
    policy: { containerCardinality: 'permissive' },
    xsdVersion: '1.1',
    contextId: 'test-context',
    metadata: {},
    ...overrides
  };
}

/**
 * Helper to generate JSON Schema from entries.
 */
function generateSchemaFromEntries(
  entries: CatalogEntry[],
  policy: SchemaExportPolicy = { containerCardinality: 'permissive' },
  config: Partial<ExportConfig> = {}
) {
  const tree = buildFieldTreeWithPolicy(entries, policy);
  return generateJsonSchema(tree, createConfig({ policy, ...config }));
}

// Use strictest policy to avoid array wrapping of containers in most tests
const STRICTEST: SchemaExportPolicy = { containerCardinality: 'strictest' };

describe('generateJsonSchema', () => {
  describe('basic structure', () => {
    it('should include $schema for draft 2020-12', () => {
      const entries = [createEntry('/ceremony')];
      const schema = generateSchemaFromEntries(entries);

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    });

    it('should include $id with context', () => {
      const entries = [createEntry('/ceremony')];
      const schema = generateSchemaFromEntries(entries, undefined, {
        contextId: 'deposits'
      });

      expect(schema.$id).toBe('ceremony-catalog://deposits');
    });

    it('should include $id with context and metadata', () => {
      const entries = [createEntry('/ceremony')];
      const schema = generateSchemaFromEntries(entries, undefined, {
        contextId: 'deposits',
        metadata: { productcode: 'dda' }
      });

      expect(schema.$id).toBe('ceremony-catalog://deposits/productcode/dda');
    });

    it('should include title', () => {
      const entries = [createEntry('/ceremony')];
      const schema = generateSchemaFromEntries(entries, undefined, {
        contextId: 'deposits'
      });

      expect(schema.title).toBe('deposits Schema');
    });

    it('should include description with policy', () => {
      const entries = [createEntry('/ceremony')];
      const schema = generateSchemaFromEntries(entries, { containerCardinality: 'strict' });

      expect(schema.description).toContain('containerCardinality=strict');
    });

    it('should have type: object at root', () => {
      const entries = [createEntry('/ceremony')];
      const schema = generateSchemaFromEntries(entries);

      expect(schema.type).toBe('object');
    });
  });

  describe('leaf properties', () => {
    it('should generate string type for leaf elements', () => {
      const entries = [createEntry('/ceremony/name')];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      // With strictest policy, ceremony is an object (not array)
      expect(schema.properties?.ceremony?.properties?.name?.type).toBe('string');
    });

    it('should generate nullable type for allowsNull elements', () => {
      const entries = [createEntry('/ceremony/optional', { allowsNull: true })];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const optionalType = schema.properties?.ceremony?.properties?.optional?.type;
      expect(optionalType).toEqual(['string', 'null']);
    });

    it('should wrap in array for maxOccurs > 1', () => {
      const entries = [createEntry('/ceremony/items', { maxOccurs: -1 })];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const items = schema.properties?.ceremony?.properties?.items;
      expect(items?.type).toBe('array');
      expect(items?.items?.type).toBe('string');
    });

    it('should include minItems for array types', () => {
      const entries = [createEntry('/ceremony/items', { minOccurs: 1, maxOccurs: -1 })];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const items = schema.properties?.ceremony?.properties?.items;
      expect(items?.minItems).toBe(1);
    });

    it('should include maxItems for bounded arrays', () => {
      const entries = [createEntry('/ceremony/items', { minOccurs: 0, maxOccurs: 5 })];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const items = schema.properties?.ceremony?.properties?.items;
      expect(items?.maxItems).toBe(5);
    });

    it('should NOT include maxItems for unbounded arrays', () => {
      const entries = [createEntry('/ceremony/items', { minOccurs: 0, maxOccurs: -1 })];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const items = schema.properties?.ceremony?.properties?.items;
      expect(items?.maxItems).toBeUndefined();
    });
  });

  describe('complex properties', () => {
    it('should generate object type for elements with children', () => {
      const entries = [
        createEntry('/ceremony/customer/name'),
        createEntry('/ceremony/customer/id')
      ];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const customer = schema.properties?.ceremony?.properties?.customer;
      expect(customer?.type).toBe('object');
      expect(customer?.properties?.name).toBeDefined();
      expect(customer?.properties?.id).toBeDefined();
    });

    it('should add required array for fields with minOccurs >= 1', () => {
      const entries = [
        createEntry('/ceremony/customer/name', { minOccurs: 1 }),
        createEntry('/ceremony/customer/optional', { minOccurs: 0 })
      ];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const customer = schema.properties?.ceremony?.properties?.customer;
      expect(customer?.required).toContain('name');
      expect(customer?.required).not.toContain('optional');
    });

    it('should wrap complex types in array for maxOccurs > 1', () => {
      const entries = [
        createEntry('/ceremony/items/item/name', { minOccurs: 1 })
      ];
      // Use strictest for containers, then manually set maxOccurs on item
      const tree = buildFieldTreeWithPolicy(entries, STRICTEST);
      const item = tree.children.get('ceremony')!.children.get('items')!.children.get('item')!;
      item.maxOccurs = -1;

      const schema = generateJsonSchema(tree, createConfig({ policy: STRICTEST }));

      const itemProp = schema.properties?.ceremony?.properties?.items?.properties?.item;
      expect(itemProp?.type).toBe('array');
      expect(itemProp?.items?.type).toBe('object');
    });
  });

  describe('attributes', () => {
    it('should treat attributes as regular properties without @ prefix', () => {
      const entries = [
        createEntry('/ceremony/@version'),
        createEntry('/ceremony/name')
      ];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const ceremony = schema.properties?.ceremony;
      // Attribute should be in properties without @
      expect(ceremony?.properties?.version).toBeDefined();
      expect(ceremony?.properties?.['@version']).toBeUndefined();
    });

    it('should add required attributes with minOccurs >= 1', () => {
      const entries = [
        createEntry('/ceremony/@version', { minOccurs: 1 }),
        createEntry('/ceremony/name')
      ];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const ceremony = schema.properties?.ceremony;
      expect(ceremony?.required).toContain('version');
    });
  });

  describe('mixed content', () => {
    it('should use oneOf for mixed content nodes', () => {
      const entries = [
        createEntry('/ceremony/description'),
        createEntry('/ceremony/description/format')
      ];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const description = schema.properties?.ceremony?.properties?.description;
      expect(description?.oneOf).toBeDefined();
      expect(description?.oneOf).toHaveLength(2);
    });

    it('should allow string or object in oneOf for mixed content', () => {
      const entries = [
        createEntry('/ceremony/description'),
        createEntry('/ceremony/description/format')
      ];
      const schema = generateSchemaFromEntries(entries, STRICTEST);

      const description = schema.properties?.ceremony?.properties?.description;
      const oneOfTypes = description?.oneOf?.map(o => o.type);

      expect(oneOfTypes).toContain('string');
      expect(oneOfTypes).toContain('object');
    });
  });

  describe('required at root', () => {
    it('should add required array at root for required root elements', () => {
      const entries = [createEntry('/ceremony/name')];
      const schema = generateSchemaFromEntries(entries, { containerCardinality: 'strict' });

      // With strict policy, ceremony container has minOccurs=1
      expect(schema.required).toContain('ceremony');
    });

    it('should NOT have required array if all roots are optional', () => {
      const entries = [createEntry('/ceremony/name')];
      const schema = generateSchemaFromEntries(entries, { containerCardinality: 'permissive' });

      // With permissive policy, ceremony container has minOccurs=0
      expect(schema.required).toBeUndefined();
    });
  });
});

describe('generateJsonSchemaString', () => {
  it('should produce valid JSON', () => {
    const entries = [
      createEntry('/ceremony/customer/name'),
      createEntry('/ceremony/amount', { allowsNull: true })
    ];
    const tree = buildFieldTreeWithPolicy(entries, { containerCardinality: 'permissive' });
    const jsonString = generateJsonSchemaString(tree, createConfig());

    // Should not throw when parsing
    expect(() => JSON.parse(jsonString)).not.toThrow();
  });

  it('should be formatted with 2-space indentation', () => {
    const entries = [createEntry('/ceremony')];
    const tree = buildFieldTreeWithPolicy(entries, { containerCardinality: 'permissive' });
    const jsonString = generateJsonSchemaString(tree, createConfig());

    // Check for 2-space indentation
    expect(jsonString).toContain('\n  "');
  });
});
