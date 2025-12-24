# Project Backlog

**Purpose:** Consolidated view of open work items and priorities
**Update when:** Adding new issues, completing work, or re-prioritizing
**Historical record:** See `docs/history/releases/` for release primers

---

## Critical Priority

### Cross-Functional
- [ ] **Support field values**: Client-dictated value capture. See `plans/ideas/field-value-capture.md`

---

## Medium Priority

*(No open items)*

---

## Low Priority

### Production Readiness
- [ ] Add structured logging (JSON format via logback) for production observability
- [ ] Add Micrometer metrics for observation submission rate, search execution time, MongoDB query latency

### Quality Assurance
- [ ] Add controller/REST-level integration tests for full request/response cycle
- [ ] Add minimal UI tests for core hooks/components (useXmlUpload, xmlParser)
- [ ] **casingUtils unit tests**: Test `getDominantCasing` (especially ties), `getSortedCasingVariants`, `needsCasingResolution`. *([GEMINI:79](reviews/20251223_casing-tracking_GEMINI.md), [CODEX:112](reviews/20251223_casing-tracking_CODEX.md))*
- [ ] **CatalogService casing merge tests**: Verify casing variants tracked correctly, batch deduplication, canonicalCasing not modified during merge. *([AMP:514-517](reviews/20251223_casing-tracking_AMP.md), [GEMINI:80-82](reviews/20251223_casing-tracking_GEMINI.md), [CODEX:103-104](reviews/20251223_casing-tracking_CODEX.md))*
- [ ] **setCanonicalCasing tests**: Test setting known key succeeds, unknown key fails with correct status, clearing works, not-found produces expected error. *([AMP:523-526](reviews/20251223_casing-tracking_AMP.md), [CODEX:104-108](reviews/20251223_casing-tracking_CODEX.md))*
- [ ] **E2E casing resolution flow**: Create field with 2 variants → try export (blocked) → resolve conflict → export succeeds. *([GEMINI:83-87](reviews/20251223_casing-tracking_GEMINI.md))*

### Documentation
- [ ] Document API versioning plan (add to ARCHITECTURE.md or OpenAPI annotations)

### Scaling
- [ ] Add wildcard index `metadata.$**` for efficient metadata field queries at scale

---

## Recently Completed

Items moved here after completion, then incorporated into release primers:

### Casing Tracking Feature (Dec 2025)
- [x] **Case sensitivity for schema export**: Casing tracking feature preserves observed casings while keeping lowercase identity
- [x] **PATCH endpoint status code alignment**: Added `FieldNotFoundException` with 404 handler
- [x] **Discovery filter mismatch**: 'any' mode now requires at least one variant to match all filter keys
- [x] **Document casingCounts semantics**: Added comment in CatalogService.merge()
- [x] **Document canonical casing scope**: Added class and field javadoc to CatalogEntry
- [x] **Document concurrent merge behavior**: Added comment noting last-write-wins as accepted limitation
- [x] **Document PATCH authorization policy**: Added comment in CatalogController
- [x] **Schema export stale entries**: Now uses server-validated mutation responses to build merged entries
- [x] **Clear selectedField on filter-out**: Added useEffect in DiscoverFieldsPage
- [x] **Facet sidebar mode documentation**: Added table with Include Any / Require All modes to search.md
- [x] **Fix multi-select wording**: Fixed search.md with mode-specific behavior description

### Earlier Fixes
- [x] **Route from discovery to schema broken**: Fixed incorrect route `/search` to `/schema` in VariantExplorerPanel.tsx
- [x] **Merge deduplication bug**: Pre-aggregate observations by field identity within `CatalogService.merge()`
- [x] **Config binding mismatch**: Fixed `max-xpath-length` vs `maxFieldPathLength`
- [x] **N+1 counts in ContextService**: Replaced with aggregation-based approach
- [x] **Context ID normalization**: Fixed case-sensitive ID handling in controller
- [x] **UI nullable optionalMetadata**: Fixed null handling in context types
- [x] **useSuggest AbortController**: Fixed signal passing to axios
- [x] **Match highlighting regex**: Fixed special character escaping
- [x] **Add comments for complex MongoDB operators**: Documented `$objectToArray` and `$anyElementTrue`
- [x] **Unify error handler**: Now returns `ErrorResponse` record consistently
- [x] **Add tooltips for long field paths**: Reduced reliance on detail panel

---

## Future Ideas (Not Prioritized)

- **Tree view**: Hierarchical display of field paths
- **Field comparison**: Compare fields across contexts or metadata variants
- **Saved searches**: Bookmark and share search queries
- **Column header filters**: Inline filtering in data grid headers (Field Path, Context, Null?, Empty?)
- **Shareable URL state**: Sync search/filter state to URL for bookmarkable searches
- **Casing auto-resolution rules**: Allow "Always prefer PascalCase" or similar rules to reduce manual effort. *([GEMINI:107](reviews/20251223_casing-tracking_GEMINI.md), [AMP:699-700](reviews/20251223_casing-tracking_AMP.md))*
- **casingCounts cardinality cap**: Bound growth defensively (keep top N by count) to prevent unbounded document growth from adversarial inputs. *([CODEX:125-128](reviews/20251223_casing-tracking_CODEX.md), [AMP:705](reviews/20251223_casing-tracking_AMP.md))*
- **Batch canonical casing endpoint**: Single endpoint to resolve multiple casings, avoiding N concurrent PATCHes. *([CODEX:28](reviews/20251223_casing-tracking_CODEX.md), [CODEX:98](reviews/20251223_casing-tracking_CODEX.md))*
- **Refactor duplicated filter logic**: Extract shared "matches facet filters" predicate to prevent table/panel drift. *([CODEX:83](reviews/20251223_casing-tracking_CODEX.md), [CODEX:136](reviews/20251223_casing-tracking_CODEX.md))*

---

## Planning Documents

For feature designs and requirements, see:
- `plans/ideas/field-value-capture.md` - Field value capture feature design
- `plans/releases/01/REQUIREMENTS.md` - UI requirements
- `plans/releases/01/IMPLEMENTATION.md` - UI implementation plan
