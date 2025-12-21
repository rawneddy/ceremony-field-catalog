import api from './apiClient';
import type { SystemHealth, SystemStats } from '../types';

export const systemApi = {
  /**
   * Get system health status including MongoDB connection and memory usage
   */
  getHealth: async (): Promise<SystemHealth> => {
    const response = await api.get<SystemHealth>('/api/system/health');
    return response.data;
  },

  /**
   * Get system statistics including observation counts, search metrics, and latency data
   */
  getStats: async (): Promise<SystemStats> => {
    const response = await api.get<SystemStats>('/api/system/stats');
    return response.data;
  },
};
