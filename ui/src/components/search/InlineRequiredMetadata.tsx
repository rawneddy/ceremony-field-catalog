import React from 'react';
import type { Context } from '../../types';
import { TagInput } from '../ui';

interface InlineRequiredMetadataProps {
  context: Context;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * Inline required metadata inputs for the header row.
 * Renders as a horizontal flex layout that fits alongside the context selector.
 * Uses cascading suggestions - each field constrains the others.
 */
const InlineRequiredMetadata: React.FC<InlineRequiredMetadataProps> = ({
  context,
  values,
  onChange
}) => {
  const requiredKeys = context.requiredMetadata || [];

  // Build cascading metadata context for each field
  const getMetadataForField = (currentKey: string): Record<string, string> => {
    const otherMetadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key !== currentKey && value?.trim()) {
        otherMetadata[key] = value;
      }
    }
    return otherMetadata;
  };

  if (requiredKeys.length === 0) {
    return null;
  }

  return (
    <div className="flex items-end gap-4">
      {requiredKeys.map((key, index) => {
        const cascadingMetadata = getMetadataForField(key);
        const isLast = index === requiredKeys.length - 1;

        return (
          <div key={key} className="min-w-[160px]">
            <TagInput
              field={`metadata.${key}`}
              values={values[key] ? [values[key]] : []}
              onChange={(vals) => onChange(key, vals[0] || '')}
              contextId={context.contextId}
              metadata={Object.keys(cascadingMetadata).length > 0 ? cascadingMetadata : undefined}
              placeholder={`${key}...`}
              maxValues={1}
              disableAutoAdvance={isLast}
            />
          </div>
        );
      })}
    </div>
  );
};

export default InlineRequiredMetadata;
