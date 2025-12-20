import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../services/catalogApi';
import { queryKeys } from '../utils/queryKeys';

export const useContexts = (includeCounts = false) => {
  return useQuery({
    queryKey: queryKeys.contexts.list(includeCounts),
    queryFn: () => catalogApi.getContexts(includeCounts),
  });
};
