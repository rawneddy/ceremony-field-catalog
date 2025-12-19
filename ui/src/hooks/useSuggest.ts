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

    // Trigger immediately for / (start of fieldPath), or after 2 chars for other fields
    const isPathStart = field === 'fieldPath' && debouncedPrefix === '/';
    if (debouncedPrefix.length < 2 && !isPathStart) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const results = await catalogApi.suggest(field, debouncedPrefix, contextId, metadata);
        setSuggestions(results);
      } catch (error) {
        console.error('Failed to fetch suggestions', error);
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [field, debouncedPrefix, contextId, metadata]);

  return suggestions;
};
