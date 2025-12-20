import { useState, useEffect, useRef } from 'react';
import { catalogApi } from '../services/catalogApi';
import { useDebounce } from './useDebounce';
import { config } from '../config';

export const useSuggest = (
  field: string,
  prefix: string,
  contextId?: string,
  metadata?: Record<string, string>,
  enabled: boolean = true
) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedPrefix = useDebounce(prefix, config.AUTOCOMPLETE_DEBOUNCE_MS);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        // Allow empty prefix - backend returns initial suggestions
        const results = await catalogApi.suggest(field, debouncedPrefix || '', contextId, metadata);
        setSuggestions(results);
      } catch {
        // Silently fail - suggestions are non-critical
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [field, debouncedPrefix, contextId, metadata, enabled]);

  return { suggestions, isLoading };
};
