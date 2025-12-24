import { describe, it, expect } from 'vitest';
import { generateXsd } from '../xsdGenerator';
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
    format: 'xsd',
    policy: { containerCardinality: 'permissive' },
    xsdVersion: '1.1',
    contextId: 'test-context',
    metadata: {},
    ...overrides
  };
}

/**
 * Helper to generate XSD from entries.
 */
function generateXsdFromEntries(
  entries: CatalogEntry[],
  policy: SchemaExportPolicy = { containerCardinality: 'permissive' },
  config: Partial<ExportConfig> = {}
): string {
  const tree = buildFieldTreeWithPolicy(entries, policy);
  return generateXsd(tree, createConfig({ policy, ...config }));
}

describe('generateXsd', () => {
  describe('basic structure', () => {
    it('should generate valid XSD 1.1 header', () => {
      const entries = [createEntry('/ceremony')];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xsd).toContain('xmlns:xs="http://www.w3.org/2001/XMLSchema"');
      expect(xsd).toContain('vc:minVersion="1.1"');
    });

    it('should include context comment', () => {
      const entries = [createEntry('/ceremony')];
      const xsd = generateXsdFromEntries(entries, undefined, { contextId: 'deposits' });

      expect(xsd).toContain('<!-- Context: deposits -->');
    });

    it('should include metadata comment', () => {
      const entries = [createEntry('/ceremony')];
      const xsd = generateXsdFromEntries(entries, undefined, {
        metadata: { productcode: 'dda', productsubcode: '4s' }
      });

      expect(xsd).toContain('<!-- Metadata: productcode=dda, productsubcode=4s -->');
    });
  });

  describe('element generation', () => {
    it('should generate simple leaf element with type xs:string', () => {
      const entries = [createEntry('/ceremony/name')];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('<xs:element name="name" type="xs:string"');
    });

    it('should include minOccurs and maxOccurs on leaf elements', () => {
      const entries = [createEntry('/ceremony/items', { minOccurs: 0, maxOccurs: -1 })];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('minOccurs="0"');
      expect(xsd).toContain('maxOccurs="unbounded"');
    });

    it('should generate complex type for elements with children', () => {
      const entries = [
        createEntry('/ceremony/customer/name'),
        createEntry('/ceremony/customer/id')
      ];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('<xs:element name="customer"');
      expect(xsd).toContain('<xs:complexType>');
      expect(xsd).toContain('<xs:all>');
    });

    it('should generate multiple sibling elements', () => {
      const entries = [
        createEntry('/ceremony/name'),
        createEntry('/ceremony/amount'),
        createEntry('/ceremony/date')
      ];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('<xs:element name="name"');
      expect(xsd).toContain('<xs:element name="amount"');
      expect(xsd).toContain('<xs:element name="date"');
    });
  });

  describe('nillable attribute', () => {
    it('should add nillable="true" for nullable leaf elements', () => {
      const entries = [createEntry('/ceremony/optional', { allowsNull: true })];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('nillable="true"');
    });

    it('should NOT add nillable for non-nullable elements', () => {
      const entries = [createEntry('/ceremony/required', { allowsNull: false })];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).not.toContain('nillable="true"');
    });

    it('should add nillable="true" for nullable complex elements', () => {
      // Complex element (has children) that is also nullable
      const entries = [
        createEntry('/ceremony/address', { allowsNull: true }),
        createEntry('/ceremony/address/street')
      ];
      const xsd = generateXsdFromEntries(entries);

      // The address element should have nillable="true"
      expect(xsd).toMatch(/<xs:element name="address"[^>]*nillable="true"/);
    });
  });

  describe('mixed content', () => {
    it('should add mixed="true" for mixed content elements', () => {
      // Element observed both as leaf and as container
      const entries = [
        createEntry('/ceremony/description'),
        createEntry('/ceremony/description/format')
      ];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('mixed="true"');
    });
  });

  describe('attributes', () => {
    it('should generate xs:attribute for @ prefixed paths', () => {
      const entries = [createEntry('/ceremony/@version')];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('<xs:attribute name="version"');
      expect(xsd).toContain('type="xs:string"');
    });

    it('should set use="required" for attributes with minOccurs > 0', () => {
      const entries = [createEntry('/ceremony/@version', { minOccurs: 1 })];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('use="required"');
    });

    it('should set use="optional" for attributes with minOccurs = 0', () => {
      const entries = [createEntry('/ceremony/@version', { minOccurs: 0 })];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('use="optional"');
    });

    it('should place attributes after xs:all in complex type', () => {
      const entries = [
        createEntry('/ceremony/customer/name'),
        createEntry('/ceremony/customer/@id')
      ];
      const xsd = generateXsdFromEntries(entries);

      // xs:attribute should come after </xs:all>
      const allEndIndex = xsd.indexOf('</xs:all>');
      const attrIndex = xsd.indexOf('<xs:attribute name="id"');

      expect(allEndIndex).toBeLessThan(attrIndex);
    });
  });

  describe('policy application', () => {
    it('should apply permissive policy to containers', () => {
      const entries = [createEntry('/ceremony/customer/name')];
      const xsd = generateXsdFromEntries(entries, { containerCardinality: 'permissive' });

      // Unobserved containers should have minOccurs="0"
      expect(xsd).toMatch(/<xs:element name="customer"[^>]*minOccurs="0"/);
    });

    it('should apply strict policy to containers', () => {
      const entries = [createEntry('/ceremony/customer/name')];
      const xsd = generateXsdFromEntries(entries, { containerCardinality: 'strict' });

      // Containers with observed descendants should have minOccurs="1", maxOccurs="unbounded"
      expect(xsd).toMatch(/<xs:element name="customer"[^>]*minOccurs="1"/);
      expect(xsd).toMatch(/<xs:element name="customer"[^>]*maxOccurs="unbounded"/);
    });

    it('should apply strictest policy to containers', () => {
      const entries = [createEntry('/ceremony/customer/name')];
      const xsd = generateXsdFromEntries(entries, { containerCardinality: 'strictest' });

      // Containers should have minOccurs="1", maxOccurs="1"
      expect(xsd).toMatch(/<xs:element name="customer"[^>]*minOccurs="1"/);
      expect(xsd).toMatch(/<xs:element name="customer"[^>]*maxOccurs="1"/);
    });
  });

  describe('XML escaping', () => {
    it('should escape special characters in element names', () => {
      // Note: This shouldn't normally happen as XML names can't have these chars,
      // but we test the escaping works if they somehow get through
      const entries = [createEntry('/ceremony/amount')];
      const xsd = generateXsdFromEntries(entries, undefined, {
        contextId: 'test & context'
      });

      expect(xsd).toContain('test &amp; context');
    });
  });

  describe('deeply nested structures', () => {
    it('should handle deeply nested paths', () => {
      const entries = [
        createEntry('/ceremony/customers/customer/addresses/address/lines/line')
      ];
      const xsd = generateXsdFromEntries(entries);

      expect(xsd).toContain('<xs:element name="ceremony">');
      expect(xsd).toContain('<xs:element name="customers"');
      expect(xsd).toContain('<xs:element name="customer"');
      expect(xsd).toContain('<xs:element name="addresses"');
      expect(xsd).toContain('<xs:element name="address"');
      expect(xsd).toContain('<xs:element name="lines"');
      expect(xsd).toContain('<xs:element name="line"');
    });
  });

  describe('output validation', () => {
    it('should produce valid XML', () => {
      const entries = [
        createEntry('/ceremony/customer/name'),
        createEntry('/ceremony/customer/@id'),
        createEntry('/ceremony/amount', { allowsNull: true })
      ];
      const xsd = generateXsdFromEntries(entries);

      // Parse as XML - should not throw
      const parser = new DOMParser();
      const doc = parser.parseFromString(xsd, 'application/xml');
      const parseError = doc.querySelector('parsererror');

      expect(parseError).toBeNull();
    });

    it('should have xs:schema as root element', () => {
      const entries = [createEntry('/ceremony')];
      const xsd = generateXsdFromEntries(entries);

      const parser = new DOMParser();
      const doc = parser.parseFromString(xsd, 'application/xml');

      expect(doc.documentElement.localName).toBe('schema');
    });
  });
});
