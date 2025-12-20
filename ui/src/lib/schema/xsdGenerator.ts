/**
 * XSD 1.1 Generator
 *
 * Generates hierarchical XSD from a FieldTreeNode structure.
 * Uses xs:all for order flexibility with repeating elements (XSD 1.1 feature).
 */

import type { FieldTreeNode, ExportConfig } from './types';
import { getAttributes, getElementChildren, getRootElements } from './fieldTree';

/**
 * Escapes special XML characters in text content.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats maxOccurs value for XSD.
 */
function formatMaxOccurs(maxOccurs: number): string {
  return maxOccurs === -1 ? 'unbounded' : String(maxOccurs);
}

/**
 * Generates indentation string.
 */
function indent(level: number): string {
  return '  '.repeat(level);
}

/**
 * Generates XSD for an attribute node.
 */
function generateAttribute(node: FieldTreeNode, level: number): string {
  const name = node.name.slice(1); // Remove @ prefix
  const use = node.minOccurs > 0 ? 'required' : 'optional';

  return `${indent(level)}<xs:attribute name="${escapeXml(name)}" type="xs:string" use="${use}"/>`;
}

/**
 * Generates XSD for a leaf element (simple type).
 */
function generateLeafElement(node: FieldTreeNode, level: number): string {
  const lines: string[] = [];
  const ind = indent(level);

  const minOccurs = node.minOccurs;
  const maxOccurs = formatMaxOccurs(node.maxOccurs);
  const nillable = node.allowsNull ? ' nillable="true"' : '';

  lines.push(
    `${ind}<xs:element name="${escapeXml(node.name)}" type="xs:string" minOccurs="${minOccurs}" maxOccurs="${maxOccurs}"${nillable}/>`
  );

  return lines.join('\n');
}

/**
 * Generates XSD for a complex element (has children).
 */
function generateComplexElement(node: FieldTreeNode, level: number): string {
  const lines: string[] = [];
  const ind = indent(level);

  const minOccurs = node.minOccurs;
  const maxOccurs = formatMaxOccurs(node.maxOccurs);
  const mixed = node.isMixedContent ? ' mixed="true"' : '';
  const nillable = node.allowsNull ? ' nillable="true"' : '';

  lines.push(`${ind}<xs:element name="${escapeXml(node.name)}" minOccurs="${minOccurs}" maxOccurs="${maxOccurs}"${nillable}>`);
  lines.push(`${ind}  <xs:complexType${mixed}>`);

  // Get element children (non-attributes)
  const elementChildren = getElementChildren(node);

  if (elementChildren.length > 0) {
    lines.push(`${ind}    <xs:all>`);

    for (const child of elementChildren) {
      lines.push(generateElement(child, level + 3));
    }

    lines.push(`${ind}    </xs:all>`);
  }

  // Add attributes after xs:all
  const attributes = getAttributes(node);
  for (const attr of attributes) {
    lines.push(generateAttribute(attr, level + 2));
  }

  lines.push(`${ind}  </xs:complexType>`);
  lines.push(`${ind}</xs:element>`);

  return lines.join('\n');
}

/**
 * Generates XSD for any element node (dispatches to leaf or complex).
 */
function generateElement(node: FieldTreeNode, level: number): string {
  // If it has children (or is mixed content), it's complex
  if (node.children.size > 0 || node.isMixedContent) {
    return generateComplexElement(node, level);
  }

  // Otherwise it's a simple leaf element
  return generateLeafElement(node, level);
}

/**
 * Generates XSD for a root element (top-level, no minOccurs/maxOccurs).
 */
function generateRootElement(node: FieldTreeNode): string {
  const lines: string[] = [];
  const mixed = node.isMixedContent ? ' mixed="true"' : '';

  lines.push(`  <xs:element name="${escapeXml(node.name)}">`);
  lines.push(`    <xs:complexType${mixed}>`);

  const elementChildren = getElementChildren(node);

  if (elementChildren.length > 0) {
    lines.push('      <xs:all>');

    for (const child of elementChildren) {
      lines.push(generateElement(child, 4));
    }

    lines.push('      </xs:all>');
  }

  // Add attributes
  const attributes = getAttributes(node);
  for (const attr of attributes) {
    lines.push(generateAttribute(attr, 3));
  }

  lines.push('    </xs:complexType>');
  lines.push('  </xs:element>');

  return lines.join('\n');
}

/**
 * Generates a complete XSD 1.1 document from a field tree.
 *
 * @param tree - Root of the field tree (virtual root)
 * @param config - Export configuration
 * @returns XSD document as string
 */
export function generateXsd(tree: FieldTreeNode, config: ExportConfig): string {
  const lines: string[] = [];

  // XML declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');

  // Schema root with XSD 1.1 version declaration
  lines.push('<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"');
  lines.push('           xmlns:vc="http://www.w3.org/2007/XMLSchema-versioning"');
  lines.push('           vc:minVersion="1.1">');
  lines.push('');

  // Add comment with generation info
  const metaStr = Object.entries(config.metadata)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  lines.push(`  <!-- Generated from Ceremony Field Catalog -->`);
  lines.push(`  <!-- Context: ${escapeXml(config.contextId)} -->`);
  if (metaStr) {
    lines.push(`  <!-- Metadata: ${escapeXml(metaStr)} -->`);
  }
  lines.push(`  <!-- Policy: containerCardinality=${config.policy.containerCardinality} -->`);
  lines.push('');

  // Generate root elements
  const rootElements = getRootElements(tree);

  for (const rootNode of rootElements) {
    lines.push(generateRootElement(rootNode));
    lines.push('');
  }

  lines.push('</xs:schema>');

  return lines.join('\n');
}
