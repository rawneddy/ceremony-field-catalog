# Blocker Identification Review: Faceted Filtering & 3-Panel Layout
**Model:** GEMINI
**Date:** 2025-12-18

## 1. Blockers

| ID | Severity | Location | Issue | Why it Blocks | Suggested Resolution |
|:---|:---|:---|:---|:---|:---|
| **B1** | **CRITICAL** | IMPLEMENTATION.md: `useFacets` | **State Management & Counting Logic Gap** | REQ-3.8 requires "disjunctive counting: current facet counts stay constant while other facets update." If `useFacets` only manages metadata facets and is unaware of Table Column Filters (Path, Context, Null/Empty), the counts will be **incorrect/misleading** as soon as a column filter is applied. A user filtering "Null? = Yes" in the table would still see facet counts for "Null? = No" entries. | `useFacets` must either manage all client-side filter state or accept `columnFilterState` as an input. The `filteredResults` returned by the hook must be the final set after BOTH column and facet filters are applied. |
| **B2** | **HIGH** | 01_FACET-PLAN.md / IMPLEMENTATION.md | **Loss of Multi-select (OR) for Context** | Moving `contextId` from a sidebar facet to a column header dropdown (per 01_FACET-PLAN) risks losing "Include any" (OR) logic. Standard header dropdowns are usually single-select. If a user wants to see "Loans" and "Deposits" fields together in the loaded results, they can no longer do so if the dropdown is single-select. | Explicitly define the Context column header filter as a **multi-select checkbox dropdown** to maintain feature parity with metadata facets, even if it's visually separated. |

## 2. Concerns

| ID | Severity | Location | Issue | Suggestion |
|:---|:---|:---|:---|:---|
| **C1** | **MEDIUM** | REQ-3.4 / IMPLEMENTATION.md | **Field Path Readability** | Field Path was removed from the detail panel because it's in the table. However, long paths (e.g., 200+ chars) will likely be truncated with `...` in the table. Without it in the detail panel, there is no way for a user to **read** the full path without copying it to another app. | Restore `fieldPath` to the top of the detail panel, using a `<code>` block that supports wrapping or horizontal scrolling. |
| **C2** | **LOW** | REQ-3.6 / IMPLEMENTATION.md | **Export Column Discovery** | Metadata keys vary by context. To produce a valid CSV, the export function must scan the **entire loaded result set** (up to 250 entries) to find the union of all metadata keys before generating headers. | Explicitly document this "scan pass" in the implementation details to ensure developers don't just use keys from the first result row. |
| **C3** | **LOW** | IMPLEMENTATION.md: Page States | **Column Filter Reset** | The doc states facet filters reset on new server-side search, but is silent on column header filters. | Explicitly state that all column header filters (Path text, Context dropdown, etc.) also reset when a new API-driven search is executed. |

## 3. Questions

| ID | Location | Question | Impact if Unresolved |
|:---|:---|:---|:---|
| **Q1** | REQ-3.1 | **Disjunctive counting for Column Filters?** | Do column filters (e.g., "Null?") show counts for their values? If the Context dropdown shows "Deposits (12)" and "Loans (5)", does it follow the same disjunctive logic as facets? If not, the UI will feel inconsistent. |
| **Q2** | IMPLEMENTATION.md | **Truncation Warning & Scrolling** | If the search form is tall and the user scrolls the table, does the Truncation Warning stay visible (sticky) or scroll away? | The requirement says "Should be impossible to miss," which implies it might need to be sticky. |
| **Q3** | IMPLEMENTATION.md | **Export Format Toggle** | "Styled like String/Regex toggle." Will a binary toggle be clear for CSV vs JSON, or would a standard select/tab be more intuitive for "Format"? | Potential UX confusion if the toggle isn't clearly labeled. |

## 4. Verification

*   **All decisions reflected:** **Mostly.** The "cleaner separation" of Context/Path filters is reflected, but the resulting architectural complexity (State Gap) wasn't fully addressed in the `useFacets` interface.
*   **Wireframes consistent:** **Yes.**
*   **Interfaces complete:** **No.** `useFacets` needs to account for column filters to satisfy counting requirements.

## 5. Summary
The design is robust but suffers from a "split brain" between the sidebar facets and the table column filters. While the visual separation is an improvement, the underlying logic must treat them as a **unified filter set** to ensure the counts displayed in the sidebar are accurate and meaningful. Addressing the state coordination between these two filter locations is the primary technical hurdle for implementation.
