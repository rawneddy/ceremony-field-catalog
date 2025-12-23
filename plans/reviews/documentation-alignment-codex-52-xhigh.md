# Documentation Alignment Plan (LLM-First)

This plan defines an LLM-first documentation target state and a migration path from the repo’s current `.md` set to a coherent, low-context-waste structure. The codebase (`src/`, `ui/src/`, `sdks/`, `tests/`, config) is the source of truth; documentation must be continuously verified against it.

## 1. Target State

### 1.1 Current Inventory (Baseline) — All Markdown in Repo

Notes:
- Inventory includes authored/project docs and plans in the repo; it intentionally excludes vendor/build/cache directories (`node_modules/`, `target/`, `.venv/`, `.pytest_cache/`, etc.) because they are not maintained documentation.
- Token estimates are rough: `~bytes/4`.

| Path | ~Tokens | Current Purpose | Drift / Issues vs Code | Target Action |
|------|--------:|-----------------|------------------------|---------------|
| `AGENTS.md` | 850 | Repo guidelines + commands + UI routes | Mentions `docs/MONGODB_PERFORMANCE.md` (missing). States Java 21 while `pom.xml` targets Java 17. | Keep as router; rewrite for LLM routing; remove/replace missing refs; align Java policy. |
| `CLAUDE.md` | 2,217 | Claude-specific guidance + architecture summary | Doc tree references `docs/ui/REQUIREMENTS.md` + `docs/ui/IMPLEMENTATION.md` (don’t exist; UI plans live in `plans/releases/01/`). Overlaps heavily with `AGENTS.md`/`GEMINI.md`. | Keep as router; make identical to `AGENTS.md` (and optionally `GEMINI.md`) to prevent drift. |
| `GEMINI.md` | 973 | Gemini-oriented project overview | Overlaps with `AGENTS.md`/`CLAUDE.md`; version claims can drift (currently Spring Boot 3.4.1 matches `pom.xml`, but Java requirement messaging conflicts with `pom.xml`). | Option A: delete. Option B: keep but generate/maintain identical router content. |
| `README.md` | 1,444 | Human quickstart + endpoint summary | Ambiguity: default DB name differs by profile (`application.yml` defaults `dev`, which uses `ceremony_catalog_dev` unless `MONGODB_URI` is set). Mentions endpoints but omits `/catalog/suggest`. | Keep as “human quickstart”; tighten to exact runtime behavior; keep short; link to task docs. |
| `TODO.md` | 727 | Backlog and known issues | Mixes backend/UI work; some items already resolved, others still relevant (e.g., contextId normalization for path params). | Keep as backlog; add “how to verify” links to task docs after refactor. |
| `docs/ARCHITECTURE.md` | 6,704 | Deep architecture + data model + deployment guidance | Some claims diverge: context delete described as deactivation (actual `ContextService.deleteContext` deletes context + entries); deployment diagram/sample compose doesn’t match `docker-compose.yml`; mentions `/actuator/*` but Actuator dependency isn’t in `pom.xml`. | Split into smaller reference docs; update to match code; move deployment/ops bits into ops doc. |
| `docs/api/API_SPECIFICATION.md` | 4,651 | Markdown API reference | Key drift: states “when `q` provided other filters ignored” (actual global search still ANDs `contextId`/`metadata`/`fieldPathContains`). Mentions `SPRING_DATA_MONGODB_URI` but code uses `MONGODB_URI`. | Replace with “API guide” + rely on OpenAPI for exhaustive reference; fix semantics and env vars. |
| `docs/api/TESTING.md` | 1,130 | Backend testing guide | Largely aligned with `src/test/java/...` structure. | Keep; possibly merge into unified testing doc (backend+frontend+sdk). |
| `docs/sdk/README.md` | 2,079 | SDK overview | Incorrect Python path reference (`sdks/python/...` is real). Claims Python SDK is “test only,” but code is written as a usable SDK; intent needs clarification. | Move SDK docs next to SDK code (`sdks/python/README.md`, `sdks/dotnet/net48/README.md`); keep a short index doc under `docs/`. |
| `docs/samples/README.md` | 783 | Sample XML set + expected parsing | Aligned with `ui/src/utils/xmlParser.ts` (leaf extraction, `xsi:nil`, empty semantics). | Keep; tighten to match parser exactly; link from upload/parser docs. |
| `docs/ui/planning/DECISIONS.md` | 830 | UI pre-implementation decisions | References `REQUIREMENTS.md` as if in docs; in repo it’s `plans/releases/01/REQUIREMENTS.md`. Several decisions are now “historical”; keep as ADR/history. | Convert to ADR(s) or move to `docs/history/ui/`; remove “implemented ✅” claims unless verified continuously. |
| `docs/ui/planning/ROADMAP.md` | 1,733 | UI future enhancements | Good as product/UX roadmap, but references `REQUIREMENTS.md` location incorrectly. | Move under `docs/product/` or `docs/history/ui/`; keep out of main router. |∏
| `docs/MOTIVATION.md` | 2,403 | Business justification (“why”) | Narrative; mostly independent of code. | Keep under `docs/product/` as a product doc; reduce length if needed. |
| `docs/VISION.md` | 2,204 | Narrative of desired UX impact | Narrative; contains UI behavior assumptions that can drift. | Keep under `docs/product/`; ensure clearly labeled as aspirational if not fully implemented. |
| `docs/COMPLETED.md` | 2,671 | Changelog + future plans + patterns | Mixes “completed” and “planned”; includes claims about Actuator/OpenAPI paths that can drift. | Move to `docs/history/`; consider replacing with a real `CHANGELOG.md` or rely on git history. |
| `docs/req_alignment.md` | 4,695 | One-time “plan vs actual” comparison | Contains outdated route/file names relative to current `ui/src/pages/*`; valuable as historical artifact only. | Move to `docs/history/` (date-stamped), remove from main routing. |
| `docs/reviews/*` | 1,792–6,381 | LLM-generated project reviews | Not authoritative; some references to old filenames. | Keep in `docs/history/reviews/`; add an index + disclaimer. |
| `plans/releases/01/REQUIREMENTS.md` | 3,426 | UI requirements plan | Not guaranteed to match implementation; cross-referenced by `docs/req_alignment.md`. | Keep as planning artifact; do not route LLMs here unless explicitly working on requirements. |
| `plans/releases/01/IMPLEMENTATION.md` | 12,414 | UI implementation plan | Very large; high context cost; partially outdated by design. | Keep as planning artifact; extract a small “current UI architecture” doc for day-to-day work. |
| `plans/field-value-capture.md` | 8,918 | Future feature design | Not implemented in code; should not be treated as current behavior. | Keep; label clearly as future plan; do not include in “how the system works today.” |
| `plans/prompts/01-documentation-review.md` | 1,996 | Prompt/spec for this work | Meta; not product/system doc. | Keep; optional move to `plans/prompts/` only (no routing). |
| `ui/README.md` | 639 | Default Vite template | Not specific to this repo; duplicates root docs poorly. | Replace with repo-specific UI doc (or remove). |

### 1.2 Current Inventory — Related (Non-Markdown) Documentation

| Path | ~Tokens | Purpose | Target Action |
|------|--------:|---------|---------------|
| `tests/CatalogSmokeTests.http` | 1,482 | Manual API smoke tests (VS Code REST Client) | Keep; treat as executable documentation; ensure examples stay aligned with OpenAPI + controllers. |
| `docs/samples/*.xml` | (varies) | Sample data for UI parser/upload | Keep; add provenance note and ensure no sensitive data. |
| `review_prompt.json` | ~1,600 | Meta prompt for codebase review generation | Keep under history/tooling; exclude from primary routing. |
| `docker-compose.yml`, `Dockerfile`, `src/main/resources/*.yml` | n/a | Operational configuration | Treat as source of truth; docs should summarize and link, not duplicate. |

### 1.3 Target Documentation Inventory (Proposed)

Target goals:
- **Few “primary” docs** that cover common tasks end-to-end (LLMs rarely need >1 doc per task).
- **Reference docs** exist, but routers only point to them when needed.
- **History/planning** remains available but is not treated as current behavior.

#### Primary (Routed) Docs

| Path | Token Budget | Responsibilities (No Overlap) | Load When |
|------|-------------:|--------------------------------|----------|
| `AGENTS.md` | ≤ 450 | LLM router + commands + “what doc to read for what task”; no deep design prose | Always first for coding tasks |
| `CLAUDE.md` | ≤ 450 | Same content as `AGENTS.md` (byte-identical) | Same as above (agent-specific entrypoints) |
| `README.md` | 600–900 | Human quickstart + minimal system description + pointers to routed docs | New clone; “how do I run this” |
| `docs/how-to/search.md` | 900–1,400 | **Search + suggest** semantics end-to-end (API+UI): `q`, `fieldPathContains`, `useRegex`, `metadata.*`, active-context filtering, pagination; include code pointers | Changing search, filters, autocomplete, discovery behavior |
| `docs/how-to/contexts.md` | 900–1,400 | Context lifecycle (create/update/delete), required-metadata immutability, `metadataRules` extraction, UI manage contexts flow; include code pointers | Changing context schema, metadata rules, or context UI |
| `docs/how-to/observations.md` | 1,000–1,600 | Observation ingestion end-to-end: SDK/UI parsing semantics → `POST /observations` → merge algorithm → min/max/null/empty/timestamps → cleanup; include code pointers | Changing merge logic, upload parsing, or SDK behavior |
| `docs/how-to/schema-export.md` | 900–1,400 | UI schema export pipeline (XSD/JSON Schema), policy knobs, tests location, known limitations | Changing export formats, policy, validation |
| `docs/how-to/testing.md` | 900–1,200 | One place to run backend/UI/sdk tests + where to add new tests; minimal duplication | Adding/changing behavior and validating |
| `docs/reference/glossary.md` | ≤ 700 | Canonical terminology, naming, and contracts; short + stable | When terminology confusion appears |

#### Secondary (Unrouted Unless Asked) Reference Docs

| Path | Token Budget | Responsibilities | Load When |
|------|-------------:|------------------|----------|
| `docs/reference/backend.md` | 1,200–2,000 | Backend layering + key classes + Mongo collections/indexes + configuration map; no step-by-step tasks | Deep backend refactor or onboarding |
| `docs/reference/frontend.md` | 1,200–2,000 | UI architecture (pages, hooks, services, component groupings) + conventions | Deep UI refactor |
| `docs/reference/api.md` | 800–1,200 | “API guide” that points to OpenAPI as the contract; does not duplicate every field | When discussing API at a higher level |
| `docs/reference/configuration.md` | 800–1,200 | Profiles, env vars (canonical list), Docker compose, CORS property | Ops changes or debugging runtime config |
| `docs/product/motivation.md` | 800–1,200 | Why this exists | Product context |
| `docs/product/vision.md` | 800–1,200 | Desired outcomes/UX; explicitly aspirational if needed | Product context |

#### Co-located SDK Docs (Prefer Proximity)

| Path | Token Budget | Responsibilities | Load When |
|------|-------------:|------------------|----------|
| `sdks/python/README.md` | 800–1,200 | Install, usage, tests, API compatibility, parsing semantics (Python) | Working on Python SDK |
| `sdks/dotnet/net48/README.md` | 800–1,200 | Integration pattern, threading/queue model, config knobs, API compatibility (.NET) | Working on .NET SDK |
| `docs/reference/sdks.md` | ≤ 700 | Index of SDKs + contracts shared across SDKs | Finding the right SDK doc |

#### History / Planning (Explicitly Non-Authoritative)

| Path | Purpose | Rule |
|------|---------|------|
| `docs/history/reviews/*` | LLM-generated reviews | Keep, but never route as “truth” |
| `docs/history/req_alignment_YYYYMMDD.md` | One-time comparisons | Keep as artifact |
| `docs/history/completed-work.md` | Historical “completed” notes | Replace with changelog or archive |
| `plans/**` | Plans and prompts | Never describe current runtime behavior |

### 1.4 Clear Boundaries (How We Avoid Overlap)

Rules:
1. **Router docs (`AGENTS.md`/`CLAUDE.md`) never explain design** beyond a 3–6 line summary and pointers.
2. **How-to docs are task-complete** (API + UI + SDK where relevant) and include concrete file pointers.
3. **Reference docs explain structure; they do not contain “do X by editing Y” checklists.**
4. **History and plans are opt-in** and must be labeled “may be outdated / not current behavior.”

Enforcement mechanism:
- Every primary doc starts with: **Purpose**, **Use this when**, **Do not use this when**, **Keywords**.

### 1.5 LLM Efficiency Analysis (Token Budgets + Load Strategy)

Target sizes:
- Routing docs: ≤ 450 tokens (fast orientation).
- How-to docs: 900–1,600 tokens (one-doc-per-task).
- Reference docs: 1,200–2,000 tokens (loaded only on deep work).
- History/plans: uncapped, but never routed.

Common LLM tasks → minimal-doc route:
- “Fix search behavior / autocomplete / regex”: `AGENTS.md` → `docs/how-to/search.md`
- “Change contexts / metadata rules / context UI”: `AGENTS.md` → `docs/how-to/contexts.md`
- “Change merge / null/empty semantics / upload parsing / SDK behavior”: `AGENTS.md` → `docs/how-to/observations.md`
- “Change schema export”: `AGENTS.md` → `docs/how-to/schema-export.md`
- “Where are tests / how to validate”: `AGENTS.md` → `docs/how-to/testing.md`

Why this is optimal here:
- The system has **three coupled surfaces** (API, UI, SDKs). Task docs must span boundaries to keep LLMs from loading multiple area docs.
- The backend’s most “surprising” behavior is search semantics (global search + scoped filters + regex escaping). That deserves a single authoritative how-to doc.
- The UI contains non-trivial domain logic (schema generation + upload parsing). Documenting those as task guides prevents repeatedly re-deriving intent from code.

---

## 2. LLM Navigation Design

### 2.1 Router Files: `CLAUDE.md` and `AGENTS.md`

Recommendation: **Make them byte-identical** and treat them as the single routing document replicated across agent ecosystems.

Why identical:
- Prevent drift (one change updates both).
- No extra context cost (LLM reads one and is done).

If `GEMINI.md` must remain, apply the same rule (identical router content) or delete it to reduce maintenance.

### 2.2 Router Structure (Template)

Top of file (first ~40 lines):
1. **One-sentence system summary**
2. **Task routing table**: “If you want X → read Y”
3. **Commands**: run/test/build (backend + ui + sdks)
4. **3–6 invariants** that frequently matter (case normalization, active-context filtering, metadata param format, etc.)

Example routing bullets (shape, not final content):
- Run locally: `README.md`
- Modify search/suggest (API + UI): `docs/how-to/search.md`
- Modify contexts/metadata rules: `docs/how-to/contexts.md`
- Modify observation merge / upload parsing / SDK: `docs/how-to/observations.md`
- Modify schema export (XSD/JSON Schema): `docs/how-to/schema-export.md`
- Testing: `docs/how-to/testing.md`
- Terminology: `docs/reference/glossary.md`

### 2.3 Document Signals for LLMs

Add a short header block to every doc (including legacy/history docs):
- **Purpose:** what questions this doc answers
- **Use this when:** 3–6 common prompts
- **Do not use this when:** 2–4 “wrong doc” prompts with links
- **Keywords:** a comma-separated list for quick matching
- **Source of truth:** “code paths” section listing the authoritative files

### 2.4 Duplication vs Reference Rules

Duplicate (small, stable, high-value):
- The 5–10 core invariants (lowercasing, field identity inputs, query param conventions).
- The canonical endpoint list (paths only, not full schemas).

Reference (avoid duplication):
- Full request/response schemas (use OpenAPI annotations and Swagger UI).
- Full UI component inventories (keep in `docs/reference/frontend.md`).
- Large future plans and reviews.

---

## 3. Pre-Refactor Optimizations (Before Documentation Refactor)

These changes reduce ambiguity so the docs can draw clean lines from “user task” → “system behavior.”

### P0 (Do before rewriting docs)

1. **Decide the Java version policy and align repo signals**
   - Current: `pom.xml` targets Java 17, Docker images use Java 21, docs claim Java 21.
   - Choose: “runtime JRE 21, source/target 17” (document it) **or** upgrade build target to 21 (update `pom.xml` + CI + docs).

2. **Standardize MongoDB connection env var naming**
   - Current config uses `MONGODB_URI` (not `SPRING_DATA_MONGODB_URI`).
   - Choose canonical name; ideally also support the Spring-native env var for familiarity.

3. **Clarify search semantics in code comments and DTO docs**
   - Code supports global `q` AND scoped filters (`contextId`, `metadata.*`, `fieldPathContains`) together.
   - Update misleading comments (e.g., `CatalogSearchCriteria` docstring) so docs can mirror code without caveats.

4. **Normalize `contextId` path variables in context CRUD**
   - `ContextService.createContext` normalizes, but `GET/PUT/DELETE /catalog/contexts/{contextId}` are case-sensitive.
   - Implement consistent normalization and add controller-level tests.

### P1 (Strongly recommended to avoid doc drift)

5. **Make error responses a real type**
   - Current `GlobalExceptionHandler` returns `Map<String,Object>` while `ErrorResponse` exists.
   - Return `ErrorResponse` everywhere for consistent OpenAPI + SDK typing.

6. **Actuator/metrics decision**
   - Config files reference management endpoints, but Actuator isn’t a dependency.
   - Either add Actuator (and document it) or remove/ignore management config to avoid false documentation.

7. **Deprecate ambiguous query param styles**
   - Search supports both `productCode=DDA` and `metadata.productCode=DDA`.
   - Prefer one convention (`metadata.*`) and document; optionally keep the other as backward-compatible but not advertised.

---

## 4. Migration Plan (Current → Target State)

1. **Freeze “routing” first**
   - Make `AGENTS.md` + `CLAUDE.md` identical.
   - Add the routing table that points only to primary docs.

2. **Create the target doc skeleton**
   - Create `docs/how-to/` and `docs/reference/` and `docs/product/` and `docs/history/`.
   - Add the standard header block to each new doc.

3. **Migrate content by intent (not by folder)**
   - Extract current-behavior content from `docs/api/API_SPECIFICATION.md` → `docs/how-to/search.md` + `docs/reference/api.md`.
   - Extract current-behavior content from `docs/ARCHITECTURE.md` → `docs/reference/backend.md` (and remove/relocate outdated deployment sections).
   - Replace `ui/README.md` with a repo-specific UI doc (or delete and link from root docs).
   - Move historical docs: `docs/COMPLETED.md` → `docs/history/completed-work.md`, `docs/req_alignment.md` → `docs/history/req_alignment_20251219.md`, keep `docs/reviews/` but relocate under `docs/history/reviews/`.

4. **Co-locate SDK docs**
   - Create `sdks/python/README.md` and `sdks/dotnet/net48/README.md`.
   - Reduce `docs/sdk/README.md` to an index or move to `docs/reference/sdks.md`.

5. **Align with code as you migrate**
   - Update env var names, endpoint semantics, and defaults to match `src/main/resources/*.yml` and controllers/services.
   - Use tests (`src/test/java/...`, `ui/src/lib/schema/__tests__/...`) as specification for semantics.

6. **Add doc-quality gates (lightweight)**
   - CI check that `AGENTS.md` and `CLAUDE.md` are identical (`diff`).
   - Link check for internal markdown links.
   - Optional: a small script that flags docs exceeding token budgets.

7. **Remove or clearly label non-authoritative docs**
   - Add a banner at top of all history/plans: “Not the source of truth for current behavior.”
   - Ensure routers never point to these.

---

## 5. Discovery & Navigation (Human Personas)

### Primary: LLM Assistants
- Entry: `AGENTS.md` (or `CLAUDE.md`)
- Path by task:
  - Search/autocomplete: `docs/how-to/search.md`
  - Contexts/metadata rules: `docs/how-to/contexts.md`
  - Merge/upload/SDK: `docs/how-to/observations.md`
  - Schema export: `docs/how-to/schema-export.md`
  - Testing: `docs/how-to/testing.md`
  - Terminology: `docs/reference/glossary.md`

### Engineering Team (Backend/Frontend/DB)
- Entry: `README.md` for running; then task docs above.
- Deep dives: `docs/reference/backend.md`, `docs/reference/frontend.md`, `docs/reference/configuration.md`.

### Product Owner
- Entry: `docs/product/motivation.md`
- Next: `docs/product/vision.md`
- Optional: a short “current capabilities” section in `README.md` (not a full roadmap).

### Architect
- Entry: `docs/reference/backend.md` (data model, identity algorithm, indexing)
- Next: `docs/how-to/search.md` (query semantics) and `docs/reference/configuration.md` (deployment knobs)

### GitHub User (First-time clone)
- Entry: `README.md`
- Next: `AGENTS.md` only if they’re modifying code.

### Operations/DevOps
- Entry: `docs/reference/configuration.md`
- Next: `docker-compose.yml`, `Dockerfile`, `src/main/resources/application-*.yml`

---

## 6. Maintenance Strategy

### 6.1 Ownership Model

- **Routers (`AGENTS.md`, `CLAUDE.md`)**: owned by maintainers; must be updated when any primary doc path changes.
- **How-to docs**: owned by the code owners of the corresponding surface area (backend/UI/SDK).
- **Reference docs**: owned by the same, but updated less frequently.
- **History/plans**: no owner; never treated as current behavior.

### 6.2 Update Triggers (Keep Docs Current)

| Change Type (Code) | Must Update |
|--------------------|------------|
| Controller/DTO changes in `src/main/java/com/ceremony/catalog/api/**` | `docs/reference/api.md` and relevant how-to doc |
| Search/suggest changes (`CatalogSearchRequest`, resolver, custom repo) | `docs/how-to/search.md` |
| Context behavior changes (immutability, rules) | `docs/how-to/contexts.md` |
| Merge algorithm changes (`CatalogService.merge`) | `docs/how-to/observations.md` |
| UI flow changes (pages/hooks/services) | relevant how-to doc + `docs/reference/frontend.md` if structural |
| SDK parsing/transport changes | SDK README(s) + `docs/how-to/observations.md` |
| Config key/env var changes | `docs/reference/configuration.md` + routers if commands change |

### 6.3 Documentation Testing / Verification

Minimum viable:
- `diff AGENTS.md CLAUDE.md` must be empty.
- Link integrity: no broken repo-relative links.
- Smoke doc validity: `tests/CatalogSmokeTests.http` endpoints still exist.

Stronger (optional):
- Generate OpenAPI JSON in CI and compare against committed snapshot (if snapshot is adopted).
- Token budget check per doc (warn, don’t fail initially).
- “Docs examples compile”: keep runnable examples as `.http` and small scripts rather than inline prose.

---

## 7. Terminology Alignment

### 7.1 Inconsistencies to Fix

| Topic | Current Variants | Canonical Recommendation |
|-------|------------------|--------------------------|
| Field path naming | “XPath”, “fieldPath”, “path” | **Field path** (`fieldPath`) — XPath-like; include attributes as `/.../@attr` |
| Null/empty flags | `hasNull`/`hasEmpty` (input), `allowsNull`/`allowsEmpty` (stored) | Use **has*** for observation DTOs, **allows*** for catalog entries; document mapping |
| Search terminology | “global search”, “discovery”, `q` | Use **Discovery (q)** for cross-field search; **Filter search** for structured filters; document that discovery can be scoped by filters |
| Metadata filter params | `productCode=...` vs `metadata.productCode=...` | Prefer **`metadata.<key>`** in docs; treat bare params as backward-compatible |
| Mongo env var | `MONGODB_URI` vs `SPRING_DATA_MONGODB_URI` | Pick one canonical; document both if supported |
| Context deletion | “deactivate” vs “delete” | Use **delete** (current behavior: removes context + entries) unless code changes |

### 7.2 Canonical Glossary (Outline)

Recommended `docs/reference/glossary.md` entries:
- Context, contextId
- Required metadata, optional metadata
- Metadata extraction rules (`metadataRules`)
- Catalog entry (`CatalogEntry`)
- Observation (`CatalogObservationDTO`)
- Field identity (`FieldKey`)
- Field path (`fieldPath`)
- Discovery search (`q`) vs filter search
- Suggest endpoint (`/catalog/suggest`) + `field=discovery|fieldPath|metadata.*`
- Active context filtering

---

## 8. Gap Analysis

### Missing or Insufficient Today

1. **Single-source “how search really works” doc**
   - Needs to explain: discovery `q` + AND scoping filters, regex escaping rules, multi-value metadata OR, active context filtering, and suggest behavior.

2. **Single-source “how observations become stats” doc**
   - Needs to explain: parsing semantics (UI + SDK), merge algorithm, timestamps, single-context cleanup, and how optional metadata is stored but not part of identity.

3. **Context rules doc**
   - Needs to explain: required metadata immutability, why PUT requires `requiredMetadata`, metadataRules validation + XPath normalization, and delete behavior.

4. **Schema export doc**
   - The UI has non-trivial schema generation code + tests; there’s no authoritative documentation of outputs, policy knobs, or limitations.

5. **SDK docs colocated with SDK code**
   - Current doc has path drift and unclear intent around Python SDK usage.

6. **Configuration/ops doc aligned with actual env vars and profiles**
   - Need explicit canonical list of env vars and profile defaults; current docs conflict on DB name and env var names.

### Exists but Should Be Repositioned

- `docs/COMPLETED.md`, `docs/req_alignment.md`, `docs/reviews/*`: keep as history, not routed.
- `plans/**`: treat as planning, not “how it works.”

