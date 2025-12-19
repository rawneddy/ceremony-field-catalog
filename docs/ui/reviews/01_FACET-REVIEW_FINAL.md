# Faceted Filtering Review - Synthesized Report

**Reviewers:** AMP, Gemini 3 Pro, Gemini 3 Flash, GPT 5.2 Codex High, GPT 5.2 XHigh

**Overall Verdict:** The design is 85-90% ready for implementation. All reviewers agree the core architecture is sound, but there are several specification gaps that would cause developer confusion or rework if not addressed.

---

## Blockers

These issues must be resolved before implementation begins.

### B1: Mode-Switching Logic is Flawed or Underspecified

**Sources:** AMP, Gemini Flash, GPT XHigh

The current plan states:
- "OR → AND: Uncheck all values (no filter = show all, same result)"
- "AND → OR: Check all values (show all = same result)"

**Problems identified:**
1. **Gemini Flash:** If user has a subset selected (e.g., 2 of 4 values) in OR mode, unchecking all resets the view to show ALL results - this is a major context shift, not the "same result"
2. **AMP:** Missing specifics: Does clicking the radio trigger immediate switch? What happens when switching AND→OR with 1 value selected? Does popover stay open?
3. **GPT XHigh:** Rules don't preserve results when a filter is active

**Suggested Resolution (Gemini Flash):**
- OR → AND: Keep only the first selected value as the active radio button (or clear filter entirely)
- AND → OR: Keep the single selected value checked, allowing user to add more

---

### B2: Facet Count Semantics are Ambiguous

**Sources:** GPT Codex High, GPT XHigh

The docs say "counts update dynamically" but don't define:
1. Are counts computed with the facet's own filter applied, or excluding it? (standard faceting vs disjunctive faceting)
2. When a value's count reaches 0, is it hidden, disabled, or shown with "(0)"?

**Example needing clarification:**
- User selects `contextId = deposits` (45 results)
- `productCode` popover shows: DDA (20), CDA (12), SAV (8), MMA (5)
- User now selects `productCode = DDA`
- Question: Does DDA still show count 20, or does it update to reflect that DDA is now the only one selected?

**Suggested Resolution:** Pick one rule (recommend disjunctive - counts exclude the current facet's filter) and add a concrete example to IMPLEMENTATION.md.

---

### B3: useFacets Hook Contract is Undefined

**Source:** AMP

Phase 3 step 21 says to build `useFacets` hook but doesn't specify:
- Input type (CatalogEntry[] array?)
- Output shape (facet index structure, filter state)
- Computation timing (on every result load? memoized?)
- State persistence (React state? URL params? both?)

**Suggested Resolution (AMP):**
Add interface definition to IMPLEMENTATION.md:
```typescript
interface FacetIndex {
  [metadataKey: string]: {
    values: Array<{ value: string; count: number }>
    mode: 'any' | 'exactly'
    selected: Set<string>
  }
}

interface useFacetsReturn {
  facets: FacetIndex
  filteredResults: CatalogEntry[]
  setFacetMode: (key: string, mode: 'any' | 'exactly') => void
  setFacetValue: (key: string, value: string, checked: boolean) => void
  clearFacet: (key: string) => void
  clearAllFacets: () => void
}
```

---

### B4: Clear Button Scope is Ambiguous

**Source:** AMP, GPT XHigh

The FacetPopover shows a `[Clear]` button, but it's unclear what it does:
- Clear only this facet's selection?
- Close the popover?
- In OR mode with [DDA, CDA, SAV] selected, does Clear uncheck all three?

**Additional concern (GPT XHigh):** Need to differentiate "Clear" (client-side filters) vs "Reset search" (server-side filters) to avoid confusion.

**Suggested Resolution:** Document: "[Clear] button unchecks all values in this specific facet only, resetting to 'show all' state. Does not affect other facet filters or property filters."

---

### B5: contextId as Facet Key is Contradictory

**Source:** GPT Codex High, GPT XHigh

REQ-3.8 says "metadata keys present in results," but the sidebar wireframes include `contextId` as a facet. `contextId` is not a metadata key - it's a top-level field.

**Suggested Resolution:** Either:
1. Update REQ-3.8 to say "contextId and metadata keys present in results" (treat contextId as a built-in pseudo-facet), OR
2. Remove contextId from sidebar examples and use only for the context column

---

### B6: Requirements Traceability Has Inconsistencies

**Source:** GPT XHigh

The Component to Requirements Matrix references components that don't match the project structure:
- `SearchForm.tsx` (not in project structure)
- `QuickFindInput.tsx` (not in project structure)
- Some REQ-2.x mappings appear incorrect

**Suggested Resolution:** Audit and fix component names and requirement IDs in the traceability section.

---

### B7: Responsive Behavior for 3-Panel Layout Not Specified

**Sources:** Gemini Pro, Gemini Flash, GPT Codex High, GPT XHigh

With left sidebar (~200px) + results table + right detail panel (~400px), horizontal space is extremely tight:
- **Gemini Flash:** On 1280px screen, only ~680px for results table
- **Gemini Pro:** On 1024px, opening detail panel might completely obscure the table
- **GPT XHigh:** REQ-5.2 (768px+ support) isn't specified for this layout

**Suggested Resolution:** Define breakpoint behavior:
- >= 1024px: All panels can coexist (possibly with sidebar narrow)
- 768px - 1023px: Auto-collapse sidebar when detail panel opens, OR detail panel as overlay
- Consider collapse/expand toggle for sidebar

---

## Recommendations

### R1: Handle High-Cardinality Facets (50+ Values)

**Sources:** Gemini Pro, Gemini Flash, GPT Codex High, GPT XHigh (all 4 raised this)

If a metadata key has many distinct values, the popover becomes unusable.

**Suggested Resolution:**
- Add "Search values..." text input at top of popover if value count > 10-15
- Implement scrollable area with max height (~300px)
- Optionally show "Top 20" with "Show more..." link

---

### R2: Define URL State for Facet Filters

**Sources:** Gemini Pro, Gemini Flash, GPT Codex High, AMP

Users may expect to share a drilled-down view, which is common in "Splunk-like" tools.

**Current state:** IMPLEMENTATION.md says client-side filters are NOT encoded in URL, but doesn't explicitly mention facets.

**Options:**
1. **Gemini Pro:** Consider encoding facet selections (e.g., `&f.productCode=DDA,CDA`) to enable deep linking
2. **AMP:** Explicitly state facet filters are NOT encoded (temporary refinements, not part of core search)

**Suggested Resolution:** Make an explicit decision and document it in "Shareable URL State" section. For POC, recommend NOT encoding but stating this clearly.

---

### R3: Improve Active Filter Visual Indicators

**Sources:** AMP, Gemini Flash, GPT Codex High

The `productCode ● 2/4` notation may not be clear enough:
- Will users understand the dot symbol?
- Is "2/4" clear (2 of 4 values selected)?
- Colorblind accessibility concern

**Suggested Resolutions:**
- **Gemini Flash:** Show tag/text summary below key name (e.g., `productCode ● (DDA, CDA)`)
- **GPT Codex High:** Consider chips or tooltip
- **AMP:** Add word "filtered" for clarity: `productCode ● (1 of 4 filtered)`

---

### R4: Clarify That Facet Counts Are From Loaded Results

**Sources:** GPT Codex High, GPT XHigh

Users might interpret facet counts as "global truth" rather than counts within the loaded 250-result set.

**Suggested Resolution:** Make explicit in UI (tooltip or help text) that counts reflect the currently loaded results, not all matching records in the database.

---

### R5: Clarify Match Mode Terminology

**Sources:** Gemini Flash, GPT XHigh

"Match exactly (AND)" reads like multi-value AND, but the UI is single-select (radio buttons).

**Suggested Resolutions:**
- **Gemini Flash:** Use "Single Select" / "Multi-Select" in code comments
- **GPT XHigh:** Consider "Match one" / "Is" vs "Match any" (keep OR/AND as helper text)

---

### R6: Ensure Sidebar is Independently Scrollable

**Sources:** Gemini Pro, GPT XHigh

With many metadata keys, sidebar could become unwieldy.

**Suggested Resolution:**
- Ensure `FacetSidebar` has `overflow-y-auto`
- Consider "Search facets..." input if > 10 keys
- Pin active facets to top

---

### R7: Define Empty Results / Zero-Count Behavior

**Sources:** AMP, Gemini Pro, Gemini Flash, GPT Codex High, GPT XHigh (all 5 raised this)

Multiple related questions:
1. What happens when initial search returns 0 results?
2. What happens when facet filters narrow results to 0?
3. When a selected value's count drops to 0 due to other filters, is it still visible?

**Suggested Resolution (AMP):**
| Condition | Sidebar Behavior |
|-----------|------------------|
| Results > 0 | Display facets normally |
| Results = 0 (initial) | Hide sidebar or show "No filters available" |
| Filtered to 0 | Keep selected filters visible so user can undo |
| Value count = 0 | Show disabled/greyed, or keep visible for deselection |

---

### R8: Add Popover Layout Constraints

**Source:** AMP

The popover wireframe doesn't specify dimensions.

**Suggested Resolution:**
- Max height: 300px (scroll for many values)
- Min width: 220px
- Max width: 350px

---

### R9: Export Should Include Metadata

**Source:** GPT XHigh

Even though the table doesn't show metadata columns (REQ-3.1), exported CSV/JSON should include all metadata fields to avoid forcing users to copy from detail panel row by row.

---

### R10: Define Behavior When Server-Side Filters Change

**Sources:** AMP, GPT XHigh

When user changes context/fieldPath/metadata in the search form (server-side):
- Do client-side sidebar filters persist or reset?
- Does the facet index rebuild from new results?

**Suggested Resolution (AMP):**
1. New results fetch from API
2. Clear all active facet filters
3. Rebuild facet index from new result set
4. User can now facet-filter the new results

---

## Open Questions

### Q1: Facet Value Sort Order

**Source:** Gemini Pro

In what order should values appear in the popover?
- Alphabetical?
- Descending by count (most frequent first)?

**Suggested Default:** Descending by count (standard for analytics tools)

---

### Q2: Property Filter Combination Logic

**Source:** GPT XHigh

When multiple property checkboxes are enabled (e.g., "Has null" AND "Optional"), do they combine with AND (intersection) or OR (union)?

**Suggested Default:** AND (show entries that match all checked properties)

---

### Q3: "No Values Selected" in OR Mode

**Source:** GPT XHigh

In OR mode, what does "no values selected" mean?
- No filter applied (show all)?
- Filter to none (0 results)?

What should [Clear] do in OR mode - select all or select none?

**Suggested Default:** "No values selected" = no filter (show all). [Clear] returns to this state.

---

### Q4: Performance Constraints for Facet Computation

**Source:** AMP

With 250 results × 15 metadata keys × 20 values average, facet index computation could take 50-100ms. Is this acceptable?

**Suggested Resolution:** Add to config:
- `FACET_INDEX_TIMEOUT_MS: 500` - show "Loading..." if computation takes longer
- `MAX_FACETS_IN_SIDEBAR: 10` - limit displayed keys, with "More filters..." option

---

### Q5: Quick Search Regex Toggle Behavior

**Source:** GPT Codex High

Quick Search uses `q=` parameter (contains search across fieldPath + contextId), but the plan mentions regex toggle. How does regex mode work in Quick Search?

**Suggested Resolution:** Either:
1. Regex mode is Advanced Search only (Quick Search always uses contains)
2. In Quick Search, regex applies to fieldPath only (not contextId)

---

## Summary of Source Attribution

| Issue | AMP | Gemini Pro | Gemini Flash | GPT Codex | GPT XHigh |
|-------|-----|------------|--------------|-----------|-----------|
| B1: Mode-switching logic | ✓ | | ✓ | | ✓ |
| B2: Facet count semantics | | | | ✓ | ✓ |
| B3: useFacets hook contract | ✓ | | | | |
| B4: Clear button scope | ✓ | | | | ✓ |
| B5: contextId as facet | | | | ✓ | ✓ |
| B6: Traceability inconsistencies | | | | | ✓ |
| B7: Responsive 3-panel layout | | ✓ | ✓ | ✓ | ✓ |
| R1: High-cardinality handling | | ✓ | ✓ | ✓ | ✓ |
| R2: URL state for facets | ✓ | ✓ | ✓ | ✓ | |
| R3: Active filter indicators | ✓ | | ✓ | ✓ | |
| R4: Counts from loaded results | | | | ✓ | ✓ |
| R5: Match mode terminology | | | ✓ | | ✓ |
| R6: Sidebar scrollable | | ✓ | | | ✓ |
| R7: Empty/zero-count behavior | ✓ | ✓ | ✓ | ✓ | ✓ |
| R8: Popover layout constraints | ✓ | | | | |
| R9: Export includes metadata | | | | | ✓ |
| R10: Server-side filter change | ✓ | | | | ✓ |
