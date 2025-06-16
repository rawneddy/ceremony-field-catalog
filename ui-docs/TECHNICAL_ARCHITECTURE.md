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
// Server State: React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['catalog-fields', searchParams],
  queryFn: () => catalogApi.searchFields(searchParams)
});

// Client State: useState/useReducer
const [searchParams, setSearchParams] = useState<SearchParams>({});
const [selectedField, setSelectedField] = useState<CatalogField | null>(null);

// URL State: React Router
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
│   │   │   └── LoadingSpinner.tsx
│   │   ├── catalog/
│   │   │   ├── SearchForm.tsx
│   │   │   ├── FieldTable.tsx
│   │   │   ├── FieldRow.tsx
│   │   │   ├── FieldDetail.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── ResultsSummary.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Layout.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/                # Custom React hooks
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
│   │   ├── FieldDetails.tsx
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

## Core Component Architecture

### 1. Data Flow Pattern

```typescript
// Top-level state management
const CatalogSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useCatalogSearch(searchParams);
  
  return (
    <Layout>
      <SearchForm 
        params={searchParams} 
        onParamsChange={setSearchParams} 
      />
      <FieldTable 
        data={data?.content} 
        loading={isLoading}
        error={error}
      />
      <Pagination 
        currentPage={data?.number}
        totalPages={data?.totalPages}
        onPageChange={(page) => setSearchParams({...searchParams, page})}
      />
    </Layout>
  );
};
```

### 2. Custom Hooks Pattern

```typescript
// useCatalogSearch.ts - Encapsulates search logic
export const useCatalogSearch = (params: SearchParams) => {
  const debouncedParams = useDebounce(params, 500);
  
  return useQuery({
    queryKey: ['catalog-fields', debouncedParams],
    queryFn: () => catalogApi.searchFields(debouncedParams),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// useDebounce.ts - Debounces search input
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};
```

### 3. Component Composition Pattern

```typescript
// Compound component pattern for flexible table
const FieldTable: React.FC<Props> = ({ data, loading, error }) => {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;
  
  return (
    <Table>
      <Table.Header>
        <Table.Column sortable>XPath</Table.Column>
        <Table.Column sortable>Path Type</Table.Column>
        <Table.Column>Context</Table.Column>
        <Table.Column sortable>Occurrences</Table.Column>
        <Table.Column>Null/Empty</Table.Column>
      </Table.Header>
      <Table.Body>
        {data.map(field => (
          <FieldRow key={field.id} field={field} />
        ))}
      </Table.Body>
    </Table>
  );
};
```

## TypeScript Definitions

### Core Data Types

```typescript
// services/types.ts
export interface CatalogField {
  id: string;
  pathType: 'deposits' | 'loans' | 'ondemand';
  formCode?: string;
  formVersion?: string;
  action?: string;
  productCode?: string;
  productSubCode?: string;
  loanProductCode?: string;
  xpath: string;
  dataType: string;
  maxOccurs: number;
  minOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
}

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

export interface SearchParams {
  pathType?: string;
  formCode?: string;
  formVersion?: string;
  action?: string;
  productCode?: string;
  productSubCode?: string;
  loanProductCode?: string;
  xpathContains?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  path: string;
  validationErrors?: Record<string, string>;
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
  // Add auth token when available
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
      // Handle auth errors
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
import { CatalogField, PagedResponse, SearchParams } from './types';

export const catalogApi = {
  searchFields: async (params: SearchParams): Promise<PagedResponse<CatalogField>> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
    );
    
    const response = await apiClient.get('/catalog/fields', { params: cleanParams });
    return response.data;
  },

  submitObservations: async (observations: Partial<CatalogField>[]): Promise<void> => {
    await apiClient.post('/catalog/observed-fields', observations);
  },

  // Future: Get field statistics, export data, etc.
};
```

## State Management Patterns

### URL-Driven State

```typescript
// Sync search state with URL for bookmarking/sharing
const useSearchState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const updateSearch = useCallback((newParams: Partial<SearchParams>) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };
    
    // Remove empty values
    Object.keys(updated).forEach(key => {
      if (!updated[key]) delete updated[key];
    });
    
    setSearchParams(updated);
  }, [searchParams, setSearchParams]);
  
  return {
    searchState: Object.fromEntries(searchParams.entries()),
    updateSearch,
  };
};
```

### Form State Management

```typescript
// React Hook Form for complex forms
const SearchForm: React.FC = ({ onSubmit }) => {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SearchParams>();
  
  const pathType = watch('pathType');
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Select 
        {...register('pathType')}
        options={PATH_TYPE_OPTIONS}
      />
      
      {/* Conditional fields based on pathType */}
      {pathType === 'deposits' && (
        <>
          <Input {...register('action')} placeholder="Action" />
          <Input {...register('productCode')} placeholder="Product Code" />
        </>
      )}
      
      {pathType === 'loans' && (
        <Input {...register('loanProductCode')} placeholder="Loan Product" />
      )}
      
      <Button type="submit">Search</Button>
      <Button type="button" onClick={() => reset()}>Clear</Button>
    </form>
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
      retry: (failureCount, error) => {
        if (error.response?.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});
```

### Virtual Scrolling for Large Tables

```typescript
// For very large result sets, consider react-window
import { FixedSizeList as List } from 'react-window';

const VirtualizedTable: React.FC<{ items: CatalogField[] }> = ({ items }) => {
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
const FieldDetails = lazy(() => import('./pages/FieldDetails'));

const App: React.FC = () => (
  <Router>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<CatalogSearch />} />
        <Route path="/field/:id" element={<FieldDetails />} />
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
    // Send to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
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
        // Handle validation errors
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
// tests/components/SearchForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchForm } from '@/components/catalog/SearchForm';

test('renders search form with all fields', () => {
  render(<SearchForm onSubmit={jest.fn()} />);
  
  expect(screen.getByLabelText(/path type/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/xpath/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
});

test('shows conditional fields based on path type', async () => {
  render(<SearchForm onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByLabelText(/path type/i), {
    target: { value: 'deposits' }
  });
  
  await waitFor(() => {
    expect(screen.getByPlaceholderText(/action/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/product code/i)).toBeInTheDocument();
  });
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

test('searchFields returns paginated results', async () => {
  const params = { pathType: 'deposits', page: 0, size: 10 };
  const result = await catalogApi.searchFields(params);
  
  expect(result.content).toBeDefined();
  expect(result.totalElements).toBeGreaterThan(0);
  expect(result.number).toBe(0);
  expect(result.size).toBe(10);
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
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

This architecture provides a solid foundation for a scalable, maintainable React application that efficiently interacts with your Spring Boot API.