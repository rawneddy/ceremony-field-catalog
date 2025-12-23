# Release 01: Ceremony Field Catalog UI

**Completed:** December 2025
**Scope:** Full React UI for field catalog exploration, schema export, and XML observation submission

---

## What This Release Delivered

A web-based interface for the Ceremony Field Catalog - a system that learns XML field usage patterns from real production traffic rather than trying to statically analyze legacy pass-through systems.

### The Four Pages

| Route | Purpose |
|-------|---------|
| `/` (Discover Fields) | Reactive field exploration with faceted filtering |
| `/schema` (Explore Schema) | Generate XSD/JSON schemas from observed fields |
| `/submit` (Submit Data) | Upload XML files to extract field observations |
| `/contexts` (Manage Contexts) | Create/edit schema containers for observations |

---

## Why This Exists

**The Problem:** Legacy middleware systems pass XML through without understanding it. When asked "what fields does this system use?", the answer is usually "we don't know" or requires manual archaeology through years of production logs.

**The Solution:** Instrument the middleware to observe actual XML traffic and report field usage. The catalog accumulates these observations, building an empirical map of field usage patterns including:
- Which fields exist
- How often they occur (minOccurs/maxOccurs)
- Whether they allow null/empty values
- Which business contexts use them

**Key Insight:** Field identity is determined by `hash(contextId + requiredMetadata + fieldPath)`. This means the same XPath in different business contexts (or with different product codes) is tracked as separate fields.

---

## Core Concepts to Understand

### Dynamic Context System

Contexts are not hardcoded. Each business domain creates its own context with:
- **Required metadata**: Keys that contribute to field identity (e.g., `productCode`, `action`)
- **Optional metadata**: Keys stored for reference but don't affect identity (e.g., `channel`)
- **Extraction rules**: XPath patterns + validation regex for auto-extracting metadata from XML

**Why this matters:** A field observed with `productCode=DDA` is a different field than the same XPath with `productCode=SAV`. The context's required metadata defines what makes fields unique within that domain.

### Metadata Normalization

All metadata keys and values are normalized to **lowercase** for case-insensitive matching. Field paths are also lowercase. The UI displays values as stored (lowercase) and the API normalizes inputs.

### Field Merging

When new observations arrive, they merge with existing fields:
- `minOccurs` = minimum of old and new
- `maxOccurs` = maximum of old and new
- `allowsNull` = true if ever observed null
- `allowsEmpty` = true if ever observed empty
- Observation counts accumulate

Observations are pre-aggregated by field identity within a batch before merging to prevent duplicate entries from skewing statistics.

---

## Notable Implementation Patterns

### Client-Side Faceted Filtering with Disjunctive Counting

The Discover Fields page uses a client-side faceting algorithm that enables instant filtering without API calls.

**Disjunctive counting** means each facet's counts show "what would I get if I selected this value?" by excluding that facet's own filter from count calculations. This is the standard UX pattern used by e-commerce sites.

```
Before filtering (100 results):
  productcode: dda(40), sav(35), cda(25)
  action: fulfillment(60), inquiry(40)

After selecting productcode=dda:
  productcode: dda(40), sav(35), cda(25)  ← unchanged (own filter excluded)
  action: fulfillment(30), inquiry(10)    ← updated (only dda entries)
```

**Implementation:** `useFacets` hook scans loaded results, builds facet index, applies selections, and recomputes counts with the disjunctive algorithm.

### Smart Metadata Extraction

The upload workflow attempts to auto-extract metadata from XML using context-defined rules:

```typescript
metadataRules: {
  productcode: {
    xpaths: ["/Ceremony/ProductCode", "/Ceremony/@productCode"],
    validationRegex: "^[A-Z]{2,4}$"
  }
}
```

For each file, each rule's XPaths are tried in order. First valid match wins. This enables zero-touch uploads when XML structure is predictable.

### TagInput Fixed Positioning

Tag/chip inputs with autocomplete dropdowns use `position: fixed` with viewport coordinate calculation to escape parent `overflow: hidden` containers (common in modals). The dropdown dynamically positions above or below based on available viewport space.

### Three-Step Upload with Bin Grouping

1. **Select Context** - Loads extraction rules
2. **Scan Files** - Parses XML, extracts metadata, groups by completeness
3. **Review & Submit** - Files grouped into "bins" by metadata combination

Files with identical required metadata are binned together and can be submitted as a batch. Incomplete files (missing required metadata) go to a separate bin for manual editing.

### Schema Export

The Explore Schema page generates XSD or JSON Schema from catalog entries. Users search for fields, then export the matching structure as a schema definition. This addresses the question "what schema should I validate against?" based on empirically observed field usage.

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot 3.x, Java 17, MongoDB |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| State | React Query (server state), local state for UI |
| Testing | Testcontainers (real MongoDB), strict TypeScript |

### Key Backend Components

- `CatalogService.merge()` - Core observation merging logic
- `CatalogCustomRepositoryImpl` - Dynamic MongoDB queries with aggregation
- `DynamicSearchParameterResolver` - Converts any query param to metadata filter
- `ContextService` - Context lifecycle with schema evolution protection

### Key Frontend Components

- `useFieldSearch` - React Query hook for search with debouncing
- `useFacets` - Client-side faceted filtering engine
- `useXmlUpload` - File parsing, metadata extraction, bin management
- `TagInput` - Reusable chip input with autocomplete and keyboard navigation

---

## What Was Explicitly Deferred

These items were considered but left for future work (see `plans/BACKLOG.md`):

- **Tree view** - Hierarchical display of field paths
- **Field comparison** - Compare fields across contexts
- **Saved searches** - Bookmarkable search URLs
- **Column header filters** - Inline table filtering
- **Usage analytics** - Charts and dashboards (decided not needed)

---

## Key Files for Understanding the Implementation

| Purpose | Location |
|---------|----------|
| UI entry point | `ui/src/App.tsx` |
| Search hook | `ui/src/hooks/useFieldSearch.ts` |
| Facet logic | `ui/src/hooks/useFacets.ts` |
| XML parsing | `ui/src/utils/xmlParser.ts` |
| Metadata extraction | `ui/src/lib/metadataExtractor.ts` |
| Schema generation | `ui/src/lib/schema/` |
| API client | `ui/src/services/catalogApi.ts` |
| Backend merge | `src/main/java/com/ceremony/catalog/service/CatalogService.java` |
| Custom queries | `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java` |
| Context domain | `src/main/java/com/ceremony/catalog/domain/Context.java` |

---

## Configuration

All UI configuration is centralized in `ui/src/config.ts`:

| Setting | Value | Purpose |
|---------|-------|---------|
| `MAX_RESULTS_PER_PAGE` | 250 | Results limit (facets work on loaded set) |
| `DEBOUNCE_MS` | 500 | Search input debounce |
| `AUTOCOMPLETE_DEBOUNCE_MS` | 300 | Suggestion debounce |
| `DETAIL_PANEL_ANIMATION_MS` | 100 | Slide-out animation timing |

Backend configuration is in `src/main/resources/application.yml` with environment-specific overrides.

---

## Lessons and Design Decisions

### Why client-side faceting?

Server-side faceting with MongoDB aggregation was considered but adds complexity. Since results are capped at 250 and faceting is instant, client-side was simpler and provides better UX (no loading states for filter changes).

### Why lowercase everything?

Case-insensitive matching is essential for usability, but MongoDB regex case-insensitivity is slow. Normalizing to lowercase at write time enables fast exact-match queries. The tradeoff is the UI displays lowercase, which is acceptable for this domain.

### Why hash-based field identity?

Using `hash(contextId + requiredMetadata + fieldPath)` as the document ID provides:
- Deterministic, collision-resistant IDs
- Natural deduplication (same identity = same document)
- Clean API surface (no auto-generated IDs to manage)

### Why separate Discovery and Schema pages?

Different mental models:
- **Discovery** = "What fields exist? Let me explore." (reactive, browsing)
- **Schema** = "I need to export a schema for this specific set of fields." (intentional, precise)

Combining them made neither use case ideal.

---

## Summary

Release 01 delivered a complete field catalog UI enabling:
1. Field discovery through reactive search with faceted filtering
2. Schema generation (XSD/JSON) from observed field usage
3. XML upload with smart metadata extraction
4. Context management for defining business domains

The system learns field usage empirically from production traffic, solving the "what fields does this system use?" problem for legacy middleware.

For detailed requirements and implementation specs, see:
- `plans/releases/01/REQUIREMENTS.md`
- `plans/releases/01/IMPLEMENTATION.md`
