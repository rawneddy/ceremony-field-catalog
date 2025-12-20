import type { CatalogSearchRequest } from '../types';

/**
 * Centralized query key factory for React Query.
 * Prevents typos and enables IDE autocomplete for cache invalidation.
 */
export const queryKeys = {
  // Context queries
  contexts: {
    all: ['contexts'] as const,
    list: (includeCounts?: boolean) => ['contexts', { includeCounts }] as const,
  },

  // Field search queries
  fields: {
    all: ['fields'] as const,
    search: (scope: string, request: CatalogSearchRequest) =>
      ['fields', scope, request] as const,
  },

  // Autocomplete/suggestion queries
  suggestions: {
    all: ['suggestions'] as const,
    forField: (field: string, prefix: string, contextId?: string) =>
      ['suggestions', field, prefix, contextId] as const,
  },
} as const;
