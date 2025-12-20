import { useCallback } from 'react';
import type { CatalogEntry } from '../types';

/**
 * Hook that provides schema export functionality.
 * Supports JSON Schema, XSD, and CSV formats.
 */
export const useSchemaExport = () => {
  /**
   * Trigger a browser download of the given content.
   */
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Generate a filename base from context and metadata.
   */
  const generateFilenameBase = useCallback((
    contextId: string,
    metadata: Record<string, string>
  ): string => {
    const metadataValues = Object.values(metadata).filter(Boolean);
    const parts = [contextId, ...metadataValues];
    return parts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  }, []);

  /**
   * Export schema as JSON Schema format.
   */
  const exportToJsonSchema = useCallback((
    entries: CatalogEntry[],
    contextId: string,
    metadata: Record<string, string>
  ) => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `ceremony-catalog://${contextId}/${Object.values(metadata).join('/')}`,
      title: `${contextId} Field Schema`,
      description: `Field schema generated from Ceremony Field Catalog`,
      type: 'object',
      generatedAt: new Date().toISOString(),
      context: contextId,
      metadata,
      fieldCount: entries.length,
      fields: entries.map(e => ({
        fieldPath: e.fieldPath,
        minOccurs: e.minOccurs,
        maxOccurs: e.maxOccurs,
        allowsNull: e.allowsNull,
        allowsEmpty: e.allowsEmpty,
        firstObservedAt: e.firstObservedAt,
        lastObservedAt: e.lastObservedAt,
      })),
    };

    const filename = `${generateFilenameBase(contextId, metadata)}-schema.json`;
    downloadFile(JSON.stringify(schema, null, 2), filename, 'application/json');
  }, [downloadFile, generateFilenameBase]);

  /**
   * Export schema as XSD format.
   */
  const exportToXsd = useCallback((
    entries: CatalogEntry[],
    contextId: string,
    metadata: Record<string, string>
  ) => {
    // Build a simple XSD that documents the field structure
    const metadataComment = Object.entries(metadata)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    const fieldElements = entries.map(e => {
      const minOccurs = e.minOccurs;
      const maxOccurs = e.maxOccurs === -1 ? 'unbounded' : e.maxOccurs;
      const nillable = e.allowsNull ? 'true' : 'false';

      // Extract element name from fieldPath (last segment)
      const pathParts = e.fieldPath.split('/').filter(Boolean);
      const elementName = pathParts[pathParts.length - 1] || 'element';

      return `    <!-- ${e.fieldPath} -->
    <xs:element name="${elementName}" minOccurs="${minOccurs}" maxOccurs="${maxOccurs}" nillable="${nillable}">
      <xs:annotation>
        <xs:documentation>
          Path: ${e.fieldPath}
          AllowsEmpty: ${e.allowsEmpty}
          First Observed: ${e.firstObservedAt}
          Last Observed: ${e.lastObservedAt}
        </xs:documentation>
      </xs:annotation>
    </xs:element>`;
    }).join('\n');

    const xsd = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Ceremony Field Catalog - Schema Export
  Context: ${contextId}
  Metadata: ${metadataComment}
  Generated: ${new Date().toISOString()}
  Field Count: ${entries.length}
-->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="${contextId}Type">
    <xs:sequence>
${fieldElements}
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

    const filename = `${generateFilenameBase(contextId, metadata)}-schema.xsd`;
    downloadFile(xsd, filename, 'application/xml');
  }, [downloadFile, generateFilenameBase]);

  /**
   * Export schema as CSV format.
   */
  const exportToCsv = useCallback((
    entries: CatalogEntry[],
    contextId: string,
    metadata: Record<string, string>
  ) => {
    const headers = [
      'fieldPath',
      'minOccurs',
      'maxOccurs',
      'allowsNull',
      'allowsEmpty',
      'firstObservedAt',
      'lastObservedAt'
    ];

    const rows = entries.map(e => [
      `"${e.fieldPath}"`,
      e.minOccurs,
      e.maxOccurs,
      e.allowsNull,
      e.allowsEmpty,
      `"${e.firstObservedAt}"`,
      `"${e.lastObservedAt}"`
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `${generateFilenameBase(contextId, metadata)}-schema.csv`;
    downloadFile(csv, filename, 'text/csv');
  }, [downloadFile, generateFilenameBase]);

  return {
    exportToJsonSchema,
    exportToXsd,
    exportToCsv,
  };
};
