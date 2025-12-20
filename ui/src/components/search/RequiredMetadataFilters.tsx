import React from 'react';
import type { Context } from '../../types';
import { TagInput } from '../ui';

interface RequiredMetadataFiltersProps {
  context: Context;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  showValidation?: boolean;
}

/**
 * Renders required metadata fields as single-value TagInput filters.
 * Used by Field Search page to enforce selection of all required metadata
 * before allowing schema search/export.
 */
const RequiredMetadataFilters: React.FC<RequiredMetadataFiltersProps> = ({
  context,
  values,
  onChange,
  showValidation = false
}) => {
  const requiredKeys = context.requiredMetadata || [];

  if (requiredKeys.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic">
        No required metadata for this context
      </div>
    );
  }

  // Build cascading metadata context for each field
  // Each field sees all OTHER selected values as constraints
  const getMetadataForField = (currentKey: string): Record<string, string> => {
    const otherMetadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key !== currentKey && value?.trim()) {
        otherMetadata[key] = value;
      }
    }
    return otherMetadata;
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {requiredKeys.map((key) => {
        const hasValue = !!values[key]?.trim();
        const showError = showValidation && !hasValue;
        const cascadingMetadata = getMetadataForField(key);

        return (
          <div key={key}>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
              {key}
              <span className="text-error-500 ml-0.5">*</span>
            </label>
            <div className={showError ? 'ring-1 ring-error-500 rounded' : ''}>
              <TagInput
                field={`metadata.${key}`}
                values={values[key] ? [values[key]] : []}
                onChange={(vals) => onChange(key, vals[0] || '')}
                contextId={context.contextId}
                metadata={Object.keys(cascadingMetadata).length > 0 ? cascadingMetadata : undefined}
                placeholder={`Select ${key}...`}
                maxValues={1}
              />
            </div>
            {showError && (
              <p className="text-[9px] text-error-500 mt-0.5 font-medium">
                Required
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RequiredMetadataFilters;
