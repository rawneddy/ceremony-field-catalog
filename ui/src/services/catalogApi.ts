import api from './apiClient';
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

    // Use URLSearchParams to handle multi-value metadata params
    const searchParams = new URLSearchParams();

    // Add non-metadata params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    // Add metadata params - each value becomes a separate param
    // e.g., metadata.productCode=DDA&metadata.productCode=SAV for OR logic
    if (metadata) {
      Object.entries(metadata).forEach(([key, values]) => {
        values.forEach(value => {
          searchParams.append(`metadata.${key}`, value);
        });
      });
    }

    const response = await api.get<PagedResponse<CatalogEntry>>(`/catalog/fields`, {
      params: searchParams,
    });
    return response.data;
  },

  // Autocomplete
  suggest: async (field: string, prefix: string, contextId?: string, metadata?: Record<string, string>, signal?: AbortSignal): Promise<string[]> => {
    const metadataParams: Record<string, string> = {};
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        metadataParams[`metadata.${key}`] = value;
      });
    }

    const response = await api.get<string[]>(`/catalog/suggest`, {
      params: {
        field,
        prefix,
        contextId,
        ...metadataParams,
      },
      signal,
    });
    return response.data;
  },

  // Observations
  submitObservations: async (contextId: string, observations: CatalogObservation[]): Promise<void> => {
    await api.post(`/catalog/contexts/${contextId}/observations`, observations);
  },

  // Canonical Casing
  setCanonicalCasing: async (fieldId: string, canonicalCasing: string | null): Promise<CatalogEntry> => {
    const response = await api.patch<CatalogEntry>(`/catalog/fields/${fieldId}/canonical-casing`, {
      canonicalCasing,
    });
    return response.data;
  },
};
