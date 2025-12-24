# Project Backlog

**Purpose:** Consolidated view of open work items and priorities
**Update when:** Adding new issues, completing work, or re-prioritizing
**Historical record:** See `docs/history/releases/` for release primers

---

## Critical Priority

### Cross-Functional
- [x] ~~**Case sensitivity for schema export**: Now that we have export schema, we need to support true casing again (not lowercase everything). Discovery page needs case-insensitive querying.~~ *(Addressed by casing tracking feature)*
- [ ] **Support field values**: Client-dictated value capture. See `plans/ideas/field-value-capture.md`

### Backend
- [x] ~~**PATCH endpoint status code alignment**: `setCanonicalCasing()` throws `IllegalArgumentException` for "not found" which maps to 400, but OpenAPI documents 404. Align implementation or docs.~~ *(Fixed: Added `FieldNotFoundException` with 404 handler)*

### UI
- [x] ~~**Discovery filter mismatch**: A field can pass `filteredAggregatedFields` even when no single variant matches all active facet filters, causing Variant Explorer to show 0 matches. Table filtering should require at least one variant to satisfy all filters.~~ *(Fixed: 'any' mode now requires at least one variant to match all keys)*

---

## Medium Priority

### Backend
- [ ] **Document casingCounts semantics**: Clarify whether counts represent "documents observed" vs "total occurrences". Currently merges by `+1` per observation record, not `dto.count()`. Add comment or javadoc. *([CODEX:41-42](reviews/20251223_casing-tracking_CODEX.md), [CODEX:140](reviews/20251223_casing-tracking_CODEX.md))*
- [ ] **Document canonical casing scope**: Add javadoc to `CatalogEntry` explaining that `canonicalCasing` is scoped per-entry ID (not shared across all variants of a field path). *([AMP:52-54](reviews/20251223_casing-tracking_AMP.md), [AMP:363-365](reviews/20251223_casing-tracking_AMP.md))*
- [ ] **Document concurrent merge behavior**: Concurrent merges can overwrite `canonicalCasing` due to full-document `saveAll()` writes. Document as known limitation or implement optimistic locking. *([CODEX:49-51](reviews/20251223_casing-tracking_CODEX.md), [AMP:139-142](reviews/20251223_casing-tracking_AMP.md))*
- [ ] **Document PATCH authorization policy**: Add comment explaining whether `/catalog/fields/{fieldId}/canonical-casing` is admin-only or open to all users. *([AMP:623-627](reviews/20251223_casing-tracking_AMP.md))*

### UI
- [ ] **Schema export stale entries**: After bulk-saving canonical casings, the export dialog may open using stale `entries` prop. Consider applying resolutions locally or waiting for cache updates. *([CODEX:89](reviews/20251223_casing-tracking_CODEX.md), [CODEX:137](reviews/20251223_casing-tracking_CODEX.md))*
- [ ] **Clear selectedField on filter-out**: When facet filters change such that `selectedField` is no longer in the filtered set, clear or re-validate the selection to avoid empty panels. *([CODEX:88](reviews/20251223_casing-tracking_CODEX.md), [CODEX:135](reviews/20251223_casing-tracking_CODEX.md))*

### Documentation
- [ ] **Facet sidebar mode documentation**: Add subsection to `docs/how-to/search.md` explaining "Include Any" vs "Require One" modes and Splunk-style drill-down workflow. *([AMP:586-597](reviews/20251223_casing-tracking_AMP.md))*
- [ ] **Fix multi-select wording**: search.md states selecting a facet "will always reduce or maintain the result count" but multi-select ("Include Any") can broaden results. *([CODEX:121](reviews/20251223_casing-tracking_CODEX.md), [CODEX:144](reviews/20251223_casing-tracking_CODEX.md))*

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
