import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { AggregatedField, CatalogEntry } from '../../types';
import { formatSchemaKey } from '../../types';
import { X, ExternalLink, Layers, Clock, Filter, Eye, EyeOff } from 'lucide-react';
import { TriStateBadge } from '../ui';
import OptionalMetadataIndicator from '../ui/OptionalMetadataIndicator';
import { config } from '../../config';

/**
 * State to preserve when navigating from Discovery to Schema,
 * allowing return to Discovery in the same state.
 */
export interface DiscoveryReturnState {
  returnTo: 'discovery';
  fieldPath: string;
  discoveryState: {
    contextId: string;
    metadata: Record<string, string[]>;
    facetFilters: Record<string, string[]>;
    facetModes: Record<string, 'any' | 'all'>;
    searchQuery: string;
    isRegex: boolean;
    selectedFieldPath: string;
  };
}

interface VariantExplorerPanelProps {
  aggregatedField: AggregatedField;
  onClose: () => void;
  /** Active facet filters - used to highlight/filter variants */
  facetFilters?: Record<string, string[]>;
  /** Full discovery state for return navigation */
  discoveryState?: Omit<DiscoveryReturnState['discoveryState'], 'selectedFieldPath'>;
}

/**
 * Build URL for linking to Schema Search with pre-filled values.
 * Uses `highlight` param to scroll to the field without filtering.
 * Only uses required metadata since that defines the schema variant.
 */
const buildSchemaSearchUrl = (entry: CatalogEntry): string => {
  const params = new URLSearchParams();
  params.set('contextId', entry.contextId);

  // Add required metadata with meta_ prefix (these define the schema variant)
  if (entry.requiredMetadata) {
    Object.entries(entry.requiredMetadata).forEach(([key, value]) => {
      params.set(`meta_${key}`, value);
    });
  }

  // Use highlight param to scroll to field without filtering results
  params.set('highlight', entry.fieldPath);

  return `/schema?${params.toString()}`;
};

/**
 * Check if a variant matches the active facet filters.
 * Checks both required metadata (single values) and optional metadata (arrays).
 */
const variantMatchesFilters = (
  variant: CatalogEntry,
  filters: Record<string, string[]>
): boolean => {
  // If no filters, everything matches
  if (Object.keys(filters).length === 0) return true;

  // Variant must match ALL filter keys (AND between keys)
  // For each key, variant must have at least one matching value (OR within key)
  return Object.entries(filters).every(([key, selectedValues]) => {
    if (selectedValues.length === 0) return true;

    if (key === 'contextId') {
      return selectedValues.includes(variant.contextId);
    } else {
      // Check required metadata first (single value)
      const reqValue = variant.requiredMetadata?.[key];
      if (reqValue !== undefined && selectedValues.includes(reqValue)) {
        return true;
      }

      // Check optional metadata (array of values)
      const optValues = variant.optionalMetadata?.[key];
      if (optValues && optValues.some(v => selectedValues.includes(v))) {
        return true;
      }

      return false;
    }
  });
};

/**
 * Slide-out panel showing all variants of a field path.
 * Used by Discovery page to explore field behavior across schema variants.
 * Allows drilling down to Field Search with pre-filled context + metadata.
 */
const VariantExplorerPanel: React.FC<VariantExplorerPanelProps> = ({
  aggregatedField,
  onClose,
  facetFilters = {},
  discoveryState
}) => {
  const [showAllVariants, setShowAllVariants] = useState(false);

  // Partition variants into matching and non-matching
  const { matchingVariants, hiddenVariants, hasActiveFilters } = useMemo(() => {
    const hasFilters = Object.keys(facetFilters).length > 0;
    if (!hasFilters) {
      return {
        matchingVariants: aggregatedField.variants,
        hiddenVariants: [] as CatalogEntry[],
        hasActiveFilters: false
      };
    }

    const matching: CatalogEntry[] = [];
    const hidden: CatalogEntry[] = [];

    for (const variant of aggregatedField.variants) {
      if (variantMatchesFilters(variant, facetFilters)) {
        matching.push(variant);
      } else {
        hidden.push(variant);
      }
    }

    return {
      matchingVariants: matching,
      hiddenVariants: hidden,
      hasActiveFilters: true
    };
  }, [aggregatedField.variants, facetFilters]);

  // Determine which variants to display
  const displayedVariants = showAllVariants
    ? aggregatedField.variants
    : matchingVariants;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div
      className="w-[620px] bg-white border-l border-steel shadow-2xl flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right sticky top-0 h-full"
      style={{ animationDuration: `${config.DETAIL_PANEL_ANIMATION_MS}ms` }}
    >
      {/* Header */}
      <div className="p-6 border-b border-steel bg-paper">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-ink">Field Variants</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-steel transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Field Path */}
        <div className="bg-ink text-paper p-4 rounded font-mono text-sm break-all leading-relaxed">
          {aggregatedField.fieldPath}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-ceremony" />
            <span className="font-bold text-ink">{aggregatedField.variantCount}</span>
            <span className="text-slate-500">schema variants</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Null:</span>
            <TriStateBadge value={aggregatedField.allowsNull} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Empty:</span>
            <TriStateBadge value={aggregatedField.allowsEmpty} />
          </div>
        </div>
      </div>

      {/* Filter Info Bar - shown when facet filters are active */}
      {hasActiveFilters && hiddenVariants.length > 0 && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800">
              {showAllVariants ? (
                <>Showing all <span className="font-bold">{aggregatedField.variantCount}</span> variants</>
              ) : (
                <>
                  Showing <span className="font-bold">{matchingVariants.length}</span> of{' '}
                  <span className="font-bold">{aggregatedField.variantCount}</span> variants
                </>
              )}
            </span>
            {!showAllVariants && (
              <span className="text-amber-600 text-xs">
                ({hiddenVariants.length} hidden by filters)
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAllVariants(!showAllVariants)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded transition-colors"
          >
            {showAllVariants ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Show matching only
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                Show all variants
              </>
            )}
          </button>
        </div>
      )}

      {/* Variants Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-paper z-10">
            <tr className="border-b border-steel">
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Schema Key
              </th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-16">
                Min
              </th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-16">
                Max
              </th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-16">
                Null
              </th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-16">
                Empty
              </th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-10">
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel/50">
            {displayedVariants.map((variant) => {
              const isHiddenByFilter = showAllVariants && !variantMatchesFilters(variant, facetFilters);
              return (
                <tr
                  key={variant.id}
                  className={`group transition-colors ${
                    isHiddenByFilter
                      ? 'bg-slate-50 opacity-50'
                      : 'hover:bg-ceremony/5'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isHiddenByFilter && (
                        <span title="Hidden by filters">
                          <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                        </span>
                      )}
                      <div
                        className={`font-medium text-sm truncate cursor-help ${
                          isHiddenByFilter ? 'text-slate-400' : 'text-ink'
                        }`}
                        title={`ID: ${variant.id}`}
                      >
                        {formatSchemaKey(variant)}
                      </div>
                      <OptionalMetadataIndicator metadata={variant.optionalMetadata} />
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-center text-sm font-medium ${
                    isHiddenByFilter ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {variant.minOccurs}
                  </td>
                  <td className={`px-3 py-3 text-center text-sm font-medium ${
                    isHiddenByFilter ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {variant.maxOccurs === -1 ? '∞' : variant.maxOccurs}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <BooleanIndicator value={variant.allowsNull} dimmed={isHiddenByFilter} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <BooleanIndicator value={variant.allowsEmpty} dimmed={isHiddenByFilter} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Link
                      to={buildSchemaSearchUrl(variant)}
                      state={discoveryState ? {
                        returnTo: 'discovery',
                        fieldPath: aggregatedField.fieldPath,
                        discoveryState: {
                          ...discoveryState,
                          selectedFieldPath: aggregatedField.fieldPath
                        }
                      } as DiscoveryReturnState : undefined}
                      className={`inline-block p-1 transition-colors ${
                        isHiddenByFilter
                          ? 'text-slate-300 hover:text-slate-400'
                          : 'text-slate-300 hover:text-ceremony'
                      }`}
                      title="View in Schema Search"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with Timeline */}
      <div className="p-4 border-t border-steel bg-paper">
        <div className="flex items-center gap-2 mb-2 text-slate-400">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">Discovery Timeline</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400 text-xs">First seen:</span>
            <span className="ml-2 font-mono text-xs text-ink">
              {formatDate(aggregatedField.firstObservedAt)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Last seen:</span>
            <span className="ml-2 font-mono text-xs text-ink">
              {formatDate(aggregatedField.lastObservedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple yes/no indicator for variant rows.
 */
const BooleanIndicator = ({ value, dimmed = false }: { value: boolean; dimmed?: boolean }) => (
  <span className={`text-xs font-bold ${
    dimmed
      ? 'text-slate-300'
      : value
        ? 'text-amber-600'
        : 'text-slate-400'
  }`}>
    {value ? 'Y' : 'N'}
  </span>
);

export default VariantExplorerPanel;
