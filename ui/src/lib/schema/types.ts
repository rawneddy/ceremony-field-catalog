/**
 * Schema Export Types
 *
 * Interfaces for building hierarchical schemas from flat field paths.
 */

/**
 * Represents a node in the field tree hierarchy.
 * Built from flat CatalogEntry paths to enable hierarchical schema generation.
 */
export interface FieldTreeNode {
  /** Element or attribute name (e.g., "customer", "@version") */
  name: string;

  /** Full XPath-like path (e.g., "/ceremony/customers/customer") */
  fullPath: string;

  /** True if name starts with @ (XML attribute) */
  isAttribute: boolean;

  /** True if no children (may still be mixed content) */
  isLeaf: boolean;

  /** True if observed as BOTH leaf and container */
  isMixedContent: boolean;

  /** Child nodes keyed by name */
  children: Map<string, FieldTreeNode>;

  /** Minimum occurrences (from observation or policy) */
  minOccurs: number;

  /** Maximum occurrences (-1 = unbounded) */
  maxOccurs: number;

  /** True if we have actual observation data for this path */
  hasObservation: boolean;

  /** True if null values were observed (leaf only) */
  allowsNull?: boolean;

  /** True if empty values were observed (leaf only) */
  allowsEmpty?: boolean;
}

/**
 * Container cardinality policy for unobserved containers.
 *
 * - permissive: minOccurs=0, maxOccurs=unbounded (default)
 *   "We can't prove containers are required - we only see what exists."
 *
 * - strict: minOccurs=1, maxOccurs=unbounded
 *   "If leaves were observed inside, assume the container path is always present but may repeat."
 *
 * - strictest: minOccurs=1, maxOccurs=1
 *   "You know your XML schema has singleton containers that never repeat."
 */
export type ContainerCardinalityPolicy = 'permissive' | 'strict' | 'strictest';

/**
 * Schema export policy configuration.
 */
export interface SchemaExportPolicy {
  /** How to handle cardinality for unobserved container paths */
  containerCardinality: ContainerCardinalityPolicy;
}

/**
 * Export format options.
 */
export type ExportFormat = 'xsd' | 'json-schema' | 'csv';

/**
 * XSD version options.
 * Currently only 1.1 is supported (1.0 requires user-defined element ordering).
 */
export type XsdVersion = '1.1' | '1.0';

/**
 * Complete export configuration passed to generators.
 */
export interface ExportConfig {
  format: ExportFormat;
  policy: SchemaExportPolicy;
  xsdVersion: XsdVersion;
  contextId: string;
  metadata: Record<string, string>;
}

/**
 * Default policy values.
 */
export const DEFAULT_POLICY: SchemaExportPolicy = {
  containerCardinality: 'permissive'
};

/**
 * Policy option metadata for UI rendering.
 */
export interface PolicyOptionMeta {
  value: ContainerCardinalityPolicy;
  label: string;
  description: string;
  tooltip: string;
  isDefault?: boolean;
}

/**
 * Container cardinality policy options with UI metadata.
 */
export const CONTAINER_CARDINALITY_OPTIONS: PolicyOptionMeta[] = [
  {
    value: 'permissive',
    label: 'Permissive',
    description: '(0, unbounded)',
    tooltip: "We can't prove containers are required - we only see what exists, not what's missing.",
    isDefault: true
  },
  {
    value: 'strict',
    label: 'Strict',
    description: '(1, unbounded)',
    tooltip: 'If leaves were observed inside, assume the container path is always present but may repeat.'
  },
  {
    value: 'strictest',
    label: 'Strictest',
    description: '(1, 1)',
    tooltip: 'You know your XML schema has singleton containers that never repeat.'
  }
];

/**
 * XSD version options with UI metadata.
 */
export interface XsdVersionOptionMeta {
  value: XsdVersion;
  label: string;
  description: string;
  disabled: boolean;
  disabledReason?: string;
}

export const XSD_VERSION_OPTIONS: XsdVersionOptionMeta[] = [
  {
    value: '1.1',
    label: 'XSD 1.1',
    description: 'Required for order flexibility',
    disabled: false
  },
  {
    value: '1.0',
    label: 'XSD 1.0',
    description: 'Requires defined element order',
    disabled: true,
    disabledReason: 'Not yet available - requires tree view with drag-to-order'
  }
];
