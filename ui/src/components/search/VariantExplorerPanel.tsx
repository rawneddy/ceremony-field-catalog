import React from 'react';
import { Link } from 'react-router-dom';
import type { AggregatedField, CatalogEntry } from '../../types';
import { formatSchemaKey } from '../../types';
import { X, ExternalLink, Layers, Clock } from 'lucide-react';
import { TriStateBadge } from '../ui';
import { config } from '../../config';

interface VariantExplorerPanelProps {
  aggregatedField: AggregatedField;
  onClose: () => void;
}

/**
 * Build URL for linking to Schema Search with pre-filled values.
 * Uses `highlight` param to scroll to the field without filtering.
 */
const buildSchemaSearchUrl = (entry: CatalogEntry): string => {
  const params = new URLSearchParams();
  params.set('contextId', entry.contextId);

  // Add metadata with meta_ prefix
  Object.entries(entry.metadata).forEach(([key, value]) => {
    params.set(`meta_${key}`, value);
  });

  // Use highlight param to scroll to field without filtering results
  params.set('highlight', entry.fieldPath);

  return `/search?${params.toString()}`;
};

/**
 * Slide-out panel showing all variants of a field path.
 * Used by Discovery page to explore field behavior across schema variants.
 * Allows drilling down to Field Search with pre-filled context + metadata.
 */
const VariantExplorerPanel: React.FC<VariantExplorerPanelProps> = ({
  aggregatedField,
  onClose
}) => {

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
            {aggregatedField.variants.map((variant) => (
              <tr
                key={variant.id}
                className="group hover:bg-ceremony/5 transition-colors"
              >
                <td className="px-4 py-3">
                  <div
                    className="font-medium text-sm text-ink truncate cursor-help"
                    title={`ID: ${variant.id}`}
                  >
                    {formatSchemaKey(variant)}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-sm font-medium text-slate-600">
                  {variant.minOccurs}
                </td>
                <td className="px-3 py-3 text-center text-sm font-medium text-slate-600">
                  {variant.maxOccurs === -1 ? '∞' : variant.maxOccurs}
                </td>
                <td className="px-3 py-3 text-center">
                  <BooleanIndicator value={variant.allowsNull} />
                </td>
                <td className="px-3 py-3 text-center">
                  <BooleanIndicator value={variant.allowsEmpty} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Link
                    to={buildSchemaSearchUrl(variant)}
                    className="inline-block text-slate-300 hover:text-ceremony transition-colors p-1"
                    title="View in Schema Search"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
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
const BooleanIndicator = ({ value }: { value: boolean }) => (
  <span className={`text-xs font-bold ${value ? 'text-amber-600' : 'text-slate-400'}`}>
    {value ? 'Y' : 'N'}
  </span>
);

export default VariantExplorerPanel;
