# Plan: Address Faceted Filtering Review Feedback

Update REQUIREMENTS.md and IMPLEMENTATION.md to address all issues raised in the 5-model review synthesis.

## Files to Modify
- `docs/ui/REQUIREMENTS.md`
- `docs/ui/IMPLEMENTATION.md`

---

## Decisions Made

### Blockers

| ID | Issue | Decision |
|----|-------|----------|
| B1 | Mode-switching logic | Show warning when switching OR→AND with multiple values selected |
| B2 | Facet count semantics | Disjunctive (Splunk-style): current facet counts stay constant, other facets update |
| B3 | useFacets hook contract | Add TypeScript interface definition to IMPLEMENTATION.md |
| B4 | Clear button scope | Clears only this facet's selection, document explicitly |
| B5 | contextId as facet | Yes, include as built-in facet alongside metadata keys |
| B6 | Traceability inconsistencies | Fix outdated component names and REQ mappings |
| B7 | Responsive 3-panel layout | Manual toggle only - user collapses sidebar if needed |

### Recommendations

| ID | Issue | Decision |
|----|-------|----------|
| R1 | High-cardinality handling | Search input + scroll in popover (max 300px height) |
| R2 | URL state for facets | No - client-side only, not shareable |
| R3 | Active filter indicators | Keep as-is: dot + count notation (e.g., `● 2/4`) |
| R5 | Match mode terminology | Change to "Include any" / "Require one" |
| R7 | Zero results behavior | Keep filters visible so user can undo |
| R9 | Export includes metadata | Yes - order: contextId → fieldPath → metadata (A-Z) → Min → Max → Null → Empty |
| R10 | Server-side filter change | Reset all facet filters when new results load |

### Other Clarifications

| Topic | Decision |
|-------|----------|
| Facet value sort order | Alphabetical (A-Z) |
| Property filters location | Move to table column headers for Null?/Empty? only (Min/Max just need sorting) |
| Export format toggle | Same toggle style as String/Regex |
| Loaded results scope (Q6) | Tooltip on sidebar header: "Filtering X loaded results" |
| Many keys UX (Q7) | Pin active facets to top; add search input if > 10 keys |
| Popover dimensions (Q8) | Min-width: 220px, max-width: 350px, max-height: 300px |
| Export button text (Q9) | Dynamic: "Export (X of Y)" when filters active, "Export (X)" when not |
| Data model note (Q10) | Document that metadata is single-valued per key in useFacets section |

---

## Quick Search Behavior (Clarified)

**String Mode:**
- Without `/`: Searches ALL values (contextId, fieldPath, metadata values), NO suggestions
- With `/` at start: Activates fieldPath-only search with autocomplete, show hint text indicating mode

**Regex Mode:**
- Applies to everything (contextId, fieldPath, metadata values)
- No special `/` handling - users construct patterns naturally
- No autocomplete suggestions

## Advanced Search FieldPath Input

**String Mode:** Searches fieldPath only, autocomplete always works (no `/` required)
**Regex Mode:** Searches fieldPath only with regex, no autocomplete

---

## Changes to Make

### REQUIREMENTS.md

1. **REQ-3.1** - Clarify table columns include filter dropdowns for Null?/Empty? in headers

2. **REQ-3.3** - Update to reflect:
   - Property filters moved to table column headers (Null?/Empty? only)
   - Sidebar contains only metadata facets + path text filter

3. **REQ-3.8** - Update faceted filtering requirement:
   - Add contextId as built-in facet
   - Change terminology to "Include any" / "Require one"
   - Add: mode-switching shows warning if selections will be lost
   - Add: disjunctive counting (counts exclude current facet's filter)
   - Add: facet values sorted alphabetically
   - Add: zero results keeps filters visible

4. **REQ-2.1** - Clarify Quick Search behavior:
   - String mode: searches all values, `/` triggers fieldPath mode with autocomplete
   - Regex mode: applies to all values, no `/` command

5. **REQ-3.6** - Update export:
   - Column order: contextId → fieldPath → metadata (A-Z) → Min → Max → Null → Empty
   - Add format toggle (CSV/JSON) styled like String/Regex toggle

### IMPLEMENTATION.md

1. **Search Design section** - Update Quick Search behavior documentation

2. **Faceted Metadata Filtering section:**
   - Add useFacets hook TypeScript interface
   - Document disjunctive counting with example
   - Update terminology to "Include any" / "Require one"
   - Add mode-switching warning behavior
   - Add Clear button scope clarification
   - Add popover constraints (min-width: 220px, max-width: 350px, max-height: 300px, search input for many values)
   - Add facet sort order (alphabetical)
   - Document contextId as built-in facet

3. **Results Table Features section:**
   - Add Null?/Empty? column header filter dropdowns
   - Document that Min/Max only need sorting

4. **Server-Side vs Client-Side Filtering table:**
   - Remove property checkboxes row from sidebar
   - Add column header filters row

5. **Export section:**
   - Document column order
   - Document format toggle styling
   - Export button shows count: "Export (X of Y)" when filters active, "Export (X)" when not
   - Note: Export includes metadata even though table doesn't show it

6. **Page States section:**
   - Add zero-results behavior: keep facet filters visible

7. **Sidebar behavior:**
   - Document manual collapse toggle
   - Add scrollable container requirement
   - Pin active facets to top
   - Add "Search facets..." input if > 10 keys
   - Add header with tooltip: "Filtering X loaded results"

8. **Requirements Traceability:**
   - Fix SearchForm.tsx → should be QuickSearchForm.tsx and AdvancedSearchForm.tsx
   - Fix QuickFindInput.tsx → remove (doesn't exist)
   - Verify all REQ mappings are correct

9. **Core TypeScript Interfaces section:**
   - Add useFacets hook interface
   - Document that metadata is single-valued per key (Map<String, String>), so:
     - "Require one" = entry's value must equal selected value
     - "Include any" = entry's value must be in selected set
   ```typescript
   interface FacetValue {
     value: string
     count: number
   }

   interface FacetState {
     values: FacetValue[]
     mode: 'any' | 'one'  // "Include any" vs "Require one"
     selected: Set<string>
   }

   interface FacetIndex {
     [key: string]: FacetState  // key = contextId or metadata key
   }

   interface useFacetsReturn {
     facets: FacetIndex
     filteredResults: CatalogEntry[]
     setFacetMode: (key: string, mode: 'any' | 'one') => void
     toggleFacetValue: (key: string, value: string) => void
     clearFacet: (key: string) => void
     clearAllFacets: () => void
   }
   ```

---

## Wireframe Updates Needed

1. **Sidebar wireframe** - Remove property checkboxes (has null, has empty, optional, repeating)

2. **Table wireframe** - Add filter dropdown indicators on Null?/Empty? column headers

3. **FacetPopover wireframe** - Update labels from "Match any (OR)" / "Match exactly (AND)" to "Include any" / "Require one"

4. **Quick Search wireframe** - Add hint text showing when fieldPath mode is active
