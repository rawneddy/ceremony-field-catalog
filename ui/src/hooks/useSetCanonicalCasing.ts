import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../services/catalogApi';
import { queryKeys } from '../utils/queryKeys';
import type { CatalogEntry } from '../types';

interface SetCanonicalCasingParams {
  fieldId: string;
  canonicalCasing: string | null;
}

/**
 * Hook for setting the canonical casing of a field entry.
 * Invalidates field search queries on success to refresh the UI.
 */
export const useSetCanonicalCasing = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ fieldId, canonicalCasing }: SetCanonicalCasingParams) =>
      catalogApi.setCanonicalCasing(fieldId, canonicalCasing),
    onSuccess: (updatedEntry: CatalogEntry) => {
      // Invalidate field search queries to refresh the table
      queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });

      // Optionally update the specific entry in the cache
      // This provides immediate feedback without waiting for refetch
      queryClient.setQueriesData(
        { queryKey: queryKeys.fields.all },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object') return oldData;
          const data = oldData as { content?: CatalogEntry[] };
          if (!data.content) return oldData;

          return {
            ...data,
            content: data.content.map((entry: CatalogEntry) =>
              entry.id === updatedEntry.id ? updatedEntry : entry
            ),
          };
        }
      );
    },
  });

  return {
    setCanonicalCasing: mutation.mutateAsync,
    isSettingCasing: mutation.isPending,
    error: mutation.error,
  };
};
