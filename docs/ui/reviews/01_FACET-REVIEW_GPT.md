# GPT 5.2 CODEX HIGH

• Blockers

  - Facet key scope is contradictory: REQ-3.8 says “metadata keys present in results,” but the sidebar mock and logic include contextId as a facet; decide whether contextId is a
    supported pseudo‑facet (update REQ-3.8 + facet index logic) or remove it from sidebar examples and filtering. docs/ui/REQUIREMENTS.md:114 docs/ui/IMPLEMENTATION.md:254
  - Quick Search regex toggle is specified, but the plan still uses q= (contains search across fieldPath + contextId), which doesn’t map to regex behavior; decide whether regex
    mode is Advanced‑only, or define a new request shape/behavior for Quick Search (e.g., regex applies to fieldPath only) and update both docs. docs/ui/REQUIREMENTS.md:101
    docs/ui/IMPLEMENTATION.md:146
  - Facet count semantics are underspecified: “counts update dynamically” doesn’t define whether counts are computed with the facet’s own filter applied or excluded (standard
    faceting vs self-filtered), and whether zero‑count values are hidden or disabled; pick a rule and document it so the useFacets implementation is deterministic. docs/ui/
    REQUIREMENTS.md:114 docs/ui/IMPLEMENTATION.md:315

  Recommendations

  - Add a clear UX pattern for many facet values (search within popover + scroll + “show more”), otherwise 50+ values will be unwieldy; document a default cutoff and behavior.
    docs/ui/REQUIREMENTS.md:114 docs/ui/IMPLEMENTATION.md:280
  - Define responsive behavior when both the left sidebar and right detail panel are open (collapse/overlay/resize); the 768px target will be tight for a fixed table between two
    panels. docs/ui/REQUIREMENTS.md:148 docs/ui/IMPLEMENTATION.md:173
  - Clarify that facet counts are based on the loaded result set (max 250) to avoid users interpreting them as global counts. docs/ui/REQUIREMENTS.md:108 docs/ui/
    IMPLEMENTATION.md:209
  - Update “Shareable URL State” to explicitly mention facet selections and property/path filters (whether they are excluded or encoded) so link behavior matches expectations.
    docs/ui/IMPLEMENTATION.md:519
  - Consider a compact active-filter summary (chips or “productCode ● 2/4” + tooltip) to reduce ambiguity around “Match any/exactly,” especially with instant apply. docs/ui/
    IMPLEMENTATION.md:275

  Questions

  - Should facet counts be computed with the current facet’s selection applied, or computed from “all other filters except this facet” (classic faceting)? docs/ui/
    IMPLEMENTATION.md:315
  - When zero results are returned, should the sidebar show empty facets, disabled facets with zero counts, or a dedicated empty state? docs/ui/REQUIREMENTS.md:109 docs/ui/
    IMPLEMENTATION.md:329
  - Do we want URL‑shareable facet state (even though other client-side filters aren’t currently encoded), or explicitly treat facets as non‑shareable for v1? docs/ui/
    IMPLEMENTATION.md:519

  Validation

  - The faceted sidebar feature is well-integrated into both Quick and Advanced Search layouts, and the table column changes are consistent with REQ‑3.1. docs/ui/
    IMPLEMENTATION.md:146 docs/ui/REQUIREMENTS.md:107
  - Component breakdown and hooks (FacetSidebar, MetadataFacet, FacetPopover, useFacets) are appropriate and map cleanly to REQ‑3.8. docs/ui/IMPLEMENTATION.md:38 docs/ui/
    IMPLEMENTATION.md:845
  - Phase sequencing is logical: faceting is added after core search/results, minimizing rework. docs/ui/IMPLEMENTATION.md:557
  - The “Server‑Side vs Client‑Side Filtering” section clearly separates responsibilities and avoids redundancy in intent. docs/ui/IMPLEMENTATION.md:231

  Overall, the faceted filtering addition is close to implementation‑ready; resolving the blockers above should make it executable without ambiguity.

# GPT 5.2 XHIGH

• Blockers

  - REQ-3.8 count semantics are still ambiguous: the sidebar shows productCode ● 2/4, but the docs don’t explicitly define whether key/value counts are computed on the fully
    filtered set vs “all other filters except this facet” (disjunctive faceting); pick one and add a concrete example so dynamic counts are implementable without guesswork.
  - docs/ui/IMPLEMENTATION.md “Faceted Metadata Filtering (Left Sidebar)” mode-switching rules (OR→AND “uncheck all”, AND→OR “check all”) don’t preserve results when a filter is
    active; either document that switching clears/broadens filters, or change the rules to carry over selections (and define what happens when switching OR→AND with >1 value
    selected).
  - docs/ui/IMPLEMENTATION.md “Requirements Traceability” is inconsistent with the rest of the plan (e.g., SearchForm.tsx, QuickFindInput.tsx, and multiple wrong REQ-2.x
    mappings); fix component names + requirement IDs so the implementation plan can be followed reliably.
  - REQ-5.2 responsive behavior isn’t specified for the new 3-panel layout (left sidebar + table + right detail panel); define breakpoint behavior (collapse sidebar/drawer,
    detail panel overlay, table scroll rules) before build to avoid rework.

  Recommendations

  - Make it explicit in the UI copy that sidebar facets refine only the currently loaded results (bounded by MAX_RESULTS_PER_PAGE / REQ-3.2), otherwise facet counts can be
    misread as “global truth.”
  - Clarify terminology in REQ-3.8: “Match exactly (AND)” reads like multi-value AND, but the UI is single-select; consider “Match one” / “Is” vs “Match any” (keep OR/AND as
    helper text if desired).
  - Define “Clear” and “Clear All Filters” scope: recommend “Clear sidebar filters” (client-side REQ-3.3) vs separate “Reset search” (server-side REQ-2.5–REQ-2.7) to avoid
    confusion.
  - Add a “50+ values” pattern for FacetPopover (search-within-values + “Show more/top N”), and a “many keys” pattern for the sidebar (scroll + optional “Search facets” input +
    keep active facets pinned).
  - Ensure export (REQ-3.6) includes metadata in the output even though the table doesn’t show metadata columns (REQ-3.1), so users aren’t forced into row-by-row detail-panel
    copying.

  Questions

  - Should contextId be treated as a facet key (it appears in the wireframes) even though REQ-3.8 says “metadata keys”? If yes, call it out as a built-in facet.
  - In OR mode, what does “no values selected” mean: “no filter (show all)” or “filter to none (0 results)”? What should [Clear] do in OR mode (select all vs select none)?
  - When new server-side results load (new q / contextId / metadata / fieldPathContains), do client-side sidebar filters persist or reset by default?
  - For property filters (REQ-3.3), is combining multiple checkboxes AND (intersection) or OR (union)?
  - When a selected value’s count drops to 0 due to other filters, should it remain visible (so it can be unchecked) or only be removable via “Clear”?

  Validation

  - The sidebar + fixed-column table + right detail panel is coherent: removing metadata columns (REQ-3.1) avoids “column explosion,” while the detail panel (REQ-3.4) preserves
    access to full metadata.
  - The separation in docs/ui/IMPLEMENTATION.md (“Server-Side vs Client-Side Filtering”) aligns well with REQ-2.6 (server-side metadata filters) and REQ-3.3/REQ-3.8 (instant
    client-side refinement).
  - The component breakdown (FacetSidebar/MetadataFacet/FacetPopover + useFacets) and Phase 3 sequencing for the new facet feature look appropriate and implementable once the
    above clarifications are resolved.