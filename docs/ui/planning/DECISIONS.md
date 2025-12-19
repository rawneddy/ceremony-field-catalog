# UI Pre-Implementation Decisions

This document records the resolution of blocking and non-blocking issues identified during the pre-implementation review of the UI design.

---

## Blocking Issues - All Resolved

| Issue | Resolution |
|-------|------------|
| **Autocomplete requires new API surface** | ✅ `GET /catalog/suggest` endpoint implemented in backend |
| **Context "field count" not available** | ✅ `GET /catalog/contexts?includeCounts=true` implemented |
| **CORS not implemented** | ✅ CORS configured in `WebConfig.java` for localhost:5173 and localhost:3000 |
| **fieldPathContains behavior conflicts** | ✅ Backend updated to accept both full paths (`/Ceremony/...`) and plain text (`Amount`) |
| **Error response contract mismatch** | ✅ `ErrorResponse` interface documented consistently across API spec and implementation plan |
| **XML null vs empty semantics underspecified** | ✅ Explicit semantics added to REQUIREMENTS.md: `hasNull` is true when `xsi:nil="true"` is present (existing SDKs don't implement this - known bug), `hasEmpty` is true for whitespace-only or self-closing elements |

---

## Non-Blocking Issues - All Addressed

| Issue | Resolution |
|-------|------------|
| **250-result rule mechanism** | ✅ Clarified: Centralized in `config.ts` as `MAX_RESULTS_PER_PAGE`. Backend `max-page-size` must be aligned. |
| **Metadata casing in UI** | ✅ Clarified in REQUIREMENTS.md: backend normalizes to lowercase, UI displays as stored |
| **Update-context payload nuance** | ✅ Added "Implementation Notes" section explaining that requiredMetadata must be sent in PUT payloads |
| **Accessibility acceptance criteria** | ✅ Removed - explicitly noted as not a priority for initial release |
| **Shareable URL state scope** | ✅ Added "Shareable URL State" section specifying which parameters are encoded vs not |

---

## Questions Answered

| Question | Answer |
|----------|--------|
| Are backend changes in-scope? | **Yes** - All backend changes have been implemented |
| What is fieldPathContains contract? | **Regex pattern match** - special characters (`. * + ? [ ] ( )`) have regex meaning. UI may need to escape for literal matching. |
| What error response schema to use? | **Backend GlobalExceptionHandler output**: `{message, status, timestamp, error, errors?}` |
| For field counts: N+1 or first-class API? | **First-class API**: `GET /catalog/contexts?includeCounts=true` |
| What constitutes "null" in XML? | **Not applicable** - standard XML has no null concept; `hasNull` is effectively always false unless `xsi:nil="true"` is present |
| Deployment model? | **Separate-origin** - CORS configured for Vite dev server (localhost:5173), production config separate |

---

## LLM Review Questions - Addressed

| Question | Decision |
|----------|----------|
| Autocomplete debounce timing? | **300ms** - balances responsiveness with API efficiency. Defined in `config.ts`. |
| Export large result sets? | **Client-side only** - exports only what's loaded (up to `MAX_RESULTS_PER_PAGE`). No server-side bulk export. |
| Keyboard navigation scope? | **Both** - arrow keys work in results table AND autocomplete dropdowns. Enter selects suggestion. |
| Detail panel animation timing? | **100ms** - instant feel, no perceptible delay. Defined in `config.ts`. |
