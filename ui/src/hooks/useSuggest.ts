import { useState, useEffect } from 'react';
import { catalogApi } from '../services/catalogApi';
import { useDebounce } from './useDebounce';
import { config } from '../config';

export const useSuggest = (field: string, prefix: string, contextId?: string, metadata?: Record<string, string>) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedPrefix = useDebounce(prefix, config.AUTOCOMPLETE_DEBOUNCE_MS);

  useEffect(() => {
    if (!debouncedPrefix) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const results = await catalogApi.suggest(field, debouncedPrefix, contextId, metadata);
        setSuggestions(results);
      } catch {
        // Silently fail - suggestions are non-critical
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [field, debouncedPrefix, contextId, metadata]);

  return suggestions;
};
