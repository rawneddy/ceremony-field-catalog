import api from './api';
import type { 
  CatalogEntry, 
  Context, 
  ContextWithCount, 
  PagedResponse, 
  CatalogObservation,
  CatalogSearchRequest
} from '../types';

export const catalogApi = {
  // Contexts
  getContexts: async (includeCounts = false): Promise<ContextWithCount[]> => {
    const response = await api.get<ContextWithCount[]>(`/catalog/contexts`, {
      params: { includeCounts },
    });
    return response.data;
  },

  createContext: async (context: Partial<Context>): Promise<Context> => {
    const response = await api.post<Context>(`/catalog/contexts`, context);
    return response.data;
  },

  updateContext: async (contextId: string, context: Partial<Context>): Promise<Context> => {
    const response = await api.put<Context>(`/catalog/contexts/${contextId}`, context);
    return response.data;
  },

  deleteContext: async (contextId: string): Promise<void> => {
    await api.delete(`/catalog/contexts/${contextId}`);
  },

  // Catalog Entries
  searchFields: async (request: CatalogSearchRequest): Promise<PagedResponse<CatalogEntry>> => {
    const { metadata, ...params } = request;
    const response = await api.get<PagedResponse<CatalogEntry>>(`/catalog/fields`, {
      params: {
        ...params,
        ...metadata, // Flatten metadata filters into query params
      },
    });
    return response.data;
  },

  // Autocomplete
  suggest: async (field: string, prefix: string, contextId?: string, metadata?: Record<string, string>): Promise<string[]> => {
    const response = await api.get<string[]>(`/catalog/suggest`, {
      params: {
        field,
        prefix,
        contextId,
        ...metadata,
      },
    });
    return response.data;
  },

  // Observations
  submitObservations: async (contextId: string, observations: CatalogObservation[]): Promise<void> => {
    await api.post(`/catalog/observations/${contextId}`, observations);
  },
};
