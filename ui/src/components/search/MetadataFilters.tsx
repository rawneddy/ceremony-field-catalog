import React from 'react';
import type { Context } from '../../types';
import { TagInput } from '../ui';

interface MetadataFiltersProps {
  context: Context;
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
}

const MetadataFilters: React.FC<MetadataFiltersProps> = ({ context, values, onChange }) => {
  const allMetadataKeys = [...context.requiredMetadata, ...context.optionalMetadata];

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
            placeholder={`Filter by ${key}...`}
          />
        </div>
      ))}
    </div>
  );
};

export default MetadataFilters;
