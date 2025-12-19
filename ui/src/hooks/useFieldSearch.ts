import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../services/catalogApi';
import type { CatalogSearchRequest } from '../types';

export const useFieldSearch = (request: CatalogSearchRequest) => {
  return useQuery({
    queryKey: ['fields', request],
    queryFn: () => catalogApi.searchFields(request),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
