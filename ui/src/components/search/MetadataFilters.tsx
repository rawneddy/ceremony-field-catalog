import React, { useState } from 'react';
import type { Context } from '../../types';
import { useSuggest } from '../../hooks/useSuggest';

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
        <MetadataInput 
          key={key} 
          metadataKey={key} 
          contextId={context.contextId} 
          value={values[key] || ''} 
          onChange={(val) => onChange(key, val)} 
        />
      ))}
    </div>
  );
};

const MetadataInput = ({ 
  metadataKey, 
  contextId, 
  value, 
  onChange 
}: { 
  metadataKey: string; 
  contextId: string; 
  value: string; 
  onChange: (val: string) => void 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useSuggest(`metadata.${metadataKey}`, value, contextId);

  return (
    <div className="relative">
      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{metadataKey}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="w-full bg-white border border-steel rounded px-3 py-1.5 text-xs focus:outline-none focus:border-ceremony font-medium"
        placeholder={`Filter by ${metadataKey}...`}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-steel rounded shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-paper transition-colors font-medium border-b border-steel/50 last:border-0"
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MetadataFilters;
