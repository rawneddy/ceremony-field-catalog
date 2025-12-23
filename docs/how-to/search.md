# How To: Search & Filtering

**Purpose:** Understand and modify search/suggest behavior across API and UI
**Use when:** Changing search logic, filters, autocomplete, or discovery behavior
**Don't use when:** Changing context lifecycle → see `contexts.md`
**Source of truth:**
- `CatalogSearchCriteria.java` - search parameter definitions
- `DynamicSearchParameterResolver.java` - query param parsing
- `CatalogCustomRepositoryImpl.java` - MongoDB query building
- `ui/src/pages/DiscoverFieldsPage.tsx` - discovery UI
- `ui/src/pages/ExploreSchemaPage.tsx` - schema search UI

---

## Search Modes

### Discovery Search (`q` parameter)

Global search across multiple fields using OR logic:

```http
GET /catalog/fields?q=amount
```

Searches:
- `fieldPath` (contains)
- `contextId` (contains)
- All metadata values (via `$objectToArray`)

**Code path:** `CatalogCustomRepositoryImpl.buildDynamicQuery()` → `buildDiscoveryQuery()`

### Filter Search (Scoped)

Targeted search using specific parameters:

```http
GET /catalog/fields?contextId=deposits&fieldPathContains=Account&metadata.productCode=DDA
```

| Parameter | Behavior |
|-----------|----------|
| `contextId` | Exact match (case-insensitive, normalized to lowercase) |
| `fieldPathContains` | Contains match on `fieldPath` |
| `useRegex=true` | Treat `fieldPathContains` as regex pattern |
| `metadata.<key>=<value>` | Exact match on metadata field |

**Multi-value metadata:** `metadata.productCode=DDA&metadata.productCode=SAV` → OR within field, AND between fields.

---

## API Endpoints

### Field Search
```http
GET /catalog/fields?contextId=deposits&page=0&size=20
```

### Suggest/Autocomplete
```http
GET /catalog/suggest?field=fieldPath&prefix=/Document&contextId=deposits
```

Suggest fields: `fieldPath`, `contextId`, or any `metadata.<key>`

---

## UI Implementation

### Discover Fields Page (`/`)

The Discovery page has two distinct filtering mechanisms:

#### Server-Side Filtering (Header Bar)
These controls trigger API calls and fetch new data from the backend:

- **Search box:** Global search across fieldPath, contextId, and all metadata values (debounced)
- **Context selector:** Filters to a specific context
- **Metadata filter chips:** Multi-value tag inputs that scope the API query

When you change these, the API returns a fresh set of up to 250 results matching your criteria.

#### Client-Side Filtering (Facet Sidebar)
The left-hand facet sidebar does **client-side filtering only** - no API calls:

- **Facet values:** Click to filter the already-loaded results
- **Counts:** Show how many of the loaded results have each value
- **Behavior:** Selecting a facet value will always reduce or maintain the result count (never increase)

This Splunk-style approach allows fast drill-down into loaded results without round-trips to the server.

**Important:** Facet counts are based on loaded results (max 250), not the global database. The info icon tooltip indicates this.

**Key files:**
- `DiscoverFieldsPage.tsx` - page component with both filter types
- `useFieldSearch.ts` - search hook (server-side)
- `useDiscoveryFacets.ts` - facet computation (client-side)
- `FacetSidebar.tsx` - facet display
- `MetadataFilters.tsx` - header filter chips

### Explore Schema Page (`/schema`)

- **Explicit search:** User clicks "Search" button
- **Required metadata:** Single-value inputs (part of field identity)
- **Optional metadata:** Multi-value tag inputs
- **Field filter:** Client-side filtering of results

**Key files:**
- `ExploreSchemaPage.tsx` - page component
- `InlineRequiredMetadata.tsx` - required inputs
- `InlineOptionalMetadata.tsx` - optional inputs
- `SchemaExportButtons.tsx` - XSD/JSON export

---

## Modifying Search Behavior

### Add New Search Parameter

1. Add field to `CatalogSearchCriteria.java`
2. Handle in `DynamicSearchParameterResolver.java`
3. Add to query in `CatalogCustomRepositoryImpl.buildDynamicQuery()`
4. Update API spec if public

### Change Metadata Query Logic

Edit `CatalogCustomRepositoryImpl.addMetadataFilters()`:
- Current: OR within field, AND between fields
- Multi-value: Creates `$in` query for each field

### Add New Suggest Field

Edit `CatalogController.suggest()` and `CatalogCustomRepository.suggest()`

---

## Common Patterns

### Case Normalization
All metadata keys and values are normalized to lowercase before storage and query.

### Active Context Filtering
By default, only fields from active contexts are returned. Override with `includeInactive=true`.

### Regex Search
When `useRegex=true`:
- `fieldPathContains` is treated as regex pattern
- UI shows toggle between String/Regex modes
- Backend uses MongoDB `$regex` operator
