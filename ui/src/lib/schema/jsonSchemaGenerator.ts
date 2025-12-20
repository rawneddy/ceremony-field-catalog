/**
 * JSON Schema Generator
 *
 * Generates hierarchical JSON Schema (draft 2020-12) from a FieldTreeNode structure.
 */

import type { FieldTreeNode, ExportConfig } from './types';
import { getAttributes, getElementChildren, getRootElements } from './fieldTree';

/**
 * JSON Schema type definitions
 */
interface JsonSchemaProperty {
  type?: string | string[];
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  required?: string[];
  minItems?: number;
  maxItems?: number;
  oneOf?: JsonSchemaProperty[];
  description?: string;
}

interface JsonSchema {
  $schema: string;
  $id?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/**
 * Generates a JSON Schema property for a leaf node.
 */
function generateLeafProperty(node: FieldTreeNode): JsonSchemaProperty {
  // Determine base type
  const baseType = node.allowsNull ? ['string', 'null'] : 'string';

  // If maxOccurs > 1, wrap in array
  if (node.maxOccurs === -1 || node.maxOccurs > 1) {
    return {
      type: 'array',
      items: { type: baseType },
      minItems: node.minOccurs,
      ...(node.maxOccurs !== -1 && { maxItems: node.maxOccurs })
    };
  }

  return { type: baseType };
}

/**
 * Generates a JSON Schema property for a complex node (has children).
 */
function generateComplexProperty(node: FieldTreeNode): JsonSchemaProperty {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  // Process element children
  const elementChildren = getElementChildren(node);
  for (const child of elementChildren) {
    const propName = child.name;
    properties[propName] = generateProperty(child);

    // Add to required if minOccurs >= 1
    if (child.minOccurs >= 1) {
      required.push(propName);
    }
  }

  // Process attributes (treated as regular properties)
  const attributes = getAttributes(node);
  for (const attr of attributes) {
    const propName = attr.name.slice(1); // Remove @ prefix
    properties[propName] = generateProperty(attr);

    if (attr.minOccurs >= 1) {
      required.push(propName);
    }
  }

  const objectSchema: JsonSchemaProperty = {
    type: 'object',
    properties
  };

  if (required.length > 0) {
    objectSchema.required = required;
  }

  // If maxOccurs > 1, wrap in array
  if (node.maxOccurs === -1 || node.maxOccurs > 1) {
    return {
      type: 'array',
      items: objectSchema,
      minItems: node.minOccurs,
      ...(node.maxOccurs !== -1 && { maxItems: node.maxOccurs })
    };
  }

  return objectSchema;
}

/**
 * Generates a JSON Schema property for a mixed content node.
 * Uses oneOf to allow either string or object with children.
 */
function generateMixedContentProperty(node: FieldTreeNode): JsonSchemaProperty {
  const objectSchema = generateComplexProperty(node);

  // For mixed content, allow either a string or the object structure
  const mixedSchema: JsonSchemaProperty = {
    oneOf: [
      { type: node.allowsNull ? ['string', 'null'] : 'string' },
      // If it's already an array, extract the items schema
      objectSchema.type === 'array' && objectSchema.items
        ? { type: 'object', ...objectSchema.items }
        : objectSchema
    ]
  };

  // If the complex property was an array, wrap the oneOf in array
  if (objectSchema.type === 'array') {
    return {
      type: 'array',
      items: mixedSchema,
      minItems: node.minOccurs,
      ...(node.maxOccurs !== -1 && { maxItems: node.maxOccurs })
    };
  }

  return mixedSchema;
}

/**
 * Generates a JSON Schema property for any node (dispatches based on type).
 */
function generateProperty(node: FieldTreeNode): JsonSchemaProperty {
  // Mixed content: can be either text or structured
  if (node.isMixedContent) {
    return generateMixedContentProperty(node);
  }

  // Complex: has children
  if (node.children.size > 0) {
    return generateComplexProperty(node);
  }

  // Simple leaf
  return generateLeafProperty(node);
}

/**
 * Generates a complete JSON Schema document from a field tree.
 *
 * @param tree - Root of the field tree (virtual root)
 * @param config - Export configuration
 * @returns JSON Schema as object (can be stringified)
 */
export function generateJsonSchema(tree: FieldTreeNode, config: ExportConfig): JsonSchema {
  const rootElements = getRootElements(tree);

  // Build properties from root elements
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const rootNode of rootElements) {
    properties[rootNode.name] = generateProperty(rootNode);

    if (rootNode.minOccurs >= 1) {
      required.push(rootNode.name);
    }
  }

  // Build metadata string for $id
  const metaParts = Object.entries(config.metadata)
    .map(([k, v]) => `${k}/${v}`)
    .join('/');

  const schema: JsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `ceremony-catalog://${config.contextId}${metaParts ? '/' + metaParts : ''}`,
    title: `${config.contextId} Schema`,
    description: `Generated from Ceremony Field Catalog. Policy: containerCardinality=${config.policy.containerCardinality}`,
    type: 'object',
    properties
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Generates JSON Schema as a formatted string.
 */
export function generateJsonSchemaString(tree: FieldTreeNode, config: ExportConfig): string {
  const schema = generateJsonSchema(tree, config);
  return JSON.stringify(schema, null, 2);
}
