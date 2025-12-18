# Technical Architecture Guide - React UI

## Technology Stack

### Core Framework
- **React 18+** with functional components and hooks
- **TypeScript** for type safety and better developer experience
- **React Router v6** for client-side routing
- **React Query (TanStack Query)** for server state management

### Styling & UI Components
- **Tailwind CSS** for utility-first styling
- **Headless UI** for accessible, unstyled components
- **Heroicons** for consistent iconography
- **React Hook Form** for efficient form handling

### Development Tools
- **Vite** for fast development and building
- **ESLint + Prettier** for code quality
- **Vitest + React Testing Library** for testing
- **Storybook** for component development (optional)

### State Management Strategy

```typescript
// Server State: React Query for API data
const { data: contexts } = useQuery({
  queryKey: ['contexts'],
  queryFn: () => catalogApi.getContexts()
});

const { data: fields, isLoading } = useQuery({
  queryKey: ['catalog-fields', searchParams],
  queryFn: () => catalogApi.searchFields(searchParams)
});

// Client State: useState/useReducer for UI state
const [selectedContext, setSelectedContext] = useState<Context | null>(null);
const [metadataFilters, setMetadataFilters] = useState<Record<string, string>>({});

// URL State: React Router for shareable search state
const [searchParams, setSearchParams] = useSearchParams();
```

## Project Structure

```
ceremony-field-catalog-ui/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── catalog/
│   │   │   ├── ContextSelector.tsx
│   │   │   ├── MetadataFilters.tsx
│   │   │   ├── SearchForm.tsx
│   │   │   ├── FieldTable.tsx
│   │   │   ├── FieldRow.tsx
│   │   │   ├── FieldDetail.tsx
│   │   │   ├── MetadataDisplay.tsx
│   │   │   └── ResultsSummary.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Layout.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useContexts.ts
│   │   ├── useCatalogSearch.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   └── useLocalStorage.ts
│   ├── services/            # API integration
│   │   ├── api.ts           # Axios/fetch configuration
│   │   ├── catalogApi.ts    # Catalog-specific API calls
│   │   └── types.ts         # TypeScript type definitions
│   ├── utils/               # Helper functions
│   │   ├── formatters.ts    # Data formatting utilities
│   │   ├── validators.ts    # Input validation
│   │   └── constants.ts     # App constants
│   ├── pages/               # Page components
│   │   ├── CatalogSearch.tsx
│   │   ├── ContextList.tsx
│   │   └── NotFound.tsx
│   ├── styles/              # Global styles
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/                   # Test files
│   ├── components/
│   ├── hooks/
│   └── utils/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .eslintrc.js
└── README.md
```

## TypeScript Definitions

### Core Data Types

```typescript
// services/types.ts

/**
 * Context defines an observation point with metadata requirements
 */
export interface Context {
  contextId: string;
  displayName: string;
  description?: string;
  requiredMetadata: string[];
  optionalMetadata: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * CatalogEntry represents an observed field in the catalog
 */
export interface CatalogEntry {
  id: string;                           // Hash-based ID (e.g., "field_377301301")
  contextId: string;                    // Reference to context
  metadata: Record<string, string>;     // Key-value pairs (lowercase normalized)
  fieldPath: string;                    // XPath of the field
  maxOccurs: number;                    // Maximum occurrences observed
  minOccurs: number;                    // Minimum occurrences (0 = sometimes absent)
  allowsNull: boolean;                  // Has been observed with null
  allowsEmpty: boolean;                 // Has been observed with empty string
}

/**
 * Input for submitting field observations
 */
export interface CatalogObservation {
  metadata: Record<string, string>;
  fieldPath: string;
  count: number;
  hasNull: boolean;
  hasEmpty: boolean;
}

/**
 * Search parameters for catalog queries
 */
export interface SearchParams {
  contextId?: string;
  fieldPathContains?: string;
  page?: number;
  size?: number;
  metadata?: Record<string, string>;  // Dynamic metadata filters
}

/**
 * Spring Data paginated response
 */
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

/**
 * API error response format
 */
export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  error: string;
  validationErrors?: Record<string, string>;
}

/**
 * Context creation/update DTO
 */
export interface ContextDefinition {
  contextId: string;
  displayName: string;
  description?: string;
  requiredMetadata: string[];
  optionalMetadata: string[];
  active: boolean;
}
```

## API Integration Layer

### HTTP Client Configuration

```typescript
// services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for future auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Catalog-Specific API Methods

```typescript
// services/catalogApi.ts
import { apiClient } from './api';
import {
  Context,
  ContextDefinition,
  CatalogEntry,
  CatalogObservation,
  PagedResponse,
  SearchParams
} from './types';

export const catalogApi = {
  // Context Management
  getContexts: async (): Promise<Context[]> => {
    const response = await apiClient.get('/catalog/contexts');
    return response.data;
  },

  getContext: async (contextId: string): Promise<Context> => {
    const response = await apiClient.get(`/catalog/contexts/${contextId}`);
    return response.data;
  },

  createContext: async (context: ContextDefinition): Promise<Context> => {
    const response = await apiClient.post('/catalog/contexts', context);
    return response.data;
  },

  updateContext: async (contextId: string, context: ContextDefinition): Promise<Context> => {
    const response = await apiClient.put(`/catalog/contexts/${contextId}`, context);
    return response.data;
  },

  deleteContext: async (contextId: string): Promise<void> => {
    await apiClient.delete(`/catalog/contexts/${contextId}`);
  },

  // Field Observations
  submitObservations: async (contextId: string, observations: CatalogObservation[]): Promise<void> => {
    await apiClient.post(`/catalog/contexts/${contextId}/observations`, observations);
  },

  // Field Search
  searchFields: async (params: SearchParams): Promise<PagedResponse<CatalogEntry>> => {
    // Build query params, flattening metadata into top-level params
    const queryParams: Record<string, string | number> = {};

    if (params.contextId) queryParams.contextId = params.contextId;
    if (params.fieldPathContains) queryParams.fieldPathContains = params.fieldPathContains;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.size !== undefined) queryParams.size = params.size;

    // Flatten metadata filters into query params
    if (params.metadata) {
      Object.entries(params.metadata).forEach(([key, value]) => {
        if (value) queryParams[key] = value;
      });
    }

    const response = await apiClient.get('/catalog/fields', { params: queryParams });
    return response.data;
  },
};
```

## Core Component Architecture

### 1. Data Flow Pattern

```typescript
// pages/CatalogSearch.tsx
const CatalogSearch: React.FC = () => {
  // Load contexts on mount
  const { data: contexts } = useContexts();

  // URL-driven search state
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive search params from URL
  const params = useMemo(() => ({
    contextId: searchParams.get('contextId') || undefined,
    fieldPathContains: searchParams.get('fieldPathContains') || undefined,
    page: parseInt(searchParams.get('page') || '0'),
    size: parseInt(searchParams.get('size') || '50'),
    metadata: Object.fromEntries(
      Array.from(searchParams.entries())
        .filter(([key]) => !['contextId', 'fieldPathContains', 'page', 'size'].includes(key))
    ),
  }), [searchParams]);

  // Fetch fields based on params
  const { data, isLoading, error } = useCatalogSearch(params);

  // Get selected context for dynamic filters
  const selectedContext = contexts?.find(c => c.contextId === params.contextId);

  return (
    <Layout>
      <ContextSelector
        contexts={contexts}
        selected={params.contextId}
        onChange={(contextId) => setSearchParams({ ...params, contextId, page: '0' })}
      />
      <MetadataFilters
        context={selectedContext}
        values={params.metadata}
        onChange={(metadata) => setSearchParams({ ...params, ...metadata, page: '0' })}
      />
      <SearchForm
        fieldPathContains={params.fieldPathContains}
        onSearch={(value) => setSearchParams({ ...params, fieldPathContains: value, page: '0' })}
      />
      <ResultsSummary data={data} />
      <FieldTable
        data={data?.content}
        loading={isLoading}
        error={error}
      />
      <Pagination
        currentPage={data?.number || 0}
        totalPages={data?.totalPages || 0}
        pageSize={params.size}
        onPageChange={(page) => setSearchParams({ ...params, page: String(page) })}
        onPageSizeChange={(size) => setSearchParams({ ...params, size: String(size), page: '0' })}
      />
    </Layout>
  );
};
```

### 2. Custom Hooks

```typescript
// hooks/useContexts.ts
export const useContexts = () => {
  return useQuery({
    queryKey: ['contexts'],
    queryFn: () => catalogApi.getContexts(),
    staleTime: 10 * 60 * 1000, // 10 minutes - contexts don't change often
  });
};

// hooks/useCatalogSearch.ts
export const useCatalogSearch = (params: SearchParams) => {
  const debouncedParams = useDebounce(params, 300);

  return useQuery({
    queryKey: ['catalog-fields', debouncedParams],
    queryFn: () => catalogApi.searchFields(debouncedParams),
    keepPreviousData: true,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// hooks/useDebounce.ts
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

### 3. Dynamic Metadata Filters

```typescript
// components/catalog/MetadataFilters.tsx
interface MetadataFiltersProps {
  context: Context | undefined;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

const MetadataFilters: React.FC<MetadataFiltersProps> = ({ context, values, onChange }) => {
  if (!context) {
    return (
      <div className="text-gray-500 italic">
        Select a context to see available filters
      </div>
    );
  }

  const allFields = [...context.requiredMetadata, ...context.optionalMetadata];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {allFields.map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700">
            {field}
            {context.requiredMetadata.includes(field) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <Input
            value={values[field] || ''}
            onChange={(e) => onChange({ ...values, [field]: e.target.value })}
            placeholder={`Filter by ${field}`}
          />
        </div>
      ))}
    </div>
  );
};
```

### 4. Field Table with Metadata Display

```typescript
// components/catalog/FieldTable.tsx
const FieldTable: React.FC<Props> = ({ data, loading, error }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState message="No fields found" />;

  return (
    <Table>
      <Table.Header>
        <Table.Column>Field Path</Table.Column>
        <Table.Column>Context</Table.Column>
        <Table.Column>Metadata</Table.Column>
        <Table.Column>Occurs</Table.Column>
        <Table.Column>Null/Empty</Table.Column>
      </Table.Header>
      <Table.Body>
        {data.map(field => (
          <React.Fragment key={field.id}>
            <FieldRow
              field={field}
              expanded={expandedId === field.id}
              onToggle={() => setExpandedId(expandedId === field.id ? null : field.id)}
            />
            {expandedId === field.id && (
              <FieldDetail field={field} />
            )}
          </React.Fragment>
        ))}
      </Table.Body>
    </Table>
  );
};

// components/catalog/FieldRow.tsx
const FieldRow: React.FC<FieldRowProps> = ({ field, expanded, onToggle }) => {
  return (
    <Table.Row onClick={onToggle} className="cursor-pointer hover:bg-gray-50">
      <Table.Cell className="font-mono text-sm">
        {field.fieldPath}
      </Table.Cell>
      <Table.Cell>
        <Badge variant="info">{field.contextId}</Badge>
      </Table.Cell>
      <Table.Cell>
        <MetadataDisplay metadata={field.metadata} condensed />
      </Table.Cell>
      <Table.Cell>
        {field.minOccurs}-{field.maxOccurs}
      </Table.Cell>
      <Table.Cell>
        <span className={field.allowsNull ? 'text-green-600' : 'text-gray-400'}>
          {field.allowsNull ? '✓' : '✗'}
        </span>
        {' / '}
        <span className={field.allowsEmpty ? 'text-green-600' : 'text-gray-400'}>
          {field.allowsEmpty ? '✓' : '✗'}
        </span>
      </Table.Cell>
    </Table.Row>
  );
};

// components/catalog/MetadataDisplay.tsx
interface MetadataDisplayProps {
  metadata: Record<string, string>;
  condensed?: boolean;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ metadata, condensed }) => {
  const entries = Object.entries(metadata);

  if (condensed) {
    return (
      <span className="text-sm text-gray-600">
        {entries.map(([k, v]) => `${k}=${v}`).join(', ')}
      </span>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs text-gray-500">{key}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
};
```

## Performance Optimization

### React Query Configuration

```typescript
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error.response?.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
```

### Virtual Scrolling for Large Tables

```typescript
// For very large result sets, consider react-window
import { FixedSizeList as List } from 'react-window';

const VirtualizedTable: React.FC<{ items: CatalogEntry[] }> = ({ items }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <FieldRow field={items[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Code Splitting

```typescript
// Lazy load routes for better initial load performance
import { lazy, Suspense } from 'react';

const CatalogSearch = lazy(() => import('./pages/CatalogSearch'));
const ContextList = lazy(() => import('./pages/ContextList'));

const App: React.FC = () => (
  <Router>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<CatalogSearch />} />
        <Route path="/contexts" element={<ContextList />} />
      </Routes>
    </Suspense>
  </Router>
);
```

## Error Handling Strategy

### Error Boundary

```typescript
// components/layout/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <p className="text-gray-600 mt-2">{this.state.error?.message}</p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling

```typescript
// hooks/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown) => {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as ApiError;

      if (apiError?.validationErrors) {
        Object.entries(apiError.validationErrors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else {
        toast.error(apiError?.message || 'An error occurred');
      }
    } else {
      toast.error('An unexpected error occurred');
    }
  }, []);

  return { handleError };
};
```

## Testing Strategy

### Component Testing

```typescript
// tests/components/ContextSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextSelector } from '@/components/catalog/ContextSelector';

const mockContexts: Context[] = [
  {
    contextId: 'deposits',
    displayName: 'Deposits',
    requiredMetadata: ['productCode'],
    optionalMetadata: [],
    active: true,
    createdAt: '2024-01-01'
  },
  {
    contextId: 'renderdata',
    displayName: 'Render Data',
    requiredMetadata: ['documentCode'],
    optionalMetadata: [],
    active: true,
    createdAt: '2024-01-01'
  },
];

test('renders context options from API', () => {
  render(
    <ContextSelector
      contexts={mockContexts}
      selected={undefined}
      onChange={jest.fn()}
    />
  );

  expect(screen.getByText('Deposits')).toBeInTheDocument();
  expect(screen.getByText('Render Data')).toBeInTheDocument();
});

test('calls onChange when context selected', async () => {
  const onChange = jest.fn();
  render(
    <ContextSelector
      contexts={mockContexts}
      selected={undefined}
      onChange={onChange}
    />
  );

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'deposits' } });
  expect(onChange).toHaveBeenCalledWith('deposits');
});
```

### API Integration Testing

```typescript
// tests/services/catalogApi.test.ts
import { catalogApi } from '@/services/catalogApi';
import { server } from '../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('getContexts returns array of contexts', async () => {
  const contexts = await catalogApi.getContexts();

  expect(Array.isArray(contexts)).toBe(true);
  expect(contexts[0]).toHaveProperty('contextId');
  expect(contexts[0]).toHaveProperty('requiredMetadata');
});

test('searchFields returns paginated results', async () => {
  const params = { contextId: 'deposits', page: 0, size: 10 };
  const result = await catalogApi.searchFields(params);

  expect(result.content).toBeDefined();
  expect(result.totalElements).toBeGreaterThanOrEqual(0);
  expect(result.number).toBe(0);
});
```

## Build & Deployment Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/catalog': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:8080

# .env.production
VITE_API_URL=https://api.yourcompany.com
```

This architecture provides a solid foundation for a scalable, maintainable React application that efficiently interacts with the Ceremony Field Catalog API using the dynamic Context system.
