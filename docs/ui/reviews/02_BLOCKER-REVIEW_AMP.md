# Blocker Identification Review: Ceremony Field Catalog UI
**Round 2 - Pre-Implementation Design Review**

**Reviewer:** AMP  
**Date:** December 18, 2025  
**Focus:** Faceted filtering, 3-panel layout, client-side filtering architecture  
**Previous Round:** 5-model synthesis (01_FACET-PLAN.md)

---

## Executive Summary

The design is **largely solid** but has **TWO CRITICAL BLOCKERS** that will prevent correct implementation of disjunctive counting and proper state reset behavior. Additionally, **THREE HIGH-SEVERITY ISSUES** need clarification. The decisions from the previous review (01_FACET-PLAN.md) have been well-incorporated into the main documents, but some details require explicit specification to prevent developer confusion.

---

## Critical Blockers

### B1: Disjunctive Counting Behavior is Underspecified

**Severity:** CRITICAL  
**Location:** REQUIREMENTS.md REQ-3.8, IMPLEMENTATION.md "Faceted Metadata Filtering" section  
**Issue:**

The design correctly states "disjunctive counting: current facet counts stay constant while other facet counts update," but **does not specify WHEN counts should be recomputed** and **what happens during initial load**.

The example shows:
```
Before filtering:          After selecting productCode = DDA:
│ productCode      (4) │  │ productCode  ●   1/4 │  ← counts stay at 4
│ action           (3) │  │ action           (2) │  ← updated to 2
│ channel          (2) │  │ channel          (1) │  ← updated to 1
```

**What's missing:**
1. **Initial state:** When results first load with no filters, should we show all metadata keys present in results, or only keys where count > 0? (Assumed: all keys with count > 0)
2. **Count computation algorithm:** Is the count for facet X calculated as "distinct values of X in results, excluding the filter applied to X"? Or is it "distinct values of X in results after applying ALL other facet filters EXCEPT X's filter"?
3. **Cascade behavior:** When user selects multiple values in "Include any" mode (e.g., productCode IN [DDA, CDA]), do OTHER facets update based on entries matching DDA OR CDA? Or only the FIRST selected value?
4. **Reset timing:** When user changes server-side filters and new results load, the facets should reset. Does this mean:
   - Clear all facet selections?
   - Recompute facet index from new results?
   - Both?

**Why this blocks implementation:**
A developer implementing `useFacets` hook cannot write the count calculation logic without knowing:
- What formula produces the counts
- How to handle initial load vs. subsequent selections
- How multiple selections in OR mode affect other facet counts

This will likely result in incorrect filtering behavior that doesn't match user expectations.

**Suggested resolution:**

Add to IMPLEMENTATION.md, "Faceted Metadata Filtering" section:

```markdown
### Disjunctive Counting Algorithm (Detailed)

**Definition:** Each facet independently calculates its value counts while excluding its own filters, allowing counts to show "what would I get if I selected this value?"

**Algorithm for a given facet key K:**
1. Take the current result set after applying ALL facet filters EXCEPT K's filter
2. Count distinct values of metadata key K in that result set
3. Display these counts next to K's values

**Example walkthrough:**
- Initial results: 100 entries with various productCode, action, channel values
- Facets show: productCode (4 distinct), action (3 distinct), channel (2 distinct)
- User selects: productCode = "DDA" (matching 40 entries)
- Recompute counts:
  - productCode counts: Still 4 (disjunctive: exclude productCode filter) → Shows DDA, CDA, MMA, SAV with counts
  - action counts: Now 2 (from 40 entries with productCode=DDA) → Exclude action filter but apply productCode filter
  - channel counts: Now 1 (from 40 entries)
- User ALSO selects: action = "Fulfillment" (30 of the DDA entries have this)
- Recompute again:
  - productCode counts: Still 4 (exclude productCode filter, but apply action=Fulfillment)
  - action counts: Now 2 (exclude action filter, but apply productCode=DDA)
  - channel counts: Now 1 (apply both productCode=DDA AND action=Fulfillment)

**Special case - "Include any" (OR) mode with multiple selections:**
If user selects productCode IN [DDA, CDA] (multiple values in Include any mode):
- Filter applied: entry.productCode IN [DDA, CDA]
- Other facets count based on entries matching this filter
- productCode itself counts all 4 values (excluding its own filter)

**Initial load behavior:**
- Results arrive from API with no client-side filters applied
- Build facet index showing all metadata keys present in results
- Show counts for all distinct values of each key
- No filters active initially

**Reset on server-side filter change:**
When user changes context/fieldPath/metadata (server-side filters):
1. API returns new result set
2. Clear ALL facet filter selections (setFacets = {})
3. Recompute facet index from new result set
4. Update table display
```

---

### B2: Server-Side Filter Reset Timing is Ambiguous

**Severity:** CRITICAL  
**Location:** IMPLEMENTATION.md "Page States" section, line 499-500  
**Issue:**

The spec says: "When user changes server-side filters (context, metadata, fieldPath) and new results load: Reset all facet filters when new results load"

**What's unclear:**
1. **WHEN does the reset happen?**
   - Immediately when user clicks a new context? (Before API call completes)
   - After API returns new results? (After API call completes)
   - While loading? (Show spinner)

2. **Does reset clear the UI state BEFORE or AFTER displaying new results?**
   - If BEFORE: Table shows new results but facets are blank/loading (confusing)
   - If AFTER: Facets update after results load (smoother, but timing matters)

3. **What about facet sidebar visibility?**
   - Does it stay open? Close? Toggle?
   - If results drop to zero after server-side filter change, should sidebar stay visible?

**Why this blocks implementation:**
A developer building the AdvancedSearchForm needs to know the exact sequence of state updates to synchronize the API call with the facet reset. Without this, the UI might:
- Show stale facet counts while loading new results
- Flicker between states
- Be unclear about whether results are loading or just filtered to zero

**Suggested resolution:**

Add to IMPLEMENTATION.md, "Search Design" section (after Advanced Search description):

```markdown
### State Reset on Server-Side Filter Change

When user changes any server-side filter (context, metadata, fieldPath) in Advanced Search:

1. **Immediately** (before API call):
   - Disable search button (show loading state)
   - Do NOT clear facet selections yet

2. **API call in flight:**
   - Show loading indicator on table
   - Keep existing facet UI visible (user can see previous results)

3. **Results arrive:**
   - Clear ALL facet filter selections (`clearAllFacets()`)
   - Recompute facet index from new results
   - Replace table results
   - Re-enable search button

4. **If results are zero:**
   - Keep sidebar visible and facet counts at 0
   - Show "No results match current filters" message
   - Display [Clear All Filters] button

**Implementation note for AdvancedSearchForm:**
Wrap `useFieldSearch` hook with another effect that calls `clearAllFacets()` when:
- contextId changes
- metadata filter values change
- fieldPath changes

Do this AFTER the new results arrive (check loading state).
```

---

### B3: Missing `useFacets` Hook Return Value Specification

**Severity:** HIGH  
**Location:** IMPLEMENTATION.md "Core TypeScript Interfaces" section, lines 909-916  
**Issue:**

The `useFacetsReturn` interface is defined, but **is missing critical methods** that the UI components need:

```typescript
interface useFacetsReturn {
  facets: FacetIndex;
  filteredResults: CatalogEntry[];
  setFacetMode: (key: string, mode: 'any' | 'one') => void;
  toggleFacetValue: (key: string, value: string) => void;
  clearFacet: (key: string) => void;
  clearAllFacets: () => void;
}
```

**Missing methods:**
1. **`getFacetByKey(key: string): FacetState | undefined`** - Used by FacetPopover to display a single facet's state
2. **`getAppliedFacets(): {key: string, values: string[]}[]`** - Used by UI to show which facets are active (for active pinning, tooltip, etc.)
3. **`hasActiveFacets(): boolean`** - Used by [Clear All Filters] button visibility logic
4. **`recomputeCounts(results: CatalogEntry[]): void`** - Used to rebuild facet index when results change (called after server-side filter change)

**Why this blocks implementation:**
- `FacetPopover.tsx` won't know how to read the current state of a single facet
- `FacetSidebar.tsx` won't know which facets are active (can't pin them to top)
- Components won't have a way to trigger facet index recomputation when results change
- The hook becomes unusable as specified

**Suggested resolution:**

Update IMPLEMENTATION.md "Core TypeScript Interfaces" section:

```typescript
interface useFacetsReturn {
  facets: FacetIndex;                                             // Complete facet state
  filteredResults: CatalogEntry[];                                // Results after all facet filters
  
  // State accessors
  getFacetByKey: (key: string) => FacetState | undefined;         // Get single facet for popover display
  getActiveFacets: () => Array<{key: string, values: string[]}>; // Get active facets for pinning/UI
  hasActiveFacets: () => boolean;                                 // True if any facet has selections
  
  // State mutations
  setFacetMode: (key: string, mode: 'any' | 'one') => void;      // Switch between OR/AND (shows warning if needed)
  toggleFacetValue: (key: string, value: string) => void;        // Toggle single value selection
  clearFacet: (key: string) => void;                             // Clear one facet's selections
  clearAllFacets: () => void;                                    // Clear all selections
  
  // Recompute on results change
  recomputeIndex: (newResults: CatalogEntry[]) => void;          // Rebuild facet counts from new result set
}

// Note: This hook is called within AdvancedSearchPage and QuickSearchPage.
// When useFieldSearch returns new results, call useFacets.recomputeIndex(results)
// to rebuild the facet index and reset facet selections.
```

---

## High-Severity Issues

### H1: Mode-Switching Warning Semantics Undefined

**Severity:** HIGH  
**Location:** IMPLEMENTATION.md "Faceted Metadata Filtering" section, lines 347-350  
**Issue:**

The spec says: "When switching from 'Include any' → 'Require one' with multiple values selected: show warning dialog"

**What's missing:**
1. **Exact warning text** - What does the dialog say? Users won't know what they're "losing"
2. **Reverse direction** - Can users switch "Require one" → "Include any"? If yes, does it show a warning? (Likely no, since single selection can be kept)
3. **Timing of warning** - Does clicking the mode button immediately show warning, or only if multiple values are selected?

**Why this matters:**
- FacetPopover component won't know what dialog text to display
- Different developers might interpret this differently
- User might not understand what "clearing selections" means

**Suggested resolution:**

Update IMPLEMENTATION.md:

```markdown
### Mode Switching with Warning

**Include any ↔ Require one:**

**When switching Include any (OR) → Require one (AND):**
- Check: Are multiple values currently selected?
- If yes: Show warning dialog:
  ```
  ⚠️ Switch Mode?
  
  This will clear your selections because "Require one" allows only one value.
  
  Current selections: DDA, CDA, MMA (3 values)
  
  [Cancel] [Clear & Switch to "Require one"]
  ```
- If no (single value selected): Switch immediately, keep that value selected

**When switching Require one (AND) → Include any (OR):**
- Always switch immediately
- Keep the selected value (now it's just the first value of a multi-select checkbox list)
- No warning needed

This prevents accidental loss of data when users expect their selections to be preserved.
```

---

### H2: Column Header Filters + Sidebar Facets Interaction Incomplete

**Severity:** HIGH  
**Location:** REQUIREMENTS.md REQ-3.1 and REQ-3.8, IMPLEMENTATION.md "Full 3-Panel Layout"  
**Issue:**

The design correctly moved Context and Null?/Empty? to column headers, and metadata to sidebar facets. BUT the specification **does not define how these filters interact**.

**Questions:**
1. **Can user apply column header filter for Context AND sidebar facet for metadata simultaneously?**
   - Expected behavior: YES, they combine with AND logic
   - But is this explicit in the spec? No.

2. **When user applies column header filter for "Null? = Yes", do sidebar counts update?**
   - Expected: YES, Null filter should affect facet counts (disjunctive)
   - But does the spec say this? Implied, not explicit.

3. **When user clears column header filter, do facets automatically update, or does user need to scroll?**
   - Expected: Results update instantly (client-side filtering)
   - But is it documented how the table and sidebar stay in sync?

4. **If user filters Context to "deposits" only via column header, what happens to sidebar facets?**
   - Expected: Facets update to show only metadata from "deposits" context
   - But how is this computed? (Not specified)

**Why this blocks implementation:**
- AdvancedSearchPage must coordinate state between two independent filtering systems
- Without clear rules, filters might conflict or produce unexpected results
- Code to synchronize table filters with facet sidebar is non-obvious

**Suggested resolution:**

Add to IMPLEMENTATION.md "Server-Side vs Client-Side Filtering" table, add new row:

```markdown
| Column header filters (Field Path, Context, Null?, Empty?) | Client-side (table column headers) | Filter by column values from loaded results |
| Sidebar facet filters (metadata only) | Client-side (left sidebar) | Filter by metadata values from loaded results |

**Combined Filter Logic:**
When both column header filters and sidebar facets are active:
1. Start with full loaded result set
2. Apply column header filters (Text match on Field Path, Context dropdown, Null?/Empty? dropdowns)
3. Apply sidebar facet filters (metadata facets)
4. Result: intersection of all conditions (all filters combine with AND logic)
5. **Counts in sidebar:**
   - Recompute based on step 2 results (after column filters, before facet filters)
   - This ensures column header filters affect facet counts (disjunctive)

**Example:**
- Loaded results: 100 entries (50 from deposits, 50 from loans)
- User filters Column header Context = "deposits": Shows 50 entries
- Sidebar facets now show metadata distributions for only those 50 entries
- User selects sidebar facet productCode = "DDA": Shows 30 entries
- Final result: deposits entries with productCode=DDA (30 of the 100)
```

---

### H3: Export Metadata Column Order Edge Case

**Severity:** HIGH  
**Location:** IMPLEMENTATION.md "Export Results" section, line 466  
**Issue:**

The spec says: "Column order: contextId → fieldPath → metadata keys (A-Z) → minOccurs → maxOccurs → allowsNull → allowsEmpty"

**Problem:**
When exporting, different results may have different metadata keys (because different contexts have different required/optional metadata). 

**Example:**
```
Result 1: contextId=deposits, productCode=DDA, action=Fulfill
Result 2: contextId=loans, loanType=Auto, term=5year

Export columns would be:
contextId | fieldPath | action | loanType | productCode | term | minOccurs | maxOccurs | allowsNull | allowsEmpty
deposits | /x/y | | | DDA | | 1 | 1 | false | false
loans | /a/b | | | | | 0 | 1 | true | false
```

**What's undefined:**
1. **Should metadata columns always include ALL keys from all results, padded with empty values?** (Yes, assumed)
2. **Should metadata keys be sorted alphabetically across all results?** (Yes, assumed)
3. **What if a result's context defines a required metadata key that's not present in that entry?**
   - This shouldn't happen per API spec, but is it possible?

**Why this blocks implementation:**
- ExportButton component must build a header row that includes all metadata keys from all results
- Must handle sparse data (empty cells for entries that don't have certain keys)
- Unclear whether empty cells should be blank strings `""` or should they be omitted

**Suggested resolution:**

Update IMPLEMENTATION.md "Export Results" section:

```markdown
### Export Column Order and Metadata Handling

**Column order:**
1. contextId
2. fieldPath
3. Metadata keys in alphabetical order (collected from ALL results)
4. minOccurs, maxOccurs, allowsNull, allowsEmpty

**Metadata key handling:**
- Scan all results to collect all unique metadata keys across all contexts
- Sort these keys alphabetically
- Include as separate columns in export
- If an entry doesn't have a value for a key (sparse data), export empty string `""` for that cell
- This ensures the CSV/JSON is rectangular (all rows have same columns)

**Example with mixed contexts:**
```
Results: deposits entries (with productCode, action) + loans entries (with loanType, term)

Export columns:
contextId,fieldPath,action,loanType,productCode,term,minOccurs,maxOccurs,allowsNull,allowsEmpty
deposits,/account/amt,Fulfill,,DDA,,1,1,false,false
loans,/loan/amount,,,,,0,1,true,false
```

**Implementation note:**
```typescript
// In ExportButton.tsx:
const allMetadataKeys = new Set<string>();
filteredResults.forEach(entry => {
  Object.keys(entry.metadata).forEach(key => allMetadataKeys.add(key));
});
const sortedMetadataKeys = Array.from(allMetadataKeys).sort();
// Use sortedMetadataKeys for header row and data row iteration
```
```

---

## Medium-Severity Concerns

### C1: "Original Order" Column Sorting is Imprecise

**Severity:** MEDIUM  
**Location:** IMPLEMENTATION.md "Results Table Features" section, line 414  
**Issue:**

The spec says: "All columns are sortable with three-state toggle: ascending → descending → original order"

**What's "original order"?**
1. **Is it the API order?** (Results returned by API search, before any client-side sorting)
2. **Is it unsorted** (depends on JavaScript object property iteration order, which is unreliable)
3. **Is it insertion order?** (First result returned is first, etc.)

The spec says "order returned from API, then filtered by client-side filters" but this needs to be explicit.

**Why this matters:**
- FieldTable component must track the original sort order
- Must preserve it across filter changes
- If not clear, sorting might appear to "break" when filters are applied

**Suggested resolution:**

Add clarity to IMPLEMENTATION.md:

```markdown
### Column Sorting - Three-State Behavior

**Behavior per column:**
1. First click: Sort ascending (A→Z for strings, 0→N for numbers)
2. Second click: Sort descending (Z→A for strings, N→0 for numbers)
3. Third click: Return to **insertion order** (order results were received from API, before any sorting was applied)

**Implementation note:**
Store the original unsorted results array separately. When user clicks sort a third time, reset to this original array. This ensures "original order" is consistent and predictable.

```typescript
// In FieldTable.tsx:
const [originalResults, setOriginalResults] = useState<CatalogEntry[]>([]);
const [sortedResults, setSortedResults] = useState<CatalogEntry[]>([]);
const [sortState, setSortState] = useState<{column: string | null, direction: 'asc' | 'desc' | 'original'}>(...);

useEffect(() => {
  setOriginalResults([...results]); // Preserve original order from API
}, [results]);

const onColumnSort = (column: string) => {
  if (sortState.column !== column) {
    // New column: sort ascending
    setSortedResults(sortByColumn(results, column, 'asc'));
  } else if (sortState.direction === 'asc') {
    // Same column: descending
    setSortedResults(sortByColumn(results, column, 'desc'));
  } else {
    // Return to original
    setSortedResults([...originalResults]);
  }
};
```
```

---

### C2: Keyboard Navigation with Popover Open

**Severity:** MEDIUM  
**Location:** REQUIREMENTS.md REQ-3.5, IMPLEMENTATION.md "Results Interaction Features"  
**Issue:**

The spec says: "Arrow keys (up/down) navigate between result rows and autocomplete suggestions"

**Question:** What happens if:
1. User has FacetPopover open (clicking a metadata facet value)
2. User presses arrow keys
3. Should arrow keys navigate within the popover, or navigate table rows?

**Why this matters:**
- FieldTable must coordinate keyboard events with FacetPopover
- Popover should capture arrow keys (for value selection)
- Table should NOT capture arrow keys while popover is focused
- Code must handle event.stopPropagation() correctly

**Suggested resolution:**

Add to IMPLEMENTATION.md:

```markdown
### Keyboard Navigation Priority

**Arrow key behavior:**
- If FacetPopover is open and has focus: Arrow keys navigate within popover values
- If FieldTable has focus and no popover open: Arrow keys navigate table rows
- If autocomplete dropdown is open: Arrow keys navigate suggestions, Enter selects

**Implementation:**
- FacetPopover: onKeyDown handler calls `event.stopPropagation()` for arrow keys
- FieldTable: Only handles arrow keys if no popover or autocomplete is open
- Use focus management to determine which component should handle keys
```

---

## Questions Requiring Clarification

### Q1: When to Show "Search facets..." Input

**Location:** IMPLEMENTATION.md "Faceted Metadata Filtering" section, line 289  
**Question:**

The spec says: "Add 'Search facets...' input if > 10 keys"

What if user has 11 keys, then filters sidebar and now only 8 keys are visible? Should the search input disappear?

**Impact if unresolved:** FacetSidebar component won't know whether to show/hide the search input dynamically.

**Suggested resolution:** Show search input if total number of available keys > 10, not based on visible count after filtering.

---

### Q2: Field Detail Panel When Path is Truncated

**Location:** IMPLEMENTATION.md "Results Table Features" section, line 430  
**Question:**

The spec says field path is not repeated in detail panel because it's visible in the selected row. But what if the table column is narrow and path is truncated with `...`?

Is there a way to copy the full path? Should the detail panel show it?

**Impact if unresolved:** Users on narrow screens won't be able to see or copy full field paths.

**Suggested resolution:** Add copy button on Field Path column AND in detail panel to ensure full path is always accessible.

---

### Q3: Metadata Value Autocomplete in Upload Form

**Location:** IMPLEMENTATION.md "Phase 5: XML Upload" section  
**Question:**

MetadataForm (upload page) should have autocomplete for metadata values. But how is scope determined?

- Should it show values from the selected context only? (Likely yes)
- Should it show values scoped to any existing entries with that context? (Likely yes)
- What if no entries exist yet for the selected context? (Show empty)

**Impact if unresolved:** useSuggest hook won't know what API parameters to send for metadata autocomplete on upload form.

**Suggested resolution:** Scope autocomplete to selected context. If context has no entries yet, suggestions should be empty.

---

## Verification Checklist

| Item | Status | Notes |
|------|--------|-------|
| All decisions from 01_FACET-PLAN reflected in main docs | ✅ YES | Terminology updated, column headers moved, facet logic documented |
| Wireframes consistent with requirements | ✅ YES | 3-panel layout diagram and popover diagrams are accurate |
| TypeScript interfaces sufficient | ⚠️ PARTIAL | useFacetsReturn missing accessor methods (see B3) |
| useFacets hook interface is complete | ❌ NO | Missing getFacetByKey, getActiveFacets, hasActiveFacets, recomputeIndex |
| Disjunctive counting algorithm specified | ❌ NO | Missing detailed algorithm and cascade behavior (see B1) |
| Server-side filter reset timing specified | ❌ NO | Missing state reset sequence (see B2) |
| Mode-switching warning defined | ⚠️ PARTIAL | Behavior described, but dialog text and reverse direction unclear (see H1) |
| Column filter interaction defined | ⚠️ PARTIAL | Interaction implied but not explicit (see H2) |
| Export metadata column order for mixed contexts | ⚠️ PARTIAL | Not addressed for sparse data (see H3) |

---

## Summary

**The design is fundamentally sound**, but **cannot be implemented without resolving the three critical blockers**:

1. **B1 (Disjunctive Counting)**: Requires detailed algorithm specification for how facet counts are computed when multiple filters are active.
2. **B2 (Server-Side Reset)**: Requires explicit state reset sequence so developers know when to call `clearAllFacets()` and what the UI should show during the transition.
3. **B3 (useFacets Interface)**: Missing four essential methods that UI components need to read facet state, trigger recomputation, and determine which facets are active.

The three high-severity issues (H1, H2, H3) are important for correctness but could be inferred by a skilled developer. The medium-severity concerns (C1, C2) are clarifications that will prevent unexpected bugs.

**Recommended action**: Resolve B1, B2, and B3 before development starts. They are blocking implementation. H1, H2, H3 should be addressed in the next documentation update. Questions Q1-Q3 can be answered by the team during implementation planning.

---

## Decision: Ready for Development?

**CONDITIONAL**: This design is ready for development **IF the team commits to immediately resolving B1, B2, and B3 during Phase 1 (Project Foundation)**. Otherwise, block until these are documented.

If moving forward with development, create a task to incorporate B1-B3 feedback into IMPLEMENTATION.md before team begins coding hooks and components.
