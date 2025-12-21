import React from 'react';
import type { Context } from '../../types';
import { TagInput } from '../ui';

interface InlineOptionalMetadataProps {
  context: Context;
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  /** Required metadata values for cascading suggestions */
  requiredMetadata: Record<string, string>;
}

/**
 * Inline optional metadata inputs for the header row.
 * Renders as a horizontal flex layout that fits alongside required metadata.
 * Supports multi-value selection for each field.
 */
const InlineOptionalMetadata: React.FC<InlineOptionalMetadataProps> = ({
  context,
  values,
  onChange,
  requiredMetadata
}) => {
  const optionalKeys = context.optionalMetadata || [];

  // Build cascading metadata context for each field
  const getMetadataForField = (currentKey: string): Record<string, string> => {
    const metadata: Record<string, string> = {};

    // Add all required metadata
    for (const [key, value] of Object.entries(requiredMetadata)) {
      if (value?.trim()) {
        metadata[key] = value;
      }
    }

    // Add other optional metadata (first value only for suggestion filtering)
    for (const [key, vals] of Object.entries(values)) {
      if (key !== currentKey && vals.length > 0 && vals[0]) {
        metadata[key] = vals[0];
      }
    }

    return metadata;
  };

  if (optionalKeys.length === 0) {
    return null;
  }

  return (
    <div className="flex items-end gap-4">
      {optionalKeys.map((key) => {
        const cascadingMetadata = getMetadataForField(key);

        return (
          <div key={key} className="min-w-[160px]">
            <TagInput
              field={`metadata.${key}`}
              values={values[key] || []}
              onChange={(vals) => onChange(key, vals)}
              contextId={context.contextId}
              metadata={Object.keys(cascadingMetadata).length > 0 ? cascadingMetadata : undefined}
              placeholder={`${key}...`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default InlineOptionalMetadata;
