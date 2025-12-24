# Multi-Value Optional Metadata Review (requiredMetadata + optionalMetadata)

Reviewed staged changes via `git diff --staged` (~1.3k LOC across backend + UI). Per the task context: required metadata is part of field identity, optional metadata should accumulate all observed values to make filtering reliable.

## Executive Summary

The core model split is the right fix for “last write wins” optional metadata: `requiredMetadata` stays single-valued + identity-defining, while `optionalMetadata` accumulates observed values and enables correct “field observed with State=WI” filtering. The UI refactors (facet extraction + filtering predicates) are directionally solid and largely keep existing behavior while expanding to multi-valued optional metadata.

The main gaps to address before relying on this in production are:

- **Data migration/back-compat:** existing documents with `metadata` will not populate `requiredMetadata`/`optionalMetadata`, so they will effectively disappear from metadata-related search/filtering and may render oddly in the UI.
- **MongoDB indexing/query mechanics:** the new indexes as defined won’t materially help the dot-path queries you’re issuing, and one of the `suggestValues()` implementations will under-suggest optional metadata values.
- **Determinism + payload growth:** using `Set` + `HashSet` for `optionalMetadata` introduces non-deterministic ordering in JSON and risks unbounded growth without a cap/eviction policy.

## Backend Review

### Data model split: good, but legacy docs need a plan

- `src/main/java/com/ceremony/catalog/domain/CatalogEntry.java:43` introduces `requiredMetadata` and `optionalMetadata` and removes the legacy `metadata` field.
- Without a migration (or a read-converter), legacy docs with `metadata` will deserialize with `requiredMetadata == null` and `optionalMetadata == null`. That breaks:
  - Schema variant display/keying (UI `formatSchemaKey()` will collapse to `contextId` only).
  - Metadata filtering (repository now queries `requiredmetadata.*` / `optionalmetadata.*` only).

Recommendation (pick one):

1) **One-time migration (preferred):** for each `catalog_fields` doc with `metadata`, split it into `requiredmetadata` and `optionalmetadata` using the `contexts` collection’s required/optional key lists, then `$unset` legacy `metadata`.
2) **Read-time back-compat:** temporarily keep a `@Field("metadata")` legacy map and translate in a custom `MongoConverter` (still needs context-aware splitting, so this is harder unless you treat “all legacy metadata becomes required” which is semantically wrong).

### Merge logic: correct shape, but consider determinism and concurrency

- `src/main/java/com/ceremony/catalog/service/CatalogService.java:66` filters optional fields separately and `accumulateOptionalMetadata()` merges into per-key sets (`:376`).
- The merge semantics are correct for “accumulate all observed values”, but two practical issues:
  - **Ordering:** `HashSet` iteration order is nondeterministic; when serialized, `optionalMetadata[key]` order can jitter between responses. This will show up as “CA, WI” vs “WI, CA” in the UI. Consider `SortedSet`/`TreeSet` per key, or sort before persisting/serializing.
  - **Lost updates under concurrency:** the service already notes full-document write risks; this change makes that more visible because a concurrent save can drop newly-added optional values. If concurrent uploads are plausible, `$addToSet` updates are the right long-term primitive.

### Query behavior: mostly correct, but indexes and suggestions need attention

#### Metadata filtering (search)

- The filter logic correctly treats “multiple values for same key” as OR (`$in`) and ANDs across keys:
  - Filter-based search: `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java:246`
  - Global search: `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java:82`
- The OR across `requiredmetadata.key == value` or `optionalmetadata.key` “contains value” is correct for cross-context search where the same key could be required in one context and optional in another.

#### Index definitions likely won’t help your dot-path queries

- `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java:36` creates compound indexes on `requiredmetadata` and `optionalmetadata` as whole objects (`.on("requiredmetadata", ...)`).
- Most queries are on **subfields** like `requiredmetadata.productcode` or `optionalmetadata.state` (`Criteria.where("optionalmetadata."+key)` etc). Indexing the parent object field generally doesn’t accelerate those subfield lookups.

Recommendation:

- Use **wildcard indexes** for dynamic metadata keys, ideally combined with `contextid` (e.g. `{ contextid: 1, "requiredmetadata.$**": 1 }` and `{ contextid: 1, "optionalmetadata.$**": 1 }`). Spring Data has wildcard index support in newer versions; if that’s not available in this project, document the intended Mongo index in ops/deploy docs or create it manually.

#### `suggestValues()` under-suggests optional metadata values in one path

There are two `suggestValues()` implementations:

- `suggestValues(String field, ...)` (Query + `extractFieldValue`): `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java:361`
  - For `metadata.*` fields, it projects both required + optional but ultimately calls `extractFieldValue()` which returns **only one** optional value (`:672`), so suggestions can miss additional accumulated optional values.
- `suggestValues(String field, ..., Set<String> activeContextIds, ...)` (Aggregation + unwind): `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java:437`
  - The pipeline attempts to coalesce required and optional via `$ifNull` (`:520`), but if a document has a required value for that key, it will be chosen for every unwound row, effectively ignoring optional values for that key.

Recommendation:

- For metadata suggestions, build a unified `values` array as the **union** of `[reqValue] + optValues`, then unwind that. This preserves both required and optional suggestions and avoids “required wins” masking.

## Frontend Review

### Abstractions are reasonable, but types may be optimistic vs real payloads

- `ui/src/types/catalog.types.ts:12` makes `requiredMetadata` and `optionalMetadata` required fields.
- Given the backend notes “legacy entries” in other areas (e.g. casing), and given there is no migration yet, the runtime payload may include `null`/missing `requiredMetadata` and `optionalMetadata`.

Recommendation:

- Either (a) ensure the backend always returns `{}` for missing maps, or (b) make these fields optional in the TS type and normalize at the API boundary.

### Helper functions: good utility, but consider precedence + stable ordering

- `ui/src/types/aggregated.types.ts:59` (`getCombinedMetadata`) is a good “display map” abstraction, and `getAllMetadataValues()` (`:85`) is a good “facet extraction” abstraction.
- Two small edge cases:
  - If a key ever exists in both required and optional metadata, `getCombinedMetadata()` currently lets optional overwrite required (`:70`). Prefer required-as-source-of-truth (don’t overwrite) even if “should never happen”.
  - Optional metadata arrays should be sorted before display/join to avoid jitter (best solved on backend by storing deterministically, but UI can also sort defensively).

## Tests / Coverage Suggestions

Existing tests were updated to the new model shape, but I didn’t see a test that explicitly proves “optional metadata accumulates over time” (two merges with different optional values yields both).

Recommended additions:

- Backend: a `CatalogServiceTest` case that submits two observations for the same `FieldKey` with different optional metadata values and asserts the stored `optionalMetadata[key]` contains both.
- Backend repository: a focused test that `Criteria.where("optionalmetadata.key").is(value)` matches when the stored array contains `value` (guards against schema/serialization mismatches).
- Backend suggestions: a test for `suggestValues(metadata.key)` returning all accumulated optional values, not just the first.

## Recommendations (Priority)

### Critical
- Implement a migration/back-compat strategy for legacy `metadata` documents.
- Fix `suggestValues()` so metadata suggestions include all accumulated optional values and don’t mask optional when required exists.
- Revisit index strategy for dynamic `requiredmetadata.*` / `optionalmetadata.*` queries (likely wildcard indexes).

### Important
- Decide on a cap/eviction policy for `optionalMetadata` growth (per key and/or total per entry).
- Make optional metadata ordering deterministic (TreeSet or sorted list) to avoid UI jitter.

### Minor
- Add trailing newlines (e.g., `src/main/java/com/ceremony/catalog/service/CatalogService.java` and `src/test/java/com/ceremony/catalog/base/UnitTestBase.java` are missing one in the staged diff).

