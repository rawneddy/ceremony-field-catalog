# Blocker Review: Ceremony Field Catalog UI

## Review Metadata
- **Reviewer:** GEMINI
- **Date:** December 18, 2025
- **Focus:** Faceted filtering, 3-panel layout, client-side filtering architecture
- **Documents Reviewed:** REQUIREMENTS.md, IMPLEMENTATION.md, 01_FACET-PLAN.md

## 1. Blockers (CRITICAL/HIGH)

These issues must be resolved before implementation can proceed.

### B1: Undefined Interaction Between Column Filters and Sidebar Facets
- **Severity:** CRITICAL
- **Location:** `IMPLEMENTATION.md` - "Server-Side vs Client-Side Filtering" & "useFacets"
- **Issue:** The design splits client-side filtering into two distinct locations: **Sidebar** (managed by `useFacets`, metadata only) and **Table Columns** (Field Path, Context, Null/Empty). It is not specified how these two filtering layers interact. Specifically, do column filters affect the facet counts shown in the sidebar?
- **Why blocks:** 
    - If `useFacets` calculates counts based on raw API results, filtering the table (e.g., hiding "Context=Loans") will leave the sidebar showing metadata counts for the hidden rows (confusing user experience).
    - If `useFacets` receives filtered data from the table, the architecture for passing this state is missing.
    - Developers cannot implement `useFacets` without knowing if it should account for column-level filters.
- **Suggested Resolution:** Centralize client-side filtering state. Define a pipeline: `API Results` -> `Column Filters` -> `Sidebar Facets`. The input to the Facet calculator should be the results *after* Column Filters are applied, ensuring facet counts reflect the currently visible "table universe". Alternatively, a single hook should manage ALL client-side filters.

### B2: Stale Column Filters on New Search
- **Severity:** HIGH
- **Location:** `IMPLEMENTATION.md` - "Server-Side vs Client-Side Filtering"
- **Issue:** The spec states: "When user changes server-side filters... client-side facet filters reset." It explicitly mentions facets (sidebar) but omits Column Header filters.
- **Why blocks:** If a user filters the "Context" column to "Deposits", then performs a new global search for "LoanApplication", the result set might be valid but completely hidden by the stale "Context=Deposits" column filter. This leads to a "False Zero Results" state.
- **Suggested Resolution:** Explicitly require that **ALL** client-side filters (Sidebar Facets AND Column Header Filters) must be reset to their default state when a new server-side search is executed.

## 2. Concerns (MEDIUM/LOW)

These issues should be addressed to prevent future bugs or UX friction.

### C1: Field Path Visibility in Detail Panel
- **Severity:** MEDIUM
- **Location:** `REQ-3.4` / `IMPLEMENTATION.md`
- **Issue:** Field Path was removed from the detail panel because it is visible in the table. However, table cells frequently truncate long text.
- **Suggestion:** Restore `Field Path` to the Detail Panel (read-only) or strictly mandate a full-text tooltip on the table cell to ensure the full path is always readable without copying.

### C2: Optional Metadata in Upload
- **Severity:** LOW
- **Location:** `REQ-4.3`
- **Issue:** Requirement states user "provides required metadata values". It does not explicitly mention optional metadata, though the context definition supports it.
- **Suggestion:** Update text to "provides required (and any desired optional) metadata values".

### C3: Regex Toggle Scope Ambiguity
- **Severity:** LOW
- **Location:** `REQ-2.1` vs `REQ-2.11`
- **Issue:** REQ-2.1 says Regex mode searches "fieldPath, contextId, and metadata". REQ-2.11 says the toggle is on "field path inputs". In Quick Search, the input is global.
- **Suggestion:** Clarify that in Quick Search, the "Regex" toggle upgrades the *entire* global search input to a regex pattern that matches against all fields (not just field path).

## 3. Questions

### Q1: Disjunctive Counting Scope
- **Location:** `useFacets` hook
- **Question:** Does disjunctive counting apply to the relationship between Column Filters and Facets?
- **Impact if unresolved:** If I filter the "Context" column, should the "Product" facet in the sidebar recalculate its counts based on that selection? (Yes, assumed per B1 resolution).

## 4. Verification

- **All decisions reflected?** Yes, the decisions from `01_FACET-PLAN.md` appear to be incorporated, particularly the move of Context to column headers.
- **Wireframes consistent?** Yes, wireframes in `IMPLEMENTATION.md` align with the text descriptions.
- **Interfaces complete?** Mostly yes, but the `useFacets` interface lacks the inputs necessary to handle the Column Filter interaction (B1).

## Summary
The design is largely solid and well-documented, with the "Two-View" search and Faceted Filtering clearly defined. The **Critical Blocker** is the undefined relationship between the Table Column Filters and the Sidebar Facets. These two client-side filtering mechanisms must be unified in the state management logic to ensure that facet counts accurately reflect the data visible in the table. Once the filter pipeline order is defined (Columns -> Facets), the implementation can proceed safely.
