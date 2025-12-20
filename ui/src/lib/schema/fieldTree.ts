/**
 * Field Tree Builder
 *
 * Transforms flat CatalogEntry[] into a hierarchical FieldTreeNode structure
 * suitable for generating XSD and JSON Schema.
 */

import type { CatalogEntry } from '../../types/catalog.types';
import type { FieldTreeNode, SchemaExportPolicy } from './types';

/**
 * Creates an empty tree node with default values.
 */
function createNode(name: string, fullPath: string): FieldTreeNode {
  return {
    name,
    fullPath,
    isAttribute: name.startsWith('@'),
    isLeaf: true,
    isMixedContent: false,
    children: new Map(),
    minOccurs: 0,
    maxOccurs: -1, // unbounded by default
    hasObservation: false,
    allowsNull: undefined,
    allowsEmpty: undefined
  };
}

/**
 * Parses a field path into segments.
 * "/ceremony/customers/customer/@id" => ["ceremony", "customers", "customer", "@id"]
 */
function parsePathSegments(fieldPath: string): string[] {
  // Remove leading slash and split
  const normalized = fieldPath.startsWith('/') ? fieldPath.slice(1) : fieldPath;
  return normalized.split('/').filter(Boolean);
}

/**
 * Builds the full path string from segments.
 */
function buildFullPath(segments: string[], upToIndex: number): string {
  return '/' + segments.slice(0, upToIndex + 1).join('/');
}

/**
 * Builds a hierarchical field tree from flat CatalogEntry observations.
 *
 * Algorithm:
 * 1. Create a virtual root node
 * 2. For each entry, walk/create the path in the tree
 * 3. Mark the final node with observation data
 * 4. Detect mixed content (node observed as both leaf and container)
 *
 * @param entries - Flat catalog entries to transform
 * @returns Root node of the tree (virtual, contains actual roots as children)
 */
export function buildFieldTree(entries: CatalogEntry[]): FieldTreeNode {
  // Create virtual root to hold potentially multiple root elements
  const root = createNode('', '');
  root.isLeaf = false;

  for (const entry of entries) {
    const segments = parsePathSegments(entry.fieldPath);
    if (segments.length === 0) continue;

    let currentNode = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      const fullPath = buildFullPath(segments, i);
      const isLastSegment = i === segments.length - 1;

      // Get or create child node
      let childNode = currentNode.children.get(segment);
      if (!childNode) {
        childNode = createNode(segment, fullPath);
        currentNode.children.set(segment, childNode);
      }

      // If we're adding children to an already-observed leaf, it's mixed content
      if (!isLastSegment && childNode.hasObservation && childNode.isLeaf) {
        childNode.isMixedContent = true;
      }

      // Parent nodes are not leaves (unless mixed content)
      if (!isLastSegment) {
        currentNode.isLeaf = false;
      }

      // Mark the final segment with observation data
      if (isLastSegment) {
        // If this node already has children, it's mixed content
        if (childNode.children.size > 0) {
          childNode.isMixedContent = true;
        }

        childNode.hasObservation = true;
        childNode.minOccurs = entry.minOccurs;
        childNode.maxOccurs = entry.maxOccurs;
        childNode.allowsNull = entry.allowsNull;
        childNode.allowsEmpty = entry.allowsEmpty;

        // It's a leaf if it has no children (may change if more entries add children)
        childNode.isLeaf = childNode.children.size === 0;
      }

      currentNode = childNode;
    }
  }

  return root;
}

/**
 * Applies cardinality policy to unobserved container nodes.
 *
 * @param node - Tree node to process (mutates in place)
 * @param policy - Export policy to apply
 * @param hasObservedDescendant - Whether any descendant has observation data
 */
export function applyPolicy(
  node: FieldTreeNode,
  policy: SchemaExportPolicy,
  hasObservedDescendant: boolean = false
): void {
  // First, recursively check if any descendants have observations
  let descendantHasObservation = false;
  for (const child of node.children.values()) {
    const childHasObservedDescendant = child.hasObservation ||
      Array.from(child.children.values()).some(c => c.hasObservation);
    applyPolicy(child, policy, childHasObservedDescendant);
    if (child.hasObservation || childHasObservedDescendant) {
      descendantHasObservation = true;
    }
  }

  // Apply policy to unobserved containers
  if (!node.hasObservation && node.children.size > 0) {
    const hasObservedChild = descendantHasObservation || hasObservedDescendant;

    switch (policy.containerCardinality) {
      case 'permissive':
        // minOccurs=0, maxOccurs=unbounded
        node.minOccurs = 0;
        node.maxOccurs = -1;
        break;

      case 'strict':
        // minOccurs=1 if children observed, maxOccurs=unbounded
        node.minOccurs = hasObservedChild ? 1 : 0;
        node.maxOccurs = -1;
        break;

      case 'strictest':
        // minOccurs=1, maxOccurs=1 (singleton containers)
        node.minOccurs = hasObservedChild ? 1 : 0;
        node.maxOccurs = 1;
        break;
    }
  }
}

/**
 * Builds a field tree from entries and applies the given policy.
 *
 * @param entries - Catalog entries to transform
 * @param policy - Export policy to apply
 * @returns Root node with policy applied
 */
export function buildFieldTreeWithPolicy(
  entries: CatalogEntry[],
  policy: SchemaExportPolicy
): FieldTreeNode {
  const root = buildFieldTree(entries);
  applyPolicy(root, policy);
  return root;
}

/**
 * Debug utility: Prints the tree structure to console.
 */
export function printTree(node: FieldTreeNode, indent: string = ''): void {
  const flags = [
    node.hasObservation ? 'observed' : 'inferred',
    node.isLeaf ? 'leaf' : 'container',
    node.isMixedContent ? 'mixed' : null,
    node.isAttribute ? 'attr' : null
  ].filter(Boolean).join(', ');

  const cardinality = `[${node.minOccurs}, ${node.maxOccurs === -1 ? '∞' : node.maxOccurs}]`;

  console.log(`${indent}${node.name || '(root)'} ${cardinality} (${flags})`);

  for (const child of node.children.values()) {
    printTree(child, indent + '  ');
  }
}

/**
 * Gets the root element nodes (first-level children of virtual root).
 */
export function getRootElements(tree: FieldTreeNode): FieldTreeNode[] {
  return Array.from(tree.children.values()).filter(n => !n.isAttribute);
}

/**
 * Gets attribute nodes from a parent.
 */
export function getAttributes(node: FieldTreeNode): FieldTreeNode[] {
  return Array.from(node.children.values()).filter(n => n.isAttribute);
}

/**
 * Gets element (non-attribute) children from a parent.
 */
export function getElementChildren(node: FieldTreeNode): FieldTreeNode[] {
  return Array.from(node.children.values()).filter(n => !n.isAttribute);
}
