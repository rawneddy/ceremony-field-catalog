import { useQuery } from '@tanstack/react-query';
import { systemApi } from '../services';
import type { SystemHealth, SystemStats } from '../types';

/**
 * Query key factory for system health queries
 */
export const systemQueryKeys = {
  all: ['system'] as const,
  health: () => [...systemQueryKeys.all, 'health'] as const,
  stats: () => [...systemQueryKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch system health status
 * Auto-refreshes every 30 seconds
 */
export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: systemQueryKeys.health(),
    queryFn: systemApi.getHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

/**
 * Hook to fetch system statistics
 * Auto-refreshes every 30 seconds
 */
export function useSystemStats() {
  return useQuery<SystemStats>({
    queryKey: systemQueryKeys.stats(),
    queryFn: systemApi.getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
