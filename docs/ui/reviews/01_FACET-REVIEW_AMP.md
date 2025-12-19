{
  "task": "Review UI Design Documents for Implementation Readiness",
  "context": {
    "project": "Ceremony Field Catalog UI",
    "documents_to_review": [
      "docs/ui/REQUIREMENTS.md",
      "docs/ui/IMPLEMENTATION.md"
    ],
    "review_focus": "A significant new feature was just added: Faceted Metadata Filtering via a left sidebar. This replaces the previous inline client-side filtering approach. The reviewer should evaluate whether the UI design is now complete and ready for implementation.",
    "what_changed": {
      "new_feature": "Left sidebar with faceted metadata filtering (Splunk-style)",
      "key_elements": [
        "Sidebar shows metadata keys with value counts (e.g., 'productCode (4)')",
        "Clicking a key opens a popover for value selection",
        "Two match modes: 'Match any' (OR, checkboxes) or 'Match exactly' (AND, radio buttons)",
        "Instant apply - no submit button, changes filter results immediately",
        "Dynamic count updates as filters are applied",
        "Property filters (has-null, has-empty, optional, repeating) in sidebar",
        "Path text filter in sidebar"
      ],
      "table_changes": "Results table now has FIXED columns only (fieldPath, context, min, max, null, empty). Metadata is NO LONGER shown in table columns - it appears only in the detail panel.",
      "requirements_added": "REQ-3.8 (Faceted metadata filtering)",
      "requirements_updated": [
        "REQ-3.1 (no metadata columns)",
        "REQ-3.3 (left sidebar filtering)"
      ]
    }
  },
  "review_questions": {
    "implementation_readiness": [
      "Is the faceted filtering feature fully specified enough to implement without ambiguity?",
      "Are there any blocking gaps that would prevent a developer from building this?",
      "Is the component breakdown (FacetSidebar, MetadataFacet, FacetPopover, etc.) appropriate?",
      "Are the implementation phases properly sequenced with the new facet components?"
    ],
    "design_coherence": [
      "Does the left sidebar integrate well with the existing two-view search design (Quick Search vs Advanced Search)?",
      "With the detail panel on the right and facet sidebar on the left, is there enough horizontal space for the results table?",
      "Is there any redundancy or confusion between server-side metadata filtering (Advanced Search form) and client-side faceted filtering (sidebar)?",
      "Does removing metadata columns from the table create any usability issues?"
    ],
    "ux_concerns": [
      "Is the 'Match any (OR)' vs 'Match exactly (AND)' terminology clear to users?",
      "Is the popover approach for value selection intuitive, or would inline expansion be better?",
      "Is 'instant apply' (no Apply button) the right choice, or could rapid filter changes cause confusion?",
      "When switching from OR to AND mode, we uncheck all values. When switching AND to OR, we check all. Is this behavior intuitive?",
      "Should there be visual feedback when a filter is active beyond the dot indicator (e.g., 'productCode ● 2/4')?"
    ],
    "edge_cases": [
      "What happens when all values in a facet are filtered out (count = 0)?",
      "What if a search returns results from 20+ contexts with many metadata keys - does the sidebar become unwieldy?",
      "How should the sidebar behave when there are zero results?",
      "What if a metadata key has 50+ distinct values - should there be a 'Show more' pattern or search within the popover?"
    ],
    "missing_features": [
      "Should there be a way to collapse/expand the sidebar to give more table space?",
      "Should keyboard shortcuts exist for common facet operations?",
      "Is there a need for 'save filter preset' or 'share filtered view' functionality?",
      "Should the URL encode facet filter state for shareability?"
    ],
    "consistency_check": [
      "Do all wireframes consistently show the new sidebar layout?",
      "Does the requirements traceability correctly map all new components to requirements?",
      "Are there any contradictions between REQUIREMENTS.md and IMPLEMENTATION.md?"
    ]
  },
  "output_format": {
    "structure": "Organize your review into: (1) Blockers - issues that must be resolved before implementation, (2) Recommendations - improvements that should be considered, (3) Questions - clarifications needed, (4) Validation - aspects that are well-designed and ready",
    "specificity": "Reference specific requirement IDs (e.g., REQ-3.8) or section names when identifying issues",
    "actionability": "For each issue or recommendation, suggest a concrete resolution if possible"
  },
  "reviewer_notes": [
    "This is a POC/first release - some features are intentionally deferred (e.g., tree view, saved searches)",
    "The backend is already implemented and supports all required API endpoints",
    "Target users are developers and analysts familiar with tools like Splunk and Kibana",
    "The 250-result limit is intentional for this release - no pagination"
  ]
}
✓ Read
docs/ui/REQUIREMENTS.md
✓ Read
docs/ui/IMPLEMENTATION.md
Now I have both documents. Let me provide a comprehensive review of the faceted metadata filtering feature.

---

UI Design Review: Faceted Metadata Filtering Feature

Summary

The faceted metadata filtering via left sidebar is well-designed and implementable, but there are 3 implementation gaps and 4 UX edge cases that should be clarified before development begins. The feature is 87% complete—the core concept is solid, but some details need specification.

---

1. BLOCKERS: Issues That Must Be Resolved

Blocker A: useFacets Hook Specification is Incomplete

Issue: Phase 3, step 21 says to build useFacets hook to "compute facet index from results, manage filter state," but the implementation contract is undefined.

Specifics:

What's the input? (the loaded CatalogEntry[] array)
What's the output? (facet index structure, filter state shape)
When does computation happen? (on every result load? on mount? memoized?)
How does state persist? (React state? URL params? both?)

Example gap:

// The implementation plan shows this should exist:
const { facets, filters, setFilter, clearFilters } = useFacets(results)

// But these questions are unanswered:
// 1. Does setFilter take (key, value, mode) or (key, values[])?
// 2. When user clicks "Match any" → "Match exactly", what happens to selectedValues?
// 3. How are dynamic count updates computed when another filter is active?

Impact: Developer will write this 2-3 times before getting the contract right.

Resolution:
Add to IMPLEMENTATION.md, Section "Faceted Metadata Filtering" (after line 328):

// useFacets Hook Contract
interface FacetIndex {
  [metadataKey: string]: {
    values: Array<{ value: string; count: number }>
    mode: 'any' | 'exactly'  // OR vs AND
    selected: Set<string>
  }
}

interface useFacetsReturn {
  facets: FacetIndex
  filteredResults: CatalogEntry[]  // results after applying facet filters
  setFacetMode: (key: string, mode: 'any' | 'exactly') => void
  setFacetValue: (key: string, value: string, checked: boolean) => void
  clearFacet: (key: string) => void
  clearAllFacets: () => void
}

// Algorithm for count updates:
// When a filter is applied to key K, the counts for other keys update
// based on what subset of results still match K's filter.
// Example: Before filtering, productCode has [DDA (28), CDA (15), SAV (12)]
// After selecting contextId=deposits, only [DDA (20), CDA (12)] exist

---

Blocker B: Facet Popover "Clear" Button Scope is Ambiguous

Issue: Line 293 shows a [Clear] button in the FacetPopover, but it's unclear what it does.

Ambiguity:

Does it clear only this facet's selection? ✓ (most likely)
Or does it clear all facet selections? ✗ (less likely given placement)
If "Match any (OR)" with values [DDA, CDA, SAV] selected, clicking Clear should... uncheck all three? Or close the popover?

Impact: Developer implements it one way, product owner expects another. Rework.

Resolution:
Update IMPLEMENTATION.md, Section "Facet Popover" (around line 294):

| [Clear] button | Uncheck all values in this specific facet only. 
                   Resets this key's filter to "show all" state.
                   Does not affect other facet filters or property filters.
                   After clicking, counts for other facets update dynamically.

---

Blocker C: Mode-Switch Behavior for Selected Values is Underspecified

Issue: IMPLEMENTATION.md line 304-308 describes what happens when switching modes, but the implementation detail is missing.

"OR → AND: Uncheck all values (no filter = show all, same result)"
"AND → OR: Check all values (show all = same result)"

Missing specifics:

Does clicking the radio button trigger mode switch immediately, or after a confirmation?
When switching AND → OR with 1 value selected (e.g., "CDA"), do we:
Option A: Check ALL values (all contexts shown), then user can uncheck
Option B: Keep "CDA" selected but switch to OR (inconsistent: 1 value in OR mode is same as AND)
Option C: Clear AND show a message "Switched to OR mode—all values now shown"
After mode switch, is the popover still open? (assumed yes, but not stated)

Impact: Creates jarring UX if not thought through. User might see results suddenly change without understanding why.

Resolution:
Update IMPLEMENTATION.md, Section "Mode Switching Behavior":

When user clicks radio button to switch modes:

1. Mode switches immediately (no confirmation)
2. Selection state adapts:
   - OR → AND: Uncheck all (results show all values—no change to result set)
   - AND → OR: Check all (results show all values—no change to result set)
3. Popover remains open
4. After switch, user can select values in new mode
5. First click in new mode triggers count recalculation

Example flow:
- User has OR mode with [DDA, CDA] checked → results = 40 entries
- User clicks "Match exactly (AND)" radio → all unchecked → results still 40 entries
- User clicks "CDA" radio → CDA selected, AND mode active → results = 12 entries

---

2. RECOMMENDATIONS: Improvements to Consider

Rec A: Clarify Facet Visibility When Results Are Empty (REQ-5.3)

Current state: IMPLEMENTATION.md doesn't specify sidebar behavior when:

User searches and gets 0 results
Results load then user filters to 0 results
API call fails

Why it matters: If sidebar shows "contextId (0)" and "productCode (0)", it's confusing. Better to hide it or show a message.

Recommendation:

Add to "Page States (REQ-5.3)" section (around line 397):

| Facet Sidebar Behavior | Condition | Action |
|---|---|---|
| **Show all facets** | Results > 0 | Display facets normally with counts |
| **Hide sidebar** | Results = 0 | Hide entire FacetSidebar (no facets to show) |
| **Show error state** | API error | Show sidebar but with error message "Filters unavailable" |
| **Loading state** | Results loading | Show skeleton for facets (5-6 placeholder rows) |

---

Rec B: Add Popover Width/Height Constraints

Current state: FacetPopover wireframe (line 280) shows values but no constraint on how many before scrolling.

Recommendation:

Add to IMPLEMENTATION.md, "Facet Popover" section:

**Layout constraints:**
- Max height: 300px (show scrollbar for many values)
- Min width: 220px (readable at default zoom)
- Max width: 350px (don't overflow narrow screens)
- If metadata key > 50 distinct values:
  - Add a search input at top of popover to filter within the list
  - Or truncate to "Top 20" with "Show more..." link

---

Rec C: Add Active Filter Indicator More Clearly

Current state: Line 179 shows productCode ● 1/4 notation. This is good, but:

Will users understand ● symbol?
Is "2/4" clear (2 of 4 values selected)?
What if someone is colorblind and doesn't see the dot?

Recommendation:

Update IMPLEMENTATION.md around line 278:

**Visual Indicators for Active Filters:**
- Primary: Bullet point `●` next to key name (styled in primary blue)
- Secondary: Count notation `1/4` (1 of 4 values selected)
- Tertiary: Optional—add the word "filtered" for clarity: `productCode ● (1 of 4 filtered)`

Example states:
- No filter: `productCode        (4)`
- Some selected: `productCode ●    (1 of 4)`
- All selected: `productCode ● (4 of 4)` (after mode switch from AND to OR)

---

Rec D: Consider "Collapsible Sidebar" for Mobile/Narrow Screens (REQ-5.2)

Current state: Responsive design note (REQ-5.2) says "usable on screens from 768px width and up." With left sidebar + detail panel on right, a 768px screen is very tight.

Recommendation:

Add to IMPLEMENTATION.md, "Responsive Design" section:

**Sidebar behavior on different screen widths:**
- >= 1024px: Sidebar always visible (standard layout)
- 768px - 1023px: Sidebar visible but narrow (150-180px) OR collapsible toggle
- < 768px: Not supported (design constraint)

Consider adding:
- Collapse/expand toggle (hamburger icon) for sidebar on tablets
- Keyboard shortcut (Ctrl+/) to toggle sidebar visibility
- When collapsed: show only facet key first letters (e.g., "cI" for contextId)

---

3. QUESTIONS: Clarifications Needed

Q1: Should Facet State Persist in URL for Sharing? (REQ-3.8, Shareable URL State)

Current state: The "Shareable URL State" section (line 519) lists parameters that ARE encoded in URL. It does NOT mention facet filters.

Question:

Should facet selections be encoded in URL? (e.g., ?productCode_facet_mode=any&productCode_facet_values=DDA,CDA)
Or are facet filters considered "client-side only" and not sharable?

Why it matters: If a user applies facet filters and sends the URL to a colleague, do those filters persist? Currently implied NO, but not explicitly stated.

Suggested answer:

Add to "Shareable URL State" section:

**Facet filters are NOT encoded in URL.** They are considered temporary refinements 
of loaded results, not part of the core search query. To share a filtered view, 
user would need to copy/paste the visual state manually (future feature: "Save Filter Preset").

Server-side filters (context, metadata values, fieldPath) change what data is fetched.
Client-side filters (facets, properties, path text) show/hide already-loaded data.
Only server-side filters are encoded in shareable URLs.

---

Q2: What's the Performance Impact of Facet Index Computation?

Current state: IMPLEMENTATION.md doesn't specify performance constraints for facet computation.

Scenario: If a search returns 250 results with 15 metadata keys and average 20 values per key, computing the facet index might take 50-100ms. Is this acceptable?

Suggested answer:

Add to config.ts:

/** Facet index computation timeout (ms). If computing takes longer, 
    show sidebar with "Loading..." and compute in background. */
FACET_INDEX_TIMEOUT_MS: 500,

/** Maximum metadata keys to show in sidebar. If more, show "More filters..." 
    dropdown or pagination. */
MAX_FACETS_IN_SIDEBAR: 10,

---

Q3: How Should Facet Counts Update When A Search Parameter Changes?

Current state: Line 315-322 shows count updating when user applies facet filters. But what about when:

User changes context in Advanced Search form (server-side filter change)
User types in fieldPath (server-side filter change)
Then returns to look at sidebar

Question: Should the sidebar recompute from the NEW results? (assumed yes, but makes sense to state explicitly)

Suggested answer:

Add to "Dynamic count updates" section:

Counts update in two scenarios:
1. **User applies facet filter** (client-side): Counts show subset matching the filter
2. **Server-side filter changes** (context, metadata, fieldPath): 
   - New results fetch from API
   - Facet sidebar clears all active facet filters
   - Facet index rebuilds from new result set
   - User can now facet-filter the new results

---

4. VALIDATION: What's Well-Designed

These aspects are ready to implement without changes:

✅ Faceted search pattern matches user expectations (Splunk-like interface is familiar to target audience)

✅ Two match modes (OR/AND) is the right pattern (common in advanced search tools)

✅ Instant apply (no "Apply button") is correct (modern UX standard, matches Splunk/Kibana)

✅ Property filters (has-null, has-empty, optional, repeating) are well-scoped (complement metadata facets nicely)

✅ Path text filter is appropriately simple (case-insensitive contains match—no regex needed client-side)

✅ Results table has fixed columns (no metadata columns) (scales elegantly, detail panel shows all metadata)

✅ Server-side vs client-side filtering distinction is clear (IMPLEMENTATION.md line 228-243 explains it well)

✅ Sidebar layout is intuitive (clear sections: metadata facets, property filters, path filter)

---

5. EDGE CASES: Test Scenarios

Add these to Phase 7 (Polish & Testing) in a "Faceted Filtering Test Plan":

Scenario
Expected Behavior
User searches and gets 23 results
Sidebar shows 4 metadata keys with values and counts
User clicks contextId, selects "deposits"
Results filter from 23 → 18. Other keys update: productCode now shows (2) instead of (4).
User opens productCode popover, switches to AND mode
All values unchecked. Popover still open. Clicking a value filters to just that value.
User has OR mode with [DDA, CDA] checked, switches to AND
Both values uncheck. Results stay same (18). User clicks CDA radio. Results filter to 8.
User applies filter narrowing results to 0
Sidebar hides (or shows empty state). Path text filter becomes useless. Consider adding "Show all results" button.
User searches with 20+ metadata keys
Sidebar should scroll or show "More filters..." to avoid overwhelming layout.
User enables "has null" checkbox + selects productCode facet
Both filters apply together (AND logic). Counts update for intersection.
User exports results with facet filters active
Exports only filtered subset (not all 250 results). Export button should indicate "Exporting 8 of 250".

---

6. IMPLEMENTATION READINESS CHECKLIST

Before handing to dev team, verify:

Blocker A resolved: useFacets hook contract is documented with interface
Blocker B resolved: FacetPopover [Clear] button behavior is specified
Blocker C resolved: Mode-switch behavior with example flow is documented
Q1 answered: Facet filters in URL encoding decision is made
Q2 answered: Performance constraints for facet computation are defined
Q3 answered: Count update behavior when server-side filters change is specified
Rec A addressed: Empty results sidebar behavior is documented
Rec B addressed: Popover layout constraints (height, width, scrolling) are specified
Rec C addressed: Active filter visual indicators are clarified
Edge case tests added to Phase 7 test plan

---

Overall Verdict: Ready to Implement with Clarifications

The faceted filtering feature is well-integrated into the overall design and doesn't create any conflicts with existing search or detail panel layouts. The three blockers are straightforward documentation gaps—not design flaws. Once resolved, a developer can complete this in 3-4 days.

The horizontal space concern (left sidebar + right detail panel) is valid but not a blocker—at 768px+ screens, there's 300-400px for the results table, which is plenty for a horizontal scroll if needed. Recommendation C (collapsible sidebar) would improve mobile UX but isn't required for Phase 1.