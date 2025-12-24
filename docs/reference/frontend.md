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
│   │   ├── FacetPopover.tsx           # Popover for facet filtering
│   │   ├── ContextSelector.tsx
│   │   ├── MetadataFilters.tsx
│   │   ├── VariantExplorerPanel.tsx   # Explore variants of a field path
│   │   ├── DiscoveryReturnBanner.tsx  # Return nav from Schema page
│   │   ├── CasingResolutionPanel.tsx  # Select canonical casing
│   │   └── FieldDetailPanel.tsx       # Right panel showing field details
│   ├── upload/              # Submit data
│   │   ├── BinRow.tsx
│   │   └── MetadataEditorModal.tsx
│   ├── contexts/            # Context management
│   │   ├── ContextCard.tsx
│   │   └── ContextFormModal.tsx
│   └── ui/                  # Shared primitives
│       ├── Skeleton.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBanner.tsx
│       ├── Tooltip.tsx                # Generic hover tooltip
│       └── OptionalMetadataIndicator.tsx  # Optional metadata display
├── hooks/                   # Custom hooks
│   ├── useFieldSearch.ts
│   ├── useContexts.ts
│   ├── useXmlUpload.ts
│   ├── useDebounce.ts
│   ├── useDiscoveryFacets.ts          # Client-side facet computation
│   ├── useFacets.ts                   # Facet state and filtering
│   └── useSetCanonicalCasing.ts       # API hook for canonical casing
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
  fieldPath: string;                          // Lowercase for identity/search
  requiredMetadata: Record<string, string>;   // Single value per key
  optionalMetadata: Record<string, string[]>; // Accumulated values as arrays
  casingCounts: Record<string, number>;       // Original casings with counts
  canonicalCasing: string | null;             // User-selected casing for export
  minOccurs: number;
  maxOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
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

### Helper Functions

For working with the split metadata structure:

```typescript
import { getCombinedMetadata, getAllMetadataValues } from '../types';

// Merge both metadata maps for display (optional values joined with ", ")
const combined = getCombinedMetadata(entry);

// Get all key/value pairs for facet extraction
const pairs = getAllMetadataValues(entry);
// Returns: [{ key: 'productcode', value: 'dda' }, { key: 'productcode', value: 'sav' }, ...]
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
