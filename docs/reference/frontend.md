# Frontend Reference

**Purpose:** Deep architecture reference for UI development
**Use when:** Major refactoring, understanding component structure, onboarding
**See also:** How-to docs for specific tasks

---

## Directory Structure

```
ui/src/
├── pages/                    # Route-level components
│   ├── DiscoverFieldsPage.tsx
│   ├── ExploreSchemaPage.tsx
│   ├── SubmitDataPage.tsx
│   └── ManageContextsPage.tsx
├── components/
│   ├── layout/              # App shell
│   │   ├── Layout.tsx
│   │   └── Header.tsx
│   ├── search/              # Discovery & schema
│   │   ├── FieldTable.tsx
│   │   ├── FacetSidebar.tsx
│   │   ├── ContextSelector.tsx
│   │   └── MetadataFilters.tsx
│   ├── upload/              # Submit data
│   │   ├── BinRow.tsx
│   │   └── MetadataEditorModal.tsx
│   ├── contexts/            # Context management
│   │   ├── ContextCard.tsx
│   │   └── ContextFormModal.tsx
│   └── ui/                  # Shared primitives
│       ├── Skeleton.tsx
│       ├── EmptyState.tsx
│       └── ErrorBanner.tsx
├── hooks/                   # Custom hooks
│   ├── useFieldSearch.ts
│   ├── useContexts.ts
│   ├── useXmlUpload.ts
│   └── useDebounce.ts
├── services/                # API client
│   └── api.ts
├── lib/                     # Pure utilities
│   └── schema/
│       ├── xsdGenerator.ts
│       └── jsonSchemaGenerator.ts
├── utils/                   # Utilities
│   └── xmlParser.ts
├── types/                   # TypeScript types
│   └── index.ts
└── config.ts                # Runtime configuration
```

---

## Routes & Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `DiscoverFieldsPage` | Reactive field exploration with facets |
| `/schema` | `ExploreSchemaPage` | Schema generation and export |
| `/submit` | `SubmitDataPage` | XML upload workflow |
| `/contexts` | `ManageContextsPage` | Context CRUD |

---

## State Management

### React Query

All server state uses TanStack Query:

```typescript
// Fetching
const { data, isLoading, error } = useFieldSearch(params);

// Mutations
const { mutate } = useContextMutations();
```

### Query Keys

Defined in `utils/queryKeys.ts`:

```typescript
export const queryKeys = {
  fields: (params) => ['fields', params],
  contexts: (includeInactive) => ['contexts', includeInactive],
  // ...
};
```

### Local State

Component-level state for UI concerns:
- Form inputs
- Modal visibility
- Selected items

---

## Key Hooks

### useFieldSearch

Search with automatic query execution:

```typescript
const { data, isLoading } = useFieldSearch({
  contextId: 'deposits',
  q: 'amount',
  metadata: { productCode: ['DDA'] }
}, enabled, cacheKey);
```

### useContexts

Fetch contexts with optional counts:

```typescript
const { data: contexts } = useContexts(includeInactive);
```

### useXmlUpload

Upload workflow state machine:

```typescript
const { bins, scanFiles, submitBin, clearBins } = useXmlUpload();
```

### useDebounce

Debounce value changes:

```typescript
const debouncedValue = useDebounce(value, 300);
```

---

## Component Patterns

### Page Layout

All pages use `Layout` wrapper:

```tsx
const MyPage = () => (
  <Layout>
    <div className="bg-paper p-6">
      {/* Header content */}
    </div>
    <div className="flex-1 overflow-auto">
      {/* Main content */}
    </div>
  </Layout>
);
```

### Shared Components

| Component | Usage |
|-----------|-------|
| `ContextSelector` | Dropdown for context selection |
| `TruncationWarning` | Results limit indicator |
| `Skeleton` | Loading placeholders |
| `EmptyState` | No results display |
| `ErrorBanner` | Error display |

---

## Styling

### Tailwind v4

Theme defined in `ui/src/index.css`:

```css
@theme {
  --color-ceremony: #1e3a5f;
  --color-ink: #1a1a2e;
  --color-paper: #f8f9fa;
  --color-steel: #e2e8f0;
  --color-mint: #10b981;
}
```

### Common Classes

| Class | Purpose |
|-------|---------|
| `bg-ceremony` | Primary brand color |
| `text-ink` | Primary text |
| `bg-paper` | Background |
| `border-steel` | Borders |
| `text-mint` | Success states |

---

## TypeScript

### Strict Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Key Types

```typescript
interface CatalogEntry {
  id: string;
  contextId: string;
  fieldPath: string;
  metadata: Record<string, string>;
  // ...
}

interface Context {
  contextId: string;
  displayName: string;
  requiredMetadata: string[];
  optionalMetadata: string[];
  active: boolean;
}
```

---

## Testing

### Type Checking

```bash
npm run typecheck  # Must pass before commit
```

### Build Verification

```bash
npm run build      # Production build
npm run lint       # ESLint
```
