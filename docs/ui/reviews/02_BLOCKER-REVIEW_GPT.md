# Blocker Review - GPT

## Blockers
- **B1** Severity: CRITICAL. Location: `docs/ui/REQUIREMENTS.md:REQ-2.1`; `docs/ui/IMPLEMENTATION.md` (Backend Support -> Global Search `q=`). Issue: Quick Search requires OR search across fieldPath, contextId, and metadata values, but the documented backend `q` endpoint explicitly does not search metadata values. Why blocks: the UI cannot satisfy REQ-2.1 without backend changes or relaxing the requirement, and there is no alternate client-side or server-side path that preserves global OR behavior across metadata. Suggested resolution: either update the backend to include metadata values in `q` searches or revise REQ-2.1/Quick Search behavior to exclude metadata and align copy/UX accordingly.

## Concerns
- **C1** Severity: MEDIUM. Location: `docs/ui/reviews/01_FACET-PLAN.md` (Advanced Search FieldPath Input); `docs/ui/REQUIREMENTS.md:REQ-2.8`. Issue: 01_FACET-PLAN says Advanced Search autocomplete should work without requiring a leading `/`, while REQ-2.8 (and IMPLEMENTATION) require `/` to trigger autocomplete. Suggestion: reconcile the decision doc and requirements to avoid conflicting guidance for implementation.
- **C2** Severity: LOW. Location: `docs/ui/REQUIREMENTS.md:REQ-3.1`; `docs/ui/IMPLEMENTATION.md` (Results Table Features). Issue: Three-state sorting mentions “original order” but doesn’t define it in requirements. Suggestion: explicitly define original order as API response order (then filtered client-side) to prevent inconsistent behavior.
- **C3** Severity: LOW. Location: `docs/ui/REQUIREMENTS.md:REQ-3.6`; `docs/ui/IMPLEMENTATION.md` (Export Results). Issue: Export column set across mixed-context results is not specified (metadata keys vary by context). Suggestion: state that export uses the union of metadata keys across loaded results, with empty cells when an entry lacks a key.
- **C4** Severity: LOW. Location: `docs/ui/IMPLEMENTATION.md` (New server-side search clears facets). Issue: Behavior for column header filters on new server-side searches is not specified. Suggestion: define whether column header filters reset or persist on new result sets to avoid confusing “empty” screens.

## Questions
- **Q1** Location: `docs/ui/REQUIREMENTS.md:REQ-2.1`; `docs/ui/IMPLEMENTATION.md` (Global Search `q=`). Question: Does the backend `q` endpoint support regex matching, or is regex limited to `fieldPathContains` only? Impact if unresolved: the Quick Search String/Regex toggle may not be implementable as specified.

## Verification
- all_decisions_reflected: No
- wireframes_consistent: Yes
- interfaces_complete: Yes

## Summary
The design is close to implementable, but Quick Search’s requirement to search metadata values conflicts with the documented backend `q` behavior and would block implementation unless resolved. The remaining issues are alignment/clarity items that should be reconciled to avoid ambiguity during build.

## Proposed Wording Updates (Exact Copy)

### REQUIREMENTS.md (REQ-2.1)

Replace:
```
In **String mode**: searches fieldPath, contextId, and metadata values using OR logic; when input starts with `/`, activates fieldPath-only mode with autocomplete and shows hint text.
```

With:
```
In **String mode**: searches fieldPath and contextId using OR logic; metadata values are NOT included in Quick Search. When input starts with `/`, activates fieldPath-only mode with autocomplete and shows hint text.
```

Add directly after REQ-2.1:
```
**Note:** Metadata value search is only available in Advanced Search (REQ-2.6/REQ-2.10).
```

Replace:
```
In **Regex mode**: searches all values (fieldPath, contextId, metadata) with regex pattern, no autocomplete, no special `/` handling.
```

With:
```
In **Regex mode**: searches fieldPath and contextId with regex pattern; no autocomplete and no special `/` handling.
```

### IMPLEMENTATION.md (Quick Search behavior)

Replace:
```
- Without `/` at start: Searches ALL values (contextId, fieldPath, metadata values) using OR logic. No autocomplete suggestions.
```

With:
```
- Without `/` at start: Searches fieldPath and contextId using OR logic. No autocomplete suggestions.
```

Replace:
```
- Applies to everything (contextId, fieldPath, metadata values)
```

With:
```
- Applies to fieldPath and contextId
```

### IMPLEMENTATION.md (Backend Support -> Global Search `q=`)

Replace:
```
Supports Quick Search with OR-based logic:
- Searches `fieldPath` and `contextId` using OR logic
- When `q` is provided, other filter parameters are ignored
```

With:
```
Supports Quick Search with OR-based logic:
- Searches `fieldPath` and `contextId` only (no metadata search)
- When `q` is provided, other filter parameters are ignored
```

### 01_FACET-PLAN.md (Advanced Search FieldPath Input)

Replace:
```
**String Mode:** Searches fieldPath only, autocomplete always works (no `/` required)
**Regex Mode:** Searches fieldPath only with regex, no autocomplete
```

With:
```
**String Mode:** Searches fieldPath only; autocomplete appears when input starts with `/`.
**Regex Mode:** Searches fieldPath only with regex; no autocomplete.
```
