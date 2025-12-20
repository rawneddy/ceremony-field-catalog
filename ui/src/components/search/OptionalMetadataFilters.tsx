import React from 'react';
import type { Context } from '../../types';
import { TagInput } from '../ui';

interface OptionalMetadataFiltersProps {
  context: Context;
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  /** Required metadata values for cascading suggestions */
  requiredMetadata: Record<string, string>;
}

/**
 * Renders optional metadata fields as multi-value TagInput filters.
 * Supports OR within each field (multiple values) and AND between fields.
 * Suggestions cascade based on context + required metadata + other optional selections.
 */
const OptionalMetadataFilters: React.FC<OptionalMetadataFiltersProps> = ({
  context,
  values,
  onChange,
  requiredMetadata
}) => {
  const optionalKeys = context.optionalMetadata || [];

  // Build cascading metadata context for each field
  // Includes required metadata + all OTHER optional metadata selections
  const getMetadataForField = (currentKey: string): Record<string, string> => {
    const metadata: Record<string, string> = {};

    // Add all required metadata
    for (const [key, value] of Object.entries(requiredMetadata)) {
      if (value?.trim()) {
        metadata[key] = value;
      }
    }

    // Add other optional metadata (first value only for suggestion filtering)
    // This creates AND behavior - if you selected ABC in field1, field2 suggestions
    // are constrained to values that co-exist with ABC
    for (const [key, vals] of Object.entries(values)) {
      if (key !== currentKey && vals.length > 0 && vals[0]) {
        // Use first value for cascading (simplification)
        metadata[key] = vals[0];
      }
    }

    return metadata;
  };

  if (optionalKeys.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {optionalKeys.map((key) => {
        const cascadingMetadata = getMetadataForField(key);

        return (
          <div key={key} className="min-w-[160px] flex-1 max-w-xs">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
              {key}
            </label>
            <TagInput
              field={`metadata.${key}`}
              values={values[key] || []}
              onChange={(vals) => onChange(key, vals)}
              contextId={context.contextId}
              metadata={Object.keys(cascadingMetadata).length > 0 ? cascadingMetadata : undefined}
              placeholder={`Filter by ${key}...`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default OptionalMetadataFilters;
