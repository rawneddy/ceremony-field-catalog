# Blocker Review Synthesis - Round 2

**Date:** December 18, 2025
**Reviewers:** AMP, GPT, GEMINI_PRO, GEMINI_FLASH
**Focus:** Faceted filtering, 3-panel layout, client-side filtering architecture

---

## Executive Summary

Four reviewers identified **5 distinct blocking issues** that require resolution before implementation. The most critical theme across all reviews is the **undefined relationship between column header filters and sidebar facets**. Additionally, GPT identified a **backend API mismatch** that contradicts REQ-2.1.

---

## Critical Blockers (Must Fix)

### B1: Column Filter + Facet Interaction Undefined
**Severity:** CRITICAL
**Identified by:** GEMINI_PRO, GEMINI_FLASH, AMP (partial)
**Consensus:** 3/4 reviewers

**Issue:** The design splits client-side filtering into two locations:
- **Column Headers:** Field Path (text), Context (dropdown), Null?/Empty? (dropdown)
- **Sidebar:** Metadata facets only

But the spec never defines how these interact. Specifically:
- Do column filters affect facet counts in the sidebar?
- What is the filtering pipeline order?
- Does `useFacets` hook receive raw API results or column-filtered results?

**Why it blocks:** If facets calculate counts from raw API results but column filters hide rows, the sidebar shows misleading counts for hidden data. Developers cannot implement `useFacets` without knowing the data flow.

**Resolution Required:** Define filtering pipeline:
```
API Results → Column Filters → Sidebar Facets → Final Display
```
The `useFacets` hook must receive results AFTER column filters are applied.

---

### B2: Quick Search Metadata Mismatch (Backend vs UI)
**Severity:** CRITICAL
**Identified by:** GPT
**Consensus:** 1/4 reviewers (but verified against backend docs)

**Issue:** REQ-2.1 states Quick Search "searches fieldPath, contextId, and metadata values using OR logic." However, the backend `GET /catalog/fields?q=` endpoint only searches `fieldPath` and `contextId` — NOT metadata values.

**Why it blocks:** The UI cannot implement REQ-2.1 as written. Either:
1. Backend needs to add metadata value search to `q` parameter, OR
2. REQ-2.1 needs to be updated to exclude metadata from Quick Search

**Resolution Required:** Decision needed:
- **Option A:** Update backend to search metadata values in `q` (scope creep)
- **Option B:** Update REQ-2.1 to say Quick Search searches fieldPath and contextId only (recommended)

---

### B3: Column Filter Reset on New Search
**Severity:** HIGH
**Identified by:** GEMINI_PRO, GEMINI_FLASH, AMP
**Consensus:** 3/4 reviewers

**Issue:** The spec says "facet filters reset when new server-side search executes" but is silent on column header filters. If a user has Context column filtered to "Deposits", then runs a new search, the stale filter could hide all results (false zero state).

**Why it blocks:** Ambiguous reset behavior leads to confusing UX where valid results appear empty.

**Resolution Required:** Explicitly state: "ALL client-side filters reset on new server-side search" — including both sidebar facets AND column header filters.

---

### B4: useFacets Hook Interface Incomplete
**Severity:** HIGH
**Identified by:** AMP
**Consensus:** 1/4 reviewers (but detailed analysis)

**Issue:** The `useFacetsReturn` interface is missing essential methods:
- `getFacetByKey(key)` — FacetPopover needs this
- `getActiveFacets()` — Sidebar needs this for pinning
- `hasActiveFacets()` — Clear All button needs this
- `recomputeIndex(results)` — Called when results change

**Why it blocks:** UI components cannot read facet state or trigger recomputation without these methods.

**Resolution Required:** Expand the interface with accessor methods.

---

### B5: Context Column Filter Loses Multi-Select
**Severity:** HIGH
**Identified by:** GEMINI_FLASH
**Consensus:** 1/4 reviewers (but valid point)

**Issue:** Moving Context from sidebar facet to column header dropdown may lose "Include any" (OR) functionality. Standard dropdowns are single-select. If a user wants to see both "Deposits" AND "Loans" fields, they cannot with a single-select dropdown.

**Why it blocks:** Feature regression — users lose the ability to filter by multiple contexts simultaneously.

**Resolution Required:** Clarify that Context column filter is either:
- **Option A:** Multi-select checkbox dropdown (maintains feature parity)
- **Option B:** Single-select only (acceptable if documented as intentional simplification)

---

## High Concerns (Should Fix)

### C1: Disjunctive Counting Algorithm Unspecified
**Identified by:** AMP
**Issue:** The spec says "disjunctive counting" but doesn't provide the algorithm. Specifically:
- What happens on initial load?
- How do multiple selections in OR mode affect other facet counts?
- What's the exact formula?

**Resolution:** Add detailed algorithm walkthrough to IMPLEMENTATION.md.

---

### C2: Field Path Removed from Detail Panel
**Identified by:** AMP, GEMINI_PRO, GEMINI_FLASH
**Consensus:** 3/4 reviewers

**Issue:** Field path was removed because it's visible in the table row. But long paths (200+ chars) will be truncated with `...` in the table. Users can't read the full path.

**Resolution Options:**
- **Option A:** Restore field path to detail panel (with wrapping/scroll)
- **Option B:** Add tooltip on table cell showing full path
- **Option C:** Keep copy button on row — users copy to see full path (current design)

---

### C3: Mode Switching Warning Text Undefined
**Identified by:** AMP
**Issue:** Spec says "show warning when switching modes with multiple values" but doesn't define:
- Exact warning dialog text
- What happens to selections (clear all? keep first?)
- Reverse direction (Require one → Include any) behavior

**Resolution:** Add explicit warning dialog copy and behavior rules.

---

### C4: Export Metadata Column Discovery
**Identified by:** GEMINI_FLASH, AMP
**Issue:** Mixed-context exports have varying metadata keys. Need to scan ALL results to build column headers, not just first row.

**Resolution:** Document the "scan pass" requirement explicitly.

---

## Questions Requiring Decision

| ID | Question | Raised By | Options |
|----|----------|-----------|---------|
| Q1 | Should Context column filter be multi-select or single-select? | GEMINI_FLASH | Multi (feature parity) vs Single (simpler) |
| Q2 | Should field path be restored to detail panel? | 3 reviewers | Yes (readable) vs No (copy button suffices) |
| Q3 | Quick Search metadata: backend change or requirement change? | GPT | Backend change vs Update REQ-2.1 |
| Q4 | Do column filters show counts like facets do? | GEMINI_FLASH | Yes (consistent) vs No (simpler) |

---

## Verification Summary

| Check | AMP | GPT | GEMINI_PRO | GEMINI_FLASH |
|-------|-----|-----|------------|--------------|
| All decisions reflected? | ✅ | ❌ | ✅ | Mostly |
| Wireframes consistent? | ✅ | ✅ | ✅ | ✅ |
| Interfaces complete? | ❌ | ✅ | ❌ | ❌ |

---

## Recommended Action Plan

### Must Fix Before Development:
1. **B1:** Define column filter → facet interaction pipeline
2. **B2:** Decide Quick Search metadata behavior (recommend: update REQ-2.1 to exclude metadata)
3. **B3:** Add explicit "reset ALL client-side filters on new search" rule
4. **B4:** Expand `useFacets` interface with missing methods
5. **B5:** Decide Context column filter cardinality (single vs multi-select)

### Should Fix:
1. **C1:** Add disjunctive counting algorithm
2. **C2:** Decide field path visibility (recommend: keep in detail panel OR add tooltip)
3. **C3:** Add mode switching warning dialog spec
4. **C4:** Document export metadata scan requirement

---

## Overall Assessment

**The design is 85% ready for implementation.** The core architecture (3-panel layout, faceted filtering, two-view search) is sound. However, the **column filter + facet interaction** is the critical gap that all reviewers identified. Once the filtering pipeline is defined and the `useFacets` interface is expanded, development can proceed.

**Recommended:** Resolve B1-B5 before Phase 2 (Search Pages) begins. These can be addressed in a single documentation update session.
