# Casing + Discovery Facets Review (features/docs-alignment)

Reviewed changes between `main` and `HEAD` (~1,700 LOC across 24 files). I also ran `npm run typecheck` in `ui/` (passes).

## Executive Summary

This is a thoughtful and cohesive set of improvements that moves the product meaningfully forward: casing tracking preserves the existing lowercase identity invariant while surfacing real-world casing in the UI, canonical casing introduces an explicit “human decision” layer for schema export quality, and the Discovery page facet work reduces API churn while improving terminology and feedback. Overall code quality is solid: TypeScript remains strict, the UI additions are consistent with existing design language, and the backend changes are contained.

There are, however, a couple of issues that I’d treat as merge-blocking because they can produce surprising or incorrect behavior in common flows. The biggest is Discovery facet filtering semantics: the main table’s filter logic does not require a *single* variant to satisfy all active facet filters, while the Variant Explorer panel does—this can legitimately yield “field shown in table” but “0 matching variants” in the panel, which reads as a bug to users. On the backend, canonical casing updates are vulnerable to being overwritten by concurrent merges due to full-document saves; even if concurrency is “unlikely,” this is the kind of silent data loss that’s hard to detect and painful to debug.

With those addressed (plus a small doc correction and tightening error-code behavior on the PATCH endpoint), this looks close to ready to merge.

## Architecture Assessment

### (1) `casingCounts` separated from `fieldPath` identity
- Strong decision: keeps all existing query/index/identity semantics intact while enabling richer display/export behavior.
- The schema export pipeline currently uses the displayed casing as structural input (`fieldTree` segments). That’s OK as long as export is scoped to a single required-metadata identity (which the `/schema` page enforces). If the product later supports exporting across multiple required-metadata values, you’ll want a normalized structural key (lowercase) with a separate “display label” per node to avoid duplicated branches.
- Consider bounding `casingCounts` growth defensively (see Security) since it’s an attacker-controlled key space once observations are accepted.

### (2) Client-side vs server-side filtering for Discovery
- The split is conceptually correct: header bar drives server fetch; sidebar facets refine the loaded dataset locally.
- The approach reduces latency and avoids “facet click = API call” thrash.
- The remaining architectural risk is *semantic drift* between components: filtering logic now exists in at least two places (table-level aggregation filtering and variant-level filtering), and they currently disagree.

### (3) Canonical casing resolution flow before export
- Product-wise, gating export on unresolved conflicts is a reasonable default for “high-quality schema output,” especially with the “Auto-select Dominant” affordance.
- The persistence model (canonical casing stored on `CatalogEntry`) aligns with `/schema` enforcing a single required-metadata combination; it would not generalize cleanly to cross-required-metadata exports without additional rules.
- The flow would benefit from either (a) a bulk endpoint or (b) client-side throttling to avoid N concurrent PATCHes when conflicts are large.

## Backend Review

### CatalogEntry domain changes
- Adding `casingCounts` and `canonicalCasing` to `CatalogEntry` is minimal and matches the design doc.
- Consider whether responses should omit `casingCounts` when null/empty to reduce payload noise (not required, but can help).

### InputValidationService `CleanedFieldPath` record pattern
- The record is a clean way to preserve the original casing while still normalizing for identity.
- There is some duplication between `validateAndCleanFieldPath()` and `validateAndCleanFieldPathWithCasing()`; a shared private “clean + validate” helper would reduce divergence risk.

### CatalogService merge logic for casing counts
- The merge updates `casingCounts` by `+1` per observation record. This is valid if the count represents “number of documents/batches in which this casing was observed,” but it’s worth making that explicit because the observation DTO also has a `count` field (occurrences within a batch) and the UI labels the column “Count.”
- If “Count” is intended to represent total occurrences, `casingCounts` should merge by `+dto.count()` instead of `+1`.

### PATCH endpoint design for canonical casing
- Endpoint shape is sensible (`PATCH /catalog/fields/{fieldId}/canonical-casing`) and validation “canonical must be one of observed keys” is a good guardrail.
- The documented `404` response does not appear to be produced: the service throws `IllegalArgumentException` for “Field not found,” which is typically mapped to `400` unless you have a custom exception mapper. Align the implementation and the OpenAPI contract.

### Potential concurrency concerns
- **Canonical casing overwrite risk:** `merge()` reads entries, mutates, and `saveAll()` writes whole documents. A concurrent `setCanonicalCasing()` that occurs after the read but before the write can be silently overwritten (canonical reverted to null or prior value).
- **Lost increments risk:** concurrent merges can drop casing count increments for the same reason (last write wins).
- If you expect concurrent uploads/edits (multi-user or background ingestion), consider Mongo `$inc` / `$set` update operators or optimistic locking (`@Version`) with retry semantics.

### MongoDB query implications
- No immediate query changes, but documents get larger and returned payloads expand. The impact is likely fine at current page sizes (≤250), but `casingCounts` is a multiplier on response size.
- Monitor document growth; unbounded `casingCounts` variants can push documents toward size limits over time in adversarial scenarios.

## Frontend Review

### React state management in `DiscoverFieldsPage` (metadata vs facetFilters vs facetModes)
- The split is the right mental model (server filters vs local facets), and comments help.
- State complexity is acceptable at this scale, but it’s now easy to introduce bugs because filtering semantics live in multiple places. A small “discovery filtering” utility/hook that defines the predicate once would reduce risk.
- Clearing `facetFilters` on context change is correct; consider also clearing/validating `selectedField` when facet filters change (see Edge Cases).

### `useDiscoveryFacets` hook implementation
- Counting at the aggregated field-path level (rather than per variant) matches the UI’s “unique field paths” terminology.
- Stable counts can be a good UX for exploration, but make sure the UI clearly communicates that counts do **not** reflect the currently filtered subset (see “Facet count semantics” below).

### `CasingResolutionPanel` modal UX
- Solid overall: clear description, progress feedback, “Auto-select Dominant,” and disabled “Save & Export” until complete.
- Minor robustness: the “resolved” counter is based on `selections.size`, which can become misleading if `entries` changes under the modal or selections include ids that no longer need resolution.

### `VariantExplorerPanel` filtering logic
- The show-all vs show-matching toggle is a good UX compromise; dimming non-matching variants is especially helpful.
- The panel-level predicate requires a single variant match all filters, which is consistent with user expectation, but currently inconsistent with the main table predicate (critical issue).
- Consider adding an explicit empty state when `matchingVariants.length === 0` and `!showAllVariants` to avoid rendering an empty table with no explanation.

### TypeScript type safety
- Strict mode held up; `npm run typecheck` passes.
- Optional fields `casingCounts`/`canonicalCasing` are handled defensively throughout.

### Component responsibilities / separation of concerns
- `casingUtils.ts` is a good extraction and keeps UI logic readable.
- There’s some duplication between Discovery filtering in `DiscoverFieldsPage` and `VariantExplorerPanel` (`variantMatchesFilters`). Consider a shared helper so the table and panel can’t drift.

## Edge Cases & Potential Bugs

- **Discovery filter mismatch:** a field can pass `filteredAggregatedFields` even when *no single variant* matches all active facet filters, causing the Variant Explorer panel to show 0 matches (or all dimmed). This is likely the biggest user-visible correctness issue.
- **Stale selection:** `selectedField` can remain open even if facet filters change such that the selected field is no longer in the filtered set, leading to confusing “empty” or “0 matching” views.
- **Schema export timing:** after bulk-saving canonical casings, the export dialog may open using a stale `entries` prop (depending on cache update timing). This matters if the chosen canonical casing differs from the dominant casing.
- **Backend overwrite:** concurrent merges can overwrite canonical casing or drop casing count increments due to full-document writes.
- **Counts semantics ambiguity:** “Count” in the schema table appears to be total casing observations; if this is actually “documents observed,” consider labeling/tooltip to avoid confusion with min/max occurs.

## Performance Considerations

- **Client-side filtering of ~250 aggregated fields:** should be fine; `useMemo` boundaries are appropriate.
- **Facet computation:** `useDiscoveryFacets` is O(fields × variants × metadataKeys). At the capped result sizes it’s OK, but keep an eye on variant explosion per field.
- **Re-renders:** `facetFilters` and `facetModes` are object states that will churn; current `useMemo` usage mitigates most of the cost.
- **Canonical casing resolution:** `Promise.all` of N PATCH requests can spike concurrency. Consider batching (bulk endpoint) or limiting concurrency client-side for large N.

## Testing Gaps

### Backend
- `CatalogService.merge()` should test that casing variants are tracked correctly and don’t regress field identity.
- `CatalogService.setCanonicalCasing()` should test:
  - setting to a known casing key succeeds
  - setting to an unknown key fails with correct status code
  - clearing works
  - “not found” produces 404 (or adjust contract)
- A concurrency-oriented test (or at least a documented known limitation) for canonical casing overwrites would be valuable.

### Frontend
- Unit tests for `casingUtils.ts` (dominant selection, sorting, resolution predicates).
- Behavioral tests for:
  - Discovery facet filtering predicate (ensure “field shown” implies at least one matching variant)
  - Variant Explorer “show all vs matching” toggle
  - Schema export gating and the “Save & Export” path

## Documentation Alignment

- `docs/how-to/search.md` correctly captures the server-side vs client-side filter split.
- The statement that selecting a facet value “will always reduce or maintain the result count (never increase)” is not accurate once multi-select (“Include Any”) exists; adding values can broaden results.

## Security Review

- `casingCounts` can be forced to grow via many distinct casing variants if the observation submission endpoint is accessible to untrusted clients; consider:
  - capping the number of distinct casing keys stored per entry (e.g., keep top N by count)
  - rejecting new variants after a threshold
  - logging/metrics for unusually high variant cardinality
- The canonical casing endpoint is a write operation; ensure authz/authn (if applicable) and rate limiting match your deployment assumptions.
- Input validation on field paths remains strong (length + format), which helps reduce payload and injection risks.

## Specific Code Comments

- `ui/src/pages/DiscoverFieldsPage.tsx:56` - Filtering aggregated fields should require **one variant** to satisfy **all** active facet filters; current logic allows different variants to satisfy different keys, which can produce “0 matching variants” in the panel.
- `ui/src/pages/DiscoverFieldsPage.tsx:245` - Consider clearing or re-validating `selectedField` when `facetFilters` change (or when the selected field is filtered out) to avoid stale/empty panels.
- `ui/src/components/search/VariantExplorerPanel.tsx:38` - `variantMatchesFilters()` duplicates Discovery filtering logic; consider exporting a shared predicate to keep semantics aligned.
- `ui/src/components/search/SchemaExportButtons.tsx:58` - After saving canonical casings, the export dialog may open with stale `entries`; consider applying `resolutions` locally to `entries` or waiting for cache updates/refetch.
- `ui/src/components/search/CasingResolutionPanel.tsx:48` - `resolvedCount` uses `selections.size`; compute resolved count as the intersection with `unresolvedEntries` to avoid misleading “remaining” counts if props change.
- `ui/src/lib/schema/fieldTree.ts:79` - Using display-cased segments as `children` keys can create duplicate nodes if casing differs across entries; consider keying by normalized segment and storing a display label separately (future-proofing).
- `src/main/java/com/ceremony/catalog/service/CatalogService.java:85` - `casingCounts.merge(..., 1L, ...)` should be explicitly documented as “documents observed” vs “occurrences”; if you intend occurrences, use `dto.count()`.
- `src/main/java/com/ceremony/catalog/service/CatalogService.java:112` - `saveAll()` performs whole-document writes; concurrent merges/patches can overwrite `canonicalCasing` or drop increments. Consider atomic updates or optimistic locking.
- `src/main/java/com/ceremony/catalog/service/CatalogService.java:287` - “Field not found” is thrown as `IllegalArgumentException`; unless mapped specially, this won’t return the documented 404.
- `src/main/java/com/ceremony/catalog/api/CatalogController.java:282` - File is missing a trailing newline.
- `docs/how-to/search.md:87` - Multi-select facets can increase result count; adjust wording or scope it to single-select behavior.

## Recommendations

### Critical (must fix before merge)
- Align Discovery filtering semantics so “field shown in table” implies at least one variant matches all active facet filters (and the Variant Explorer shows those variants by default).
- Prevent (or explicitly accept and document) canonical casing overwrite from concurrent merges; at minimum, ensure merges don’t accidentally clear newly-set `canonicalCasing`.
- Align PATCH endpoint status codes with OpenAPI docs (either implement 404 or document 400-only behavior).

### Important (should fix soon)
- Ensure schema export uses the chosen canonical casings deterministically (don’t rely on eventual refetch timing).
- Add UI empty states/tooltips clarifying “Count” meaning and facet-count semantics.
- Consider batching/throttling canonical casing PATCH calls for large conflict sets.

### Minor (nice to have)
- Refactor duplicated “matches facet filters” logic into a shared helper.
- Stabilize `getSortedCasingVariants()` ordering for ties (e.g., secondary sort by casing string) for consistent UI.
- Add trailing newline to `CatalogController.java`.

### Future considerations
- Add defensive caps/metrics around `casingCounts` variant cardinality.
- If export ever spans multiple required-metadata identities, move canonical casing to a higher-level key (e.g., `(contextId, normalizedFieldPath)`) or introduce a deterministic merge rule for casing across entries.
