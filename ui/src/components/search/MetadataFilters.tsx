import React from 'react';
import type { Context } from '../../types';
import { SuggestionInput } from '../ui';

interface MetadataFiltersProps {
  context: Context;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const MetadataFilters: React.FC<MetadataFiltersProps> = ({ context, values, onChange }) => {
  const allMetadataKeys = [...context.requiredMetadata, ...context.optionalMetadata];

  return (
    <div className="grid grid-cols-4 gap-4">
      {allMetadataKeys.map((key) => (
        <div key={key}>
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
            {key}
          </label>
          <SuggestionInput
            field={`metadata.${key}`}
            value={values[key] || ''}
            onChange={(val) => onChange(key, val)}
            contextId={context.contextId}
            placeholder={`Filter by ${key}...`}
          />
        </div>
      ))}
    </div>
  );
};

export default MetadataFilters;
