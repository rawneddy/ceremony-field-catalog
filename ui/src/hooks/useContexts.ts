import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../services/catalogApi';

export const useContexts = (includeCounts = false) => {
  return useQuery({
    queryKey: ['contexts', includeCounts],
    queryFn: () => catalogApi.getContexts(includeCounts),
  });
};
