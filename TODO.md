# Critical Priority

## Cross-Functional
- [ ] Now that we have export schema, we actually need to support true casing again, and not switch everything to lowercase. This is fine for the schema page but means the discover page now needs to query somehow ignoring case or users will never be able to use it.
- [ ] Support values (client dictated) see [field-value-capture.md](plans/field-value-capture.md)

## Backend
- [x] **Merge deduplication bug**: If a single observations batch contains duplicates for the same field identity, later entries overwrite earlier ones rather than aggregating counts/flags. This can produce incorrect minOccurs/maxOccurs. Pre-aggregate observations by field identity within `CatalogService.merge()` before applying updates.

## UI
- None yet

# Medium Priority

## Cross-Functional
- None yet

## Backend
- [x] **Config binding mismatch**: `application.yml` uses `max-xpath-length` but `CatalogProperties.java` expects `maxFieldPathLength`. Validation limits may silently use defaults instead of configured values.
- [ ] **N+1 counts in ContextService**: `getAllContextsWithCounts()` performs N+1 count queries. Replace with aggregation-based approach for scalability as context list grows.
- [ ] **Context ID normalization**: Read/update/delete endpoints in `ContextController` accept case-sensitive IDs without normalization, which can cause surprising 404s when the stored ID is lowercase.

## UI
- [ ] **UI nullable optionalMetadata**: `context.types.ts` models `optionalMetadata` as `string[]` but API can return null. Can break MetadataFilters and upload flows at runtime.
- [ ] **useSuggest AbortController ineffective**: AbortController is created but signal is not passed through to axios requests, so request cancellation doesn't actually work.
- [ ] **Match highlighting regex edge case**: `FieldTable.tsx` builds regex from user input in string mode without escaping special characters, which can mis-highlight or throw errors.

# Low Priority

## Backend
- [ ] Add controller/REST-level integration tests to validate full request/response cycle (currently only service/domain tests exist)
- [ ] Add structured logging (JSON format via logback) for production observability
- [ ] Document API versioning plan in API_SPECIFICATION.md for future evolution
- [ ] Add comments explaining the `$objectToArray` and `$anyElementTrue` operators in `CatalogCustomRepositoryImpl.executeGlobalSearch()` for maintainability
- [ ] Unify error handler to return `ErrorResponse` record instead of `Map<String, Object>` for consistent OpenAPI/client typing
- [ ] Consider Micrometer metrics for observation submission rate, search execution time, and MongoDB query latency

## UI
- [ ] Add minimal UI tests for core hooks/components (useXmlUpload, xmlParser) to protect against regressions
- [ ] Add tooltips for long field paths in FieldTable to reduce reliance on detail panel
