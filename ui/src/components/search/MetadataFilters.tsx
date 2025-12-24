import React from 'react';
import type { Context } from '../../types';
import { TagInput } from '../ui';

interface MetadataFiltersProps {
  context: Context;
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
}

const MetadataFilters: React.FC<MetadataFiltersProps> = ({ context, values, onChange }) => {
  const allMetadataKeys = [...context.requiredMetadata, ...(context.optionalMetadata || [])];

  // Build cascading filter metadata from already-selected values
  // For each TagInput, we pass other fields' selections so suggestions are constrained
  const buildCascadingMetadata = (excludeKey: string): Record<string, string> => {
    const metadata: Record<string, string> = {};
    for (const [key, vals] of Object.entries(values)) {
      // Skip the field we're currently editing and empty selections
      if (key === excludeKey || !vals || vals.length === 0) continue;
      // Use first selected value for cascading (API expects single values)
      const firstVal = vals[0];
      if (firstVal) {
        metadata[key] = firstVal;
      }
    }
    return metadata;
  };

  return (
    <div className="flex flex-wrap gap-4">
      {allMetadataKeys.map((key) => (
        <div key={key} className="min-w-[160px] flex-1 max-w-xs">
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
            {key}
          </label>
          <TagInput
            field={`metadata.${key}`}
            values={values[key] || []}
            onChange={(vals) => onChange(key, vals)}
            contextId={context.contextId}
            metadata={buildCascadingMetadata(key)}
            placeholder={`Filter by ${key}...`}
          />
        </div>
      ))}
    </div>
  );
};

export default MetadataFilters;
