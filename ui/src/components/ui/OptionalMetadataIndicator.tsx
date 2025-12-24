import React from 'react';
import { Tag } from 'lucide-react';
import Tooltip from './Tooltip';

interface OptionalMetadataIndicatorProps {
  /** The optional metadata - keys are metadata field names, values are arrays of observed values */
  metadata: Record<string, string[]> | null | undefined;
  /** Max values to show per key before truncating */
  maxValuesPerKey?: number;
}

/**
 * Compact indicator showing optional metadata with hover tooltip.
 * Shows a tag icon with counts (keys · total values).
 * Hover reveals full metadata details organized by key.
 */
const OptionalMetadataIndicator: React.FC<OptionalMetadataIndicatorProps> = ({
  metadata,
  maxValuesPerKey = 10,
}) => {
  // Handle null/undefined/empty metadata
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const keys = Object.keys(metadata).sort();
  const totalValues = Object.values(metadata).reduce((sum, arr) => sum + arr.length, 0);

  const tooltipContent = (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
        Optional Metadata
      </div>
      {keys.map((key) => {
        const values = metadata[key] ?? [];
        const displayValues = values.slice(0, maxValuesPerKey);
        const hasMore = values.length > maxValuesPerKey;

        return (
          <div key={key} className="text-xs">
            <span className="font-semibold text-ceremony">{key}:</span>
            <div className="ml-2 mt-0.5 flex flex-wrap gap-1">
              {displayValues.map((value, idx) => (
                <span
                  key={idx}
                  className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-paper/90"
                >
                  {value}
                </span>
              ))}
              {hasMore && (
                <span className="inline-block px-1.5 py-0.5 text-paper/60 italic">
                  +{values.length - maxValuesPerKey} more
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
        {keys.length} {keys.length === 1 ? 'key' : 'keys'} · {totalValues} total {totalValues === 1 ? 'value' : 'values'}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="right" maxWidth={400}>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded cursor-help hover:bg-slate-200 transition-colors">
        <Tag className="w-3 h-3" />
        <span className="font-medium">{keys.length}</span>
        <span className="text-slate-400">·</span>
        <span className="font-medium">{totalValues}</span>
      </span>
    </Tooltip>
  );
};

export default OptionalMetadataIndicator;
