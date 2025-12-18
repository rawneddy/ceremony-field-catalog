# Sample Component Implementations

This document provides complete, ready-to-use React component implementations that demonstrate the architecture and patterns for the Ceremony Field Catalog UI.

## Core Components

### 1. Main Search Page Component

**src/pages/CatalogSearch.tsx:**
```typescript
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SearchForm } from '@/components/catalog/SearchForm';
import { FieldTable } from '@/components/catalog/FieldTable';
import { Pagination } from '@/components/common/Pagination';
import { ResultsSummary } from '@/components/catalog/ResultsSummary';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { useContexts } from '@/hooks/useContexts';
import { SearchParams } from '@/types';

export const CatalogSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: contexts, isLoading: contextsLoading } = useContexts();

  // Build search state from URL params
  const searchState: SearchParams = {
    contextId: searchParams.get('contextId') || undefined,
    fieldPathContains: searchParams.get('fieldPathContains') || undefined,
    page: parseInt(searchParams.get('page') || '0'),
    size: parseInt(searchParams.get('size') || '50'),
  };

  // Extract dynamic metadata filters from URL
  const metadataFilters: Record<string, string> = {};
  const reservedParams = ['contextId', 'fieldPathContains', 'page', 'size'];
  searchParams.forEach((value, key) => {
    if (!reservedParams.includes(key) && value) {
      metadataFilters[key] = value;
    }
  });

  const { data, isLoading, error } = useCatalogSearch({
    ...searchState,
    ...metadataFilters,
  });

  const updateSearchParams = (newParams: Record<string, string | number | undefined>) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };

    // Remove empty values
    Object.keys(updated).forEach(key => {
      if (!updated[key] || updated[key] === '') {
        delete updated[key];
      }
    });

    setSearchParams(updated as Record<string, string>);
  };

  const handleSearch = (params: SearchParams & Record<string, string>) => {
    updateSearchParams({ ...params, page: 0 }); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page });
  };

  const handlePageSizeChange = (size: number) => {
    updateSearchParams({ size, page: 0 }); // Reset to first page
  };

  // Find selected context for dynamic filters
  const selectedContext = contexts?.find(c => c.contextId === searchState.contextId);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Field Catalog</h1>
          <p className="mt-2 text-gray-600">
            Search and explore XML fields across different business contexts
          </p>
        </div>

        <SearchForm
          contexts={contexts || []}
          selectedContext={selectedContext}
          initialParams={{ ...searchState, ...metadataFilters }}
          onSearch={handleSearch}
          loading={isLoading || contextsLoading}
        />

        <ResultsSummary
          totalElements={data?.totalElements || 0}
          currentPage={data?.number || 0}
          pageSize={data?.size || 50}
          loading={isLoading}
        />

        <FieldTable
          data={data?.content || []}
          loading={isLoading}
          error={error}
        />

        {data && data.totalPages > 1 && (
          <Pagination
            currentPage={data.number}
            totalPages={data.totalPages}
            pageSize={data.size}
            totalElements={data.totalElements}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </Layout>
  );
};

export default CatalogSearch;
```

### 2. Search Form Component with Dynamic Metadata Filters

**src/components/catalog/SearchForm.tsx:**
```typescript
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Context, SearchParams } from '@/types';

interface SearchFormProps {
  contexts: Context[];
  selectedContext?: Context;
  initialParams: SearchParams & Record<string, string>;
  onSearch: (params: SearchParams & Record<string, string>) => void;
  loading?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  contexts,
  selectedContext,
  initialParams,
  onSearch,
  loading = false
}) => {
  const { register, handleSubmit, watch, reset, setValue, getValues } = useForm({
    defaultValues: initialParams,
  });

  const contextId = watch('contextId');

  // Update form when initialParams change (e.g., from URL)
  useEffect(() => {
    Object.entries(initialParams).forEach(([key, value]) => {
      if (value !== undefined) {
        setValue(key, value);
      }
    });
  }, [initialParams, setValue]);

  // Build context options from API data
  const contextOptions = [
    { value: '', label: 'All Contexts' },
    ...contexts.map(c => ({
      value: c.contextId,
      label: c.displayName || c.contextId
    }))
  ];

  // Get metadata fields for selected context
  const getMetadataFields = (): string[] => {
    if (!selectedContext) return [];
    return [
      ...selectedContext.requiredMetadata,
      ...(selectedContext.optionalMetadata || [])
    ];
  };

  const metadataFields = getMetadataFields();

  const onSubmit = (data: Record<string, string>) => {
    // Remove empty strings and undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== '' && value !== undefined)
    ) as SearchParams & Record<string, string>;
    onSearch(cleanData);
  };

  const handleClear = () => {
    reset({
      contextId: '',
      fieldPathContains: '',
    });
    onSearch({} as SearchParams);
  };

  const handleContextChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newContextId = e.target.value;
    setValue('contextId', newContextId);

    // Clear metadata filters when context changes
    const currentValues = getValues();
    const newContext = contexts.find(c => c.contextId === newContextId);
    const oldMetadataFields = selectedContext
      ? [...selectedContext.requiredMetadata, ...(selectedContext.optionalMetadata || [])]
      : [];

    // Clear old metadata field values
    oldMetadataFields.forEach(field => {
      setValue(field, '');
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-sm border">
      {/* Primary Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Context Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Context
          </label>
          <Select
            {...register('contextId')}
            options={contextOptions}
            placeholder="All Contexts"
            onChange={handleContextChange}
          />
        </div>

        {/* Field Path Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Path Contains
          </label>
          <Input
            {...register('fieldPathContains')}
            placeholder="e.g., Account, Balance"
            icon={MagnifyingGlassIcon}
          />
        </div>
      </div>

      {/* Dynamic Metadata Filters - shown when a context is selected */}
      {contextId && metadataFields.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Metadata Filters ({selectedContext?.displayName || contextId})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metadataFields.map((field) => {
              const isRequired = selectedContext?.requiredMetadata.includes(field);
              return (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Input
                    {...register(field)}
                    placeholder={`Filter by ${field}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-Context Metadata Hint */}
      {!contextId && (
        <p className="text-sm text-gray-500 mt-2">
          Select a context to see available metadata filters, or search across all contexts.
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          icon={MagnifyingGlassIcon}
        >
          Search
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClear}
          icon={XMarkIcon}
        >
          Clear
        </Button>
      </div>
    </form>
  );
};
```

### 3. Field Table Component

**src/components/catalog/FieldTable.tsx:**
```typescript
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { CatalogEntry } from '@/types';

interface FieldTableProps {
  data: CatalogEntry[];
  loading?: boolean;
  error?: Error | null;
}

export const FieldTable: React.FC<FieldTableProps> = ({ data, loading, error }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-gray-500 text-lg">No fields found</p>
        <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
      </div>
    );
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format metadata as condensed string for table display
  const formatMetadata = (metadata: Record<string, string>): string => {
    return Object.entries(metadata)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
  };

  // Get a color for the context badge based on contextId
  const getContextBadgeVariant = (contextId: string): 'blue' | 'green' | 'purple' | 'gray' => {
    const variants = ['blue', 'green', 'purple'] as const;
    const hash = contextId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return variants[hash % variants.length];
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Field Path
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Context
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metadata
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occurrences
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Null/Empty
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((field) => (
              <React.Fragment key={field.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => toggleRow(field.id)}
                >
                  <td className="px-3 py-4 text-center">
                    {expandedRows.has(field.id) ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <code className="text-sm font-mono text-gray-900 break-all">
                        {field.fieldPath}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(field.fieldPath);
                        }}
                        icon={DocumentDuplicateIcon}
                        aria-label="Copy Field Path"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getContextBadgeVariant(field.contextId)}>
                      {field.contextId}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={formatMetadata(field.metadata)}>
                    {formatMetadata(field.metadata)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {field.minOccurs === field.maxOccurs
                      ? field.minOccurs
                      : `${field.minOccurs}-${field.maxOccurs}`}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <Badge variant={field.allowsNull ? 'yellow' : 'gray'} size="sm">
                        {field.allowsNull ? 'Null' : 'No Null'}
                      </Badge>
                      <Badge variant={field.allowsEmpty ? 'yellow' : 'gray'} size="sm">
                        {field.allowsEmpty ? 'Empty' : 'No Empty'}
                      </Badge>
                    </div>
                  </td>
                </tr>

                {/* Expanded Row Details */}
                {expandedRows.has(field.id) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Field Details</h4>
                          <dl className="space-y-2">
                            <div className="flex">
                              <dt className="w-28 text-gray-500">ID:</dt>
                              <dd className="font-mono text-xs text-gray-900 break-all">{field.id}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-28 text-gray-500">Context:</dt>
                              <dd className="text-gray-900">{field.contextId}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-28 text-gray-500">Min Occurs:</dt>
                              <dd className="text-gray-900">{field.minOccurs}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-28 text-gray-500">Max Occurs:</dt>
                              <dd className="text-gray-900">{field.maxOccurs}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-28 text-gray-500">Allows Null:</dt>
                              <dd className="text-gray-900">{field.allowsNull ? 'Yes' : 'No'}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-28 text-gray-500">Allows Empty:</dt>
                              <dd className="text-gray-900">{field.allowsEmpty ? 'Yes' : 'No'}</dd>
                            </div>
                          </dl>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
                          <dl className="space-y-2">
                            {Object.entries(field.metadata).map(([key, value]) => (
                              <div key={key} className="flex">
                                <dt className="w-28 text-gray-500">{key}:</dt>
                                <dd className="text-gray-900">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 4. Context List Component

**src/components/catalog/ContextList.tsx:**
```typescript
import React from 'react';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Context } from '@/types';

interface ContextListProps {
  contexts: Context[];
  loading?: boolean;
  onSelectContext?: (contextId: string) => void;
}

export const ContextList: React.FC<ContextListProps> = ({
  contexts,
  loading,
  onSelectContext
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!contexts || contexts.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border">
        <p className="text-gray-500">No contexts available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border divide-y">
      {contexts.map((context) => (
        <div
          key={context.contextId}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => onSelectContext?.(context.contextId)}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">
              {context.displayName || context.contextId}
            </h3>
            <Badge variant={context.active ? 'green' : 'gray'} size="sm">
              {context.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {context.description && (
            <p className="text-sm text-gray-600 mb-3">{context.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Required:</span>
            {context.requiredMetadata.map((field) => (
              <Badge key={field} variant="blue" size="sm">{field}</Badge>
            ))}

            {context.optionalMetadata && context.optionalMetadata.length > 0 && (
              <>
                <span className="text-xs text-gray-500 ml-2">Optional:</span>
                {context.optionalMetadata.map((field) => (
                  <Badge key={field} variant="gray" size="sm">{field}</Badge>
                ))}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Custom Hooks

### 1. useCatalogSearch Hook

**src/hooks/useCatalogSearch.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalogApi';
import { SearchParams } from '@/types';
import { useDebounce } from './useDebounce';

export const useCatalogSearch = (params: SearchParams & Record<string, string>) => {
  // Debounce search parameters to avoid excessive API calls
  const debouncedParams = useDebounce(params, 500);

  return useQuery({
    queryKey: ['catalog-fields', debouncedParams],
    queryFn: () => catalogApi.searchFields(debouncedParams),
    keepPreviousData: true, // Keep previous results while loading new ones
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always enable since empty search is valid
  });
};
```

### 2. useContexts Hook

**src/hooks/useContexts.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalogApi';

export const useContexts = () => {
  return useQuery({
    queryKey: ['contexts'],
    queryFn: () => catalogApi.getContexts(),
    staleTime: 10 * 60 * 1000, // 10 minutes - contexts don't change often
  });
};

export const useContext = (contextId: string) => {
  return useQuery({
    queryKey: ['context', contextId],
    queryFn: () => catalogApi.getContext(contextId),
    enabled: !!contextId,
    staleTime: 10 * 60 * 1000,
  });
};
```

### 3. useDebounce Hook

**src/hooks/useDebounce.ts:**
```typescript
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

## Common UI Components

### 1. Button Component

**src/components/common/Button.tsx:**
```typescript
import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon ? (
        <Icon className={clsx('h-4 w-4', children && 'mr-2')} />
      ) : null}
      {children}
    </button>
  );
};
```

### 2. Input Component

**src/components/common/Input.tsx:**
```typescript
import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500',
              Icon && 'pl-10',
              error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### 3. Select Component

**src/components/common/Select.tsx:**
```typescript
import React from 'react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
```

### 4. Badge Component

**src/components/common/Badge.tsx:**
```typescript
import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md'
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  const variantClasses = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
  };

  return (
    <span className={clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size]
    )}>
      {children}
    </span>
  );
};
```

## API Service Implementation

**src/services/catalogApi.ts:**
```typescript
import { apiClient } from './api';
import {
  Context,
  CatalogEntry,
  PagedResponse,
  SearchParams,
  CatalogObservation
} from '@/types';

export const catalogApi = {
  // Context Management
  getContexts: async (): Promise<Context[]> => {
    const response = await apiClient.get<Context[]>('/catalog/contexts');
    return response.data;
  },

  getContext: async (contextId: string): Promise<Context> => {
    const response = await apiClient.get<Context>(`/catalog/contexts/${contextId}`);
    return response.data;
  },

  createContext: async (context: Omit<Context, 'createdAt' | 'updatedAt'>): Promise<Context> => {
    const response = await apiClient.post<Context>('/catalog/contexts', context);
    return response.data;
  },

  updateContext: async (contextId: string, context: Partial<Context>): Promise<Context> => {
    const response = await apiClient.put<Context>(`/catalog/contexts/${contextId}`, context);
    return response.data;
  },

  deleteContext: async (contextId: string): Promise<void> => {
    await apiClient.delete(`/catalog/contexts/${contextId}`);
  },

  // Field Search
  searchFields: async (params: SearchParams & Record<string, string>): Promise<PagedResponse<CatalogEntry>> => {
    // Remove undefined and empty string values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) =>
        value !== undefined && value !== '' && value !== null
      )
    );

    const response = await apiClient.get<PagedResponse<CatalogEntry>>('/catalog/fields', {
      params: cleanParams
    });
    return response.data;
  },

  // Field Observations
  submitObservations: async (contextId: string, observations: CatalogObservation[]): Promise<void> => {
    await apiClient.post(`/catalog/contexts/${contextId}/observations`, observations);
  },
};
```

**src/services/api.ts:**
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens (future use)
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'An error occurred';
      console.error(`API Error: ${error.response.status} - ${message}`);
    } else if (error.request) {
      // Request made but no response
      console.error('API Error: No response received');
    } else {
      // Something else happened
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);
```

## Layout Components

**src/components/layout/Layout.tsx:**
```typescript
import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
```

**src/components/layout/Header.tsx:**
```typescript
import React from 'react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Ceremony Field Catalog
            </Link>
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              Search
            </Link>
            <Link to="/contexts" className="text-sm text-gray-600 hover:text-gray-900">
              Contexts
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
```

## TypeScript Type Definitions

**src/types/index.ts:**
```typescript
// Context - defines an observation point with metadata schema
export interface Context {
  contextId: string;
  displayName: string;
  description?: string;
  requiredMetadata: string[];
  optionalMetadata?: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// CatalogEntry - an observed field within a context
export interface CatalogEntry {
  id: string;
  contextId: string;
  metadata: Record<string, string>;
  fieldPath: string;
  maxOccurs: number;
  minOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
}

// Observation input for submitting field data
export interface CatalogObservation {
  metadata: Record<string, string>;
  fieldPath: string;
  count: number;
  hasNull: boolean;
  hasEmpty: boolean;
}

// Search parameters
export interface SearchParams {
  contextId?: string;
  fieldPathContains?: string;
  page?: number;
  size?: number;
  // Additional metadata filters are added dynamically
}

// Spring Boot pageable response
export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  first: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  empty: boolean;
}

// API error response
export interface ErrorResponse {
  message: string;
  status: number;
  timestamp: string;
  error: string;
  validationErrors?: Record<string, string>;
}
```

These sample components provide a solid foundation that demonstrates:

1. **Dynamic Context System**: Components fetch contexts from API and render metadata filters dynamically
2. **Context-Aware Search**: Search form adapts to show relevant filters based on selected context
3. **Cross-Context Search**: Supports searching across all contexts when no context is selected
4. **Flexible Metadata Display**: Table and detail views handle arbitrary metadata key-value pairs
5. **Type-Safe Integration**: Full TypeScript support with proper API response types
