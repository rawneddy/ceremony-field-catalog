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
import { SearchParams } from '@/types';

export const CatalogSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const searchState: SearchParams = {
    pathType: searchParams.get('pathType') || undefined,
    formCode: searchParams.get('formCode') || undefined,
    formVersion: searchParams.get('formVersion') || undefined,
    action: searchParams.get('action') || undefined,
    productCode: searchParams.get('productCode') || undefined,
    productSubCode: searchParams.get('productSubCode') || undefined,
    loanProductCode: searchParams.get('loanProductCode') || undefined,
    xpathContains: searchParams.get('xpathContains') || undefined,
    page: parseInt(searchParams.get('page') || '0'),
    size: parseInt(searchParams.get('size') || '50'),
  };

  const { data, isLoading, error } = useCatalogSearch(searchState);

  const updateSearchParams = (newParams: Partial<SearchParams>) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };
    
    // Remove empty values
    Object.keys(updated).forEach(key => {
      if (!updated[key] || updated[key] === '') {
        delete updated[key];
      }
    });
    
    setSearchParams(updated);
  };

  const handleSearch = (params: SearchParams) => {
    updateSearchParams({ ...params, page: 0 }); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page });
  };

  const handlePageSizeChange = (size: number) => {
    updateSearchParams({ size, page: 0 }); // Reset to first page
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Field Catalog</h1>
          <p className="mt-2 text-gray-600">
            Search and explore XML fields across different business processes
          </p>
        </div>

        <SearchForm 
          initialParams={searchState}
          onSearch={handleSearch}
          loading={isLoading}
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

### 2. Search Form Component

**src/components/catalog/SearchForm.tsx:**
```typescript
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { SearchParams, PathType } from '@/types';
import { PATH_TYPES } from '@/utils/constants';

interface SearchFormProps {
  initialParams: SearchParams;
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ 
  initialParams, 
  onSearch, 
  loading = false 
}) => {
  const { register, handleSubmit, watch, reset, setValue } = useForm<SearchParams>({
    defaultValues: initialParams,
  });

  const pathType = watch('pathType') as PathType;

  // Update form when initialParams change (e.g., from URL)
  useEffect(() => {
    Object.entries(initialParams).forEach(([key, value]) => {
      if (value !== undefined) {
        setValue(key as keyof SearchParams, value);
      }
    });
  }, [initialParams, setValue]);

  const onSubmit = (data: SearchParams) => {
    // Remove empty strings
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== '' && value !== undefined)
    );
    onSearch(cleanData);
  };

  const handleClear = () => {
    reset({
      pathType: '',
      formCode: '',
      formVersion: '',
      action: '',
      productCode: '',
      productSubCode: '',
      loanProductCode: '',
      xpathContains: '',
    });
    onSearch({});
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Path Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Path Type
          </label>
          <Select
            {...register('pathType')}
            options={PATH_TYPES}
            placeholder="All types"
          />
        </div>

        {/* XPath Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            XPath Contains
          </label>
          <Input
            {...register('xpathContains')}
            placeholder="e.g., FeeCode, Account"
            icon={MagnifyingGlassIcon}
          />
        </div>

        {/* Conditional Fields based on Path Type */}
        {pathType === 'deposits' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <Input
                {...register('action')}
                placeholder="e.g., Fulfillment"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Code
              </label>
              <Input
                {...register('productCode')}
                placeholder="e.g., DDA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Sub Code
              </label>
              <Input
                {...register('productSubCode')}
                placeholder="e.g., 4S"
              />
            </div>
          </>
        )}

        {pathType === 'loans' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan Product Code
            </label>
            <Input
              {...register('loanProductCode')}
              placeholder="e.g., HEQF"
            />
          </div>
        )}

        {pathType === 'ondemand' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Code
              </label>
              <Input
                {...register('formCode')}
                placeholder="e.g., ACK123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Version
              </label>
              <Input
                {...register('formVersion')}
                placeholder="e.g., v1.0"
              />
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
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
import { CatalogField } from '@/types';

interface FieldTableProps {
  data: CatalogField[];
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

  const getPathTypeBadge = (pathType: string) => {
    const variants = {
      deposits: 'blue',
      loans: 'green',
      ondemand: 'purple',
    } as const;
    
    return (
      <Badge variant={variants[pathType as keyof typeof variants] || 'gray'}>
        {pathType}
      </Badge>
    );
  };

  const getBusinessContext = (field: CatalogField) => {
    switch (field.pathType) {
      case 'deposits':
        return [field.action, field.productCode, field.productSubCode]
          .filter(Boolean)
          .join(' / ');
      case 'loans':
        return field.loanProductCode || '';
      case 'ondemand':
        return [field.formCode, field.formVersion]
          .filter(Boolean)
          .join(' / ');
      default:
        return '';
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                XPath
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business Context
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
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
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
                        {field.xpath}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(field.xpath);
                        }}
                        icon={DocumentDuplicateIcon}
                        aria-label="Copy XPath"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getPathTypeBadge(field.pathType)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getBusinessContext(field)}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Field Details</h4>
                          <dl className="space-y-1">
                            <div className="flex">
                              <dt className="w-24 text-gray-500">ID:</dt>
                              <dd className="font-mono text-xs text-gray-900 break-all">{field.id}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-gray-500">Data Type:</dt>
                              <dd className="text-gray-900">{field.dataType}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-gray-500">Min Occurs:</dt>
                              <dd className="text-gray-900">{field.minOccurs}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-gray-500">Max Occurs:</dt>
                              <dd className="text-gray-900">{field.maxOccurs}</dd>
                            </div>
                          </dl>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Business Context</h4>
                          <dl className="space-y-1">
                            {field.pathType === 'deposits' && (
                              <>
                                {field.action && (
                                  <div className="flex">
                                    <dt className="w-24 text-gray-500">Action:</dt>
                                    <dd className="text-gray-900">{field.action}</dd>
                                  </div>
                                )}
                                {field.productCode && (
                                  <div className="flex">
                                    <dt className="w-24 text-gray-500">Product:</dt>
                                    <dd className="text-gray-900">{field.productCode}</dd>
                                  </div>
                                )}
                                {field.productSubCode && (
                                  <div className="flex">
                                    <dt className="w-24 text-gray-500">Sub Code:</dt>
                                    <dd className="text-gray-900">{field.productSubCode}</dd>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {field.pathType === 'loans' && field.loanProductCode && (
                              <div className="flex">
                                <dt className="w-24 text-gray-500">Loan Product:</dt>
                                <dd className="text-gray-900">{field.loanProductCode}</dd>
                              </div>
                            )}
                            
                            {field.pathType === 'ondemand' && (
                              <>
                                {field.formCode && (
                                  <div className="flex">
                                    <dt className="w-24 text-gray-500">Form Code:</dt>
                                    <dd className="text-gray-900">{field.formCode}</dd>
                                  </div>
                                )}
                                {field.formVersion && (
                                  <div className="flex">
                                    <dt className="w-24 text-gray-500">Form Version:</dt>
                                    <dd className="text-gray-900">{field.formVersion}</dd>
                                  </div>
                                )}
                              </>
                            )}
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

### 4. Custom Hooks

**src/hooks/useCatalogSearch.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalogApi';
import { SearchParams } from '@/types';
import { useDebounce } from './useDebounce';

export const useCatalogSearch = (params: SearchParams) => {
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
import { CatalogField, PagedResponse, SearchParams, CatalogObservation } from '@/types';

export const catalogApi = {
  searchFields: async (params: SearchParams): Promise<PagedResponse<CatalogField>> => {
    // Remove undefined and empty string values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => 
        value !== undefined && value !== '' && value !== null
      )
    );
    
    const response = await apiClient.get<PagedResponse<CatalogField>>('/catalog/fields', { 
      params: cleanParams 
    });
    return response.data;
  },

  submitObservations: async (observations: CatalogObservation[]): Promise<void> => {
    await apiClient.post('/catalog/observed-fields', observations);
  },
};
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
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
```

These sample components provide a solid foundation that a new Claude Code session can build upon, demonstrating the architecture patterns, TypeScript usage, and integration with your Spring Boot API.