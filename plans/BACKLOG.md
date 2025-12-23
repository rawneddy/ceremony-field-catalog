# Project Backlog

**Purpose:** Consolidated view of open work items and priorities
**Update when:** Adding new issues, completing work, or re-prioritizing
**Historical record:** See `docs/history/completed.md` for completed work

---

## Critical Priority

### Cross-Functional
- [ ] **Case sensitivity for schema export**: Now that we have export schema, we need to support true casing again (not lowercase everything). Discovery page needs case-insensitive querying.
- [ ] **Support field values**: Client-dictated value capture. See `plans/field-value-capture.md`

### Backend
- (none currently)

### UI
- [ ] **Route from discovery to schema broken**: Clicking the link icon in metadata detail slide-out opens empty/white page

---

## Medium Priority

### Backend
- (none currently)

### UI
- (none currently)

---

## Low Priority

### Production Readiness
- [ ] Add structured logging (JSON format via logback) for production observability
- [ ] Add Micrometer metrics for observation submission rate, search execution time, MongoDB query latency

### Quality Assurance
- [ ] Add controller/REST-level integration tests for full request/response cycle
- [ ] Add minimal UI tests for core hooks/components (useXmlUpload, xmlParser)

### Documentation
- [ ] Document API versioning plan in API_SPECIFICATION.md

---

## Recently Completed

Items moved here after completion, then archived to `docs/history/completed.md`:

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

## Planning Documents

For feature designs and requirements, see:
- `plans/field-value-capture.md` - Field value capture feature design
- `plans/releases/01/REQUIREMENTS.md` - UI requirements
- `plans/releases/01/IMPLEMENTATION.md` - UI implementation plan
