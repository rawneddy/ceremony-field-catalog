import { describe, it, expect } from 'vitest';
import {
  buildFieldTree,
  buildFieldTreeWithPolicy,
  applyPolicy,
  getRootElements,
  getAttributes,
  getElementChildren
} from '../fieldTree';
import type { CatalogEntry } from '../../../types/catalog.types';
import type { SchemaExportPolicy } from '../types';

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
    metadata: {},
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

describe('buildFieldTree', () => {
  it('should create a virtual root with empty entries', () => {
    const tree = buildFieldTree([]);
    expect(tree.name).toBe('');
    expect(tree.fullPath).toBe('');
    expect(tree.children.size).toBe(0);
  });

  it('should create single-level tree from one entry', () => {
    const entries = [createEntry('/ceremony')];
    const tree = buildFieldTree(entries);

    expect(tree.children.size).toBe(1);
    expect(tree.children.has('ceremony')).toBe(true);

    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.name).toBe('ceremony');
    expect(ceremony.fullPath).toBe('/ceremony');
    expect(ceremony.isLeaf).toBe(true);
    expect(ceremony.hasObservation).toBe(true);
  });

  it('should create nested tree from hierarchical path', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const tree = buildFieldTree(entries);

    expect(tree.children.size).toBe(1);
    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.isLeaf).toBe(false); // Has children

    const customer = ceremony.children.get('customer')!;
    expect(customer.isLeaf).toBe(false);

    const name = customer.children.get('name')!;
    expect(name.isLeaf).toBe(true);
    expect(name.hasObservation).toBe(true);
    expect(name.fullPath).toBe('/ceremony/customer/name');
  });

  it('should handle multiple entries sharing common ancestors', () => {
    const entries = [
      createEntry('/ceremony/customer/name'),
      createEntry('/ceremony/customer/id'),
      createEntry('/ceremony/amount')
    ];
    const tree = buildFieldTree(entries);

    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.children.size).toBe(2); // customer, amount

    const customer = ceremony.children.get('customer')!;
    expect(customer.children.size).toBe(2); // name, id
  });

  it('should preserve cardinality from entries', () => {
    const entries = [
      createEntry('/ceremony/items/item', { minOccurs: 0, maxOccurs: -1 })
    ];
    const tree = buildFieldTree(entries);

    const item = tree.children.get('ceremony')!.children.get('items')!.children.get('item')!;
    expect(item.minOccurs).toBe(0);
    expect(item.maxOccurs).toBe(-1);
  });

  it('should preserve allowsNull and allowsEmpty', () => {
    const entries = [
      createEntry('/ceremony/optional', { allowsNull: true, allowsEmpty: true })
    ];
    const tree = buildFieldTree(entries);

    const optional = tree.children.get('ceremony')!.children.get('optional')!;
    expect(optional.allowsNull).toBe(true);
    expect(optional.allowsEmpty).toBe(true);
  });

  it('should detect attributes (@ prefix)', () => {
    const entries = [createEntry('/ceremony/@version')];
    const tree = buildFieldTree(entries);

    const version = tree.children.get('ceremony')!.children.get('@version')!;
    expect(version.isAttribute).toBe(true);
    expect(version.name).toBe('@version');
  });

  it('should detect mixed content when node is both leaf and container', () => {
    // First observation: /ceremony/name is a leaf with value
    // Second observation: /ceremony/name/first is a child
    const entries = [
      createEntry('/ceremony/name'),
      createEntry('/ceremony/name/first')
    ];
    const tree = buildFieldTree(entries);

    const name = tree.children.get('ceremony')!.children.get('name')!;
    expect(name.isMixedContent).toBe(true);
    expect(name.children.size).toBe(1);
    expect(name.hasObservation).toBe(true);
  });

  it('should detect mixed content in reverse order', () => {
    // Child added first, then parent is observed as leaf
    const entries = [
      createEntry('/ceremony/name/first'),
      createEntry('/ceremony/name')
    ];
    const tree = buildFieldTree(entries);

    const name = tree.children.get('ceremony')!.children.get('name')!;
    expect(name.isMixedContent).toBe(true);
  });
});

describe('applyPolicy', () => {
  it('should apply permissive policy to unobserved containers', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const tree = buildFieldTree(entries);
    const policy: SchemaExportPolicy = { containerCardinality: 'permissive' };

    applyPolicy(tree, policy);

    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.minOccurs).toBe(0);
    expect(ceremony.maxOccurs).toBe(-1);

    const customer = ceremony.children.get('customer')!;
    expect(customer.minOccurs).toBe(0);
    expect(customer.maxOccurs).toBe(-1);

    // Observed leaf keeps its values
    const name = customer.children.get('name')!;
    expect(name.minOccurs).toBe(1);
    expect(name.maxOccurs).toBe(1);
  });

  it('should apply strict policy to unobserved containers', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const tree = buildFieldTree(entries);
    const policy: SchemaExportPolicy = { containerCardinality: 'strict' };

    applyPolicy(tree, policy);

    // Containers with observed descendants get minOccurs=1
    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.minOccurs).toBe(1);
    expect(ceremony.maxOccurs).toBe(-1);

    const customer = ceremony.children.get('customer')!;
    expect(customer.minOccurs).toBe(1);
    expect(customer.maxOccurs).toBe(-1);
  });

  it('should apply strictest policy to unobserved containers', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const tree = buildFieldTree(entries);
    const policy: SchemaExportPolicy = { containerCardinality: 'strictest' };

    applyPolicy(tree, policy);

    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.minOccurs).toBe(1);
    expect(ceremony.maxOccurs).toBe(1);

    const customer = ceremony.children.get('customer')!;
    expect(customer.minOccurs).toBe(1);
    expect(customer.maxOccurs).toBe(1);
  });
});

describe('buildFieldTreeWithPolicy', () => {
  it('should build tree and apply policy in one call', () => {
    const entries = [createEntry('/ceremony/customer/name')];
    const policy: SchemaExportPolicy = { containerCardinality: 'strict' };

    const tree = buildFieldTreeWithPolicy(entries, policy);

    const ceremony = tree.children.get('ceremony')!;
    expect(ceremony.minOccurs).toBe(1);
  });
});

describe('getRootElements', () => {
  it('should return top-level element nodes', () => {
    const entries = [
      createEntry('/ceremony/customer'),
      createEntry('/transaction/id')
    ];
    const tree = buildFieldTree(entries);

    const roots = getRootElements(tree);
    expect(roots).toHaveLength(2);
    expect(roots.map(r => r.name).sort()).toEqual(['ceremony', 'transaction']);
  });

  it('should exclude attribute nodes from roots', () => {
    const entries = [
      createEntry('/ceremony'),
      createEntry('/@version')
    ];
    const tree = buildFieldTree(entries);

    const roots = getRootElements(tree);
    expect(roots).toHaveLength(1);
    expect(roots[0]!.name).toBe('ceremony');
  });
});

describe('getAttributes', () => {
  it('should return attribute children', () => {
    const entries = [
      createEntry('/ceremony/customer'),
      createEntry('/ceremony/@version'),
      createEntry('/ceremony/@id')
    ];
    const tree = buildFieldTree(entries);

    const ceremony = tree.children.get('ceremony')!;
    const attrs = getAttributes(ceremony);

    expect(attrs).toHaveLength(2);
    expect(attrs.every(a => a.isAttribute)).toBe(true);
  });
});

describe('getElementChildren', () => {
  it('should return non-attribute children', () => {
    const entries = [
      createEntry('/ceremony/customer'),
      createEntry('/ceremony/amount'),
      createEntry('/ceremony/@version')
    ];
    const tree = buildFieldTree(entries);

    const ceremony = tree.children.get('ceremony')!;
    const elements = getElementChildren(ceremony);

    expect(elements).toHaveLength(2);
    expect(elements.every(e => !e.isAttribute)).toBe(true);
  });
});
