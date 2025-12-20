import { describe, it, expect } from 'vitest';
import {
  detectMixedContentPaths,
  getFieldWarnings,
  computeAllFieldWarnings,
  getWarningSeverityClasses
} from '../fieldWarnings';
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

describe('detectMixedContentPaths', () => {
  it('should return empty set for no entries', () => {
    const result = detectMixedContentPaths([]);
    expect(result.size).toBe(0);
  });

  it('should return empty set for single entry', () => {
    const entries = [createEntry('/ceremony/name')];
    const result = detectMixedContentPaths(entries);
    expect(result.size).toBe(0);
  });

  it('should detect mixed content when parent has child', () => {
    const entries = [
      createEntry('/ceremony/name'),
      createEntry('/ceremony/name/first')
    ];
    const result = detectMixedContentPaths(entries);
    expect(result.has('/ceremony/name')).toBe(true);
    expect(result.has('/ceremony/name/first')).toBe(false);
  });

  it('should detect multiple mixed content nodes', () => {
    const entries = [
      createEntry('/ceremony'),
      createEntry('/ceremony/customer'),
      createEntry('/ceremony/customer/name'),
      createEntry('/ceremony/customer/name/first')
    ];
    const result = detectMixedContentPaths(entries);
    expect(result.has('/ceremony')).toBe(true);
    expect(result.has('/ceremony/customer')).toBe(true);
    expect(result.has('/ceremony/customer/name')).toBe(true);
    expect(result.has('/ceremony/customer/name/first')).toBe(false);
  });

  it('should not detect siblings as mixed content', () => {
    const entries = [
      createEntry('/ceremony/name'),
      createEntry('/ceremony/address')
    ];
    const result = detectMixedContentPaths(entries);
    expect(result.size).toBe(0);
  });

  it('should not match prefix substring that is not a child', () => {
    // /ceremony/names is not a child of /ceremony/name
    const entries = [
      createEntry('/ceremony/name'),
      createEntry('/ceremony/names')
    ];
    const result = detectMixedContentPaths(entries);
    expect(result.size).toBe(0);
  });
});

describe('getFieldWarnings', () => {
  describe('mixed content detection', () => {
    it('should return mixed content warning when field has children', () => {
      const entry = createEntry('/ceremony/name');
      const allEntries = [
        entry,
        createEntry('/ceremony/name/first')
      ];
      const warnings = getFieldWarnings(entry, allEntries);
      const mixedWarning = warnings.find(w => w.code === 'MIXED_CONTENT');
      expect(mixedWarning).toBeDefined();
      expect(mixedWarning?.severity).toBe('warning');
    });

    it('should not return mixed content warning for leaf node', () => {
      const entry = createEntry('/ceremony/name/first');
      const allEntries = [
        createEntry('/ceremony/name'),
        entry
      ];
      const warnings = getFieldWarnings(entry, allEntries);
      expect(warnings.find(w => w.code === 'MIXED_CONTENT')).toBeUndefined();
    });
  });

  describe('attribute detection', () => {
    it('should detect attribute fields', () => {
      const entry = createEntry('/ceremony/@version');
      const warnings = getFieldWarnings(entry, [entry]);
      const attrWarning = warnings.find(w => w.code === 'ATTRIBUTE');
      expect(attrWarning).toBeDefined();
      expect(attrWarning?.severity).toBe('info');
    });

    it('should not flag regular elements as attributes', () => {
      const entry = createEntry('/ceremony/version');
      const warnings = getFieldWarnings(entry, [entry]);
      expect(warnings.find(w => w.code === 'ATTRIBUTE')).toBeUndefined();
    });

    it('should detect nested attributes', () => {
      const entry = createEntry('/ceremony/customer/@id');
      const warnings = getFieldWarnings(entry, [entry]);
      expect(warnings.find(w => w.code === 'ATTRIBUTE')).toBeDefined();
    });
  });

  describe('high variability detection', () => {
    it('should detect high variability when minOccurs=0 and maxOccurs > 1', () => {
      const entry = createEntry('/ceremony/items/item', {
        minOccurs: 0,
        maxOccurs: 5
      });
      const warnings = getFieldWarnings(entry, [entry]);
      const variabilityWarning = warnings.find(w => w.code === 'HIGH_VARIABILITY');
      expect(variabilityWarning).toBeDefined();
      expect(variabilityWarning?.severity).toBe('info');
    });

    it('should not flag required fields with high maxOccurs', () => {
      const entry = createEntry('/ceremony/items/item', {
        minOccurs: 1,
        maxOccurs: 5
      });
      const warnings = getFieldWarnings(entry, [entry]);
      expect(warnings.find(w => w.code === 'HIGH_VARIABILITY')).toBeUndefined();
    });

    it('should not flag optional singleton fields', () => {
      const entry = createEntry('/ceremony/optional', {
        minOccurs: 0,
        maxOccurs: 1
      });
      const warnings = getFieldWarnings(entry, [entry]);
      expect(warnings.find(w => w.code === 'HIGH_VARIABILITY')).toBeUndefined();
    });
  });

  describe('multiple warnings', () => {
    it('should return multiple warnings when applicable', () => {
      const entry = createEntry('/ceremony/@variableAttr', {
        minOccurs: 0,
        maxOccurs: 5
      });
      const warnings = getFieldWarnings(entry, [entry]);

      expect(warnings.length).toBe(2);
      expect(warnings.find(w => w.code === 'ATTRIBUTE')).toBeDefined();
      expect(warnings.find(w => w.code === 'HIGH_VARIABILITY')).toBeDefined();
    });
  });
});

describe('computeAllFieldWarnings', () => {
  it('should compute warnings for all entries efficiently', () => {
    const entries = [
      createEntry('/ceremony'),
      createEntry('/ceremony/name'),
      createEntry('/ceremony/@version'),
      createEntry('/ceremony/items/item', { minOccurs: 0, maxOccurs: 10 })
    ];

    const warningsMap = computeAllFieldWarnings(entries);

    expect(warningsMap.size).toBe(4);

    // /ceremony should have mixed content warning
    const ceremonyWarnings = warningsMap.get('/ceremony');
    expect(ceremonyWarnings?.find(w => w.code === 'MIXED_CONTENT')).toBeDefined();

    // /@version should have attribute warning
    const versionWarnings = warningsMap.get('/ceremony/@version');
    expect(versionWarnings?.find(w => w.code === 'ATTRIBUTE')).toBeDefined();

    // /items/item should have high variability
    const itemWarnings = warningsMap.get('/ceremony/items/item');
    expect(itemWarnings?.find(w => w.code === 'HIGH_VARIABILITY')).toBeDefined();
  });

  it('should return empty arrays for fields with no warnings', () => {
    const entries = [
      createEntry('/ceremony/simple', {
        minOccurs: 1,
        maxOccurs: 1,
        firstObservedAt: '2020-01-01T00:00:00Z'
      })
    ];

    const warningsMap = computeAllFieldWarnings(entries);
    const warnings = warningsMap.get('/ceremony/simple');
    expect(warnings).toBeDefined();
    expect(warnings).toHaveLength(0);
  });
});

describe('getWarningSeverityClasses', () => {
  it('should return amber classes for warning severity', () => {
    const classes = getWarningSeverityClasses('warning');
    expect(classes.bg).toContain('amber');
    expect(classes.text).toContain('amber');
    expect(classes.border).toContain('amber');
    expect(classes.icon).toContain('amber');
  });

  it('should return blue classes for info severity', () => {
    const classes = getWarningSeverityClasses('info');
    expect(classes.bg).toContain('blue');
    expect(classes.text).toContain('blue');
    expect(classes.border).toContain('blue');
    expect(classes.icon).toContain('blue');
  });
});
