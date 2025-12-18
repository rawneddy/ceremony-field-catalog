# Development Setup Guide - React UI

## Prerequisites

### Required Software
- **Node.js 18+** (LTS recommended)
- **npm 9+** or **yarn 3+**
- **Git**
- **VS Code** (recommended) with extensions:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier

### Backend Dependency
- **Ceremony Field Catalog API** must be running on `http://localhost:8080`
- See API repository README for setup instructions

## Project Initialization

### 1. Create New React Project

```bash
# Using Vite (recommended for fast development)
npm create vite@latest ceremony-field-catalog-ui -- --template react-ts

# Navigate to project directory
cd ceremony-field-catalog-ui

# Install dependencies
npm install
```

### 2. Install Additional Dependencies

```bash
# Core dependencies
npm install @tanstack/react-query axios react-router-dom
npm install @headlessui/react @heroicons/react
npm install react-hook-form clsx

# Development dependencies  
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/node
npm install -D eslint-config-prettier eslint-plugin-react-hooks
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event vitest jsdom
```

### 3. Initialize Tailwind CSS

```bash
# Initialize Tailwind configuration
npx tailwindcss init -p

# Update tailwind.config.js
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
```

### 4. Configure Development Environment

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx}",
    "type-check": "tsc --noEmit"
  }
}
```

**Environment Variables (.env.local):**
```bash
# API Configuration
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Ceremony Field Catalog
VITE_APP_VERSION=1.0.0

# Development settings
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

**Environment Variables (.env.production):**
```bash
# Production API Configuration
VITE_API_URL=https://api.your-domain.com
VITE_APP_NAME=Ceremony Field Catalog
VITE_APP_VERSION=1.0.0

# Production settings
VITE_DEBUG=false
VITE_LOG_LEVEL=error
```

## Project Structure Setup

### 1. Create Directory Structure

```bash
mkdir -p src/{components/{common,catalog,layout},hooks,services,utils,pages,styles,types}
mkdir -p src/components/{common,catalog,layout}
mkdir -p tests/{components,hooks,services,utils}
```

### 2. Initial Configuration Files

**src/styles/globals.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500;
  }
  
  .input {
    @apply px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500;
  }
  
  .table {
    @apply min-w-full divide-y divide-gray-200;
  }
  
  .table-row {
    @apply hover:bg-gray-50 transition-colors;
  }
}
```

**src/types/index.ts:**
```typescript
// Re-export all types from a central location
export * from './api';
export * from './catalog';
export * from './common';
```

**src/types/api.ts:**
```typescript
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  path: string;
  validationErrors?: Record<string, string>;
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
```

**src/types/catalog.ts:**
```typescript
export type PathType = 'deposits' | 'loans' | 'ondemand';

export interface CatalogField {
  id: string;
  pathType: PathType;
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

export interface SearchParams {
  pathType?: PathType | '';
  formCode?: string;
  formVersion?: string;
  action?: string;
  productCode?: string;
  productSubCode?: string;
  loanProductCode?: string;
  fieldPathContains?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CatalogObservation {
  pathType: PathType;
  formCode?: string;
  formVersion?: string;
  action?: string;
  productCode?: string;
  productSubCode?: string;
  loanProductCode?: string;
  xpath: string;
  dataType: string;
  count: number;
  hasNull: boolean;
  hasEmpty: boolean;
}
```

**src/utils/constants.ts:**
```typescript
export const PATH_TYPES = [
  { value: '', label: 'All Path Types' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'loans', label: 'Loans' },
  { value: 'ondemand', label: 'OnDemand' },
] as const;

export const PAGE_SIZES = [
  { value: 25, label: '25 per page' },
  { value: 50, label: '50 per page' },
  { value: 100, label: '100 per page' },
  { value: 200, label: '200 per page' },
] as const;

export const API_ENDPOINTS = {
  SEARCH_FIELDS: '/catalog/fields',
  SUBMIT_OBSERVATIONS: '/catalog/observed-fields',
} as const;

export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_PAGE = 0;
```

## Development Workflow

### 1. Start Development Server

```bash
# Start React development server
npm run dev

# In another terminal, ensure API is running
cd ../ceremony-field-catalog
mvn spring-boot:run
```

### 2. Code Quality Setup

**ESLint Configuration (.eslintrc.js):**
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
  },
};
```

**Prettier Configuration (.prettierrc):**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### 3. Testing Setup

**Vitest Configuration (vitest.config.ts):**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Test Setup (tests/setup.ts):**
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock API calls
vi.mock('../src/services/catalogApi', () => ({
  catalogApi: {
    searchFields: vi.fn(),
    submitObservations: vi.fn(),
  },
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## API Integration Setup

### 1. HTTP Client Configuration

**src/services/api.ts:**
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.VITE_DEBUG) {
      console.log('API Request:', config);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor  
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.VITE_DEBUG) {
      console.log('API Response:', response);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

### 2. React Query Setup

**src/main.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {import.meta.env.DEV && <ReactQueryDevtools />}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

## Common Development Tasks

### Running Tests
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:ui

# Run tests with coverage
npm run test -- --coverage
```

### Code Quality Checks
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Type checking
npm run type-check
```

### Building for Production
```bash
# Create production build
npm run build

# Preview production build locally
npm run preview

# Test production build
npm run build && npm run preview
```

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure Spring Boot API has CORS configured for `http://localhost:3000`
- Check that API is running on port 8080

**2. Module Resolution Errors**
- Verify path aliases in `vite.config.ts` and `tsconfig.json` match
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

**3. Build Errors**
- Run `npm run type-check` to identify TypeScript issues
- Check for unused imports with `npm run lint`

**4. API Connection Issues**
- Verify `VITE_API_URL` environment variable
- Check network tab in browser dev tools
- Ensure API endpoints match specification

### Development Best Practices

1. **Use TypeScript strictly** - Enable strict mode in tsconfig.json
2. **Write tests first** - Create test files alongside components
3. **Keep components small** - Single responsibility principle
4. **Use custom hooks** - Extract reusable logic into hooks
5. **Follow naming conventions** - PascalCase for components, camelCase for functions
6. **Organize imports** - Group external, internal, and relative imports
7. **Use absolute imports** - Prefer `@/components/Button` over `../../../components/Button`

### VS Code Workspace Settings

**.vscode/settings.json:**
```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html"
  }
}
```

This setup provides a comprehensive development environment optimized for building a professional React application that integrates seamlessly with your Spring Boot API.