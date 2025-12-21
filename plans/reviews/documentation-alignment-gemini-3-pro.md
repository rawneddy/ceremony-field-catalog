# Ceremony Field Catalog: Documentation Alignment Plan

**Author**: Gemini
**Date**: December 20, 2025
**Scope**: Comprehensive documentation restructuring plan prioritizing LLM efficiency and context management.

---

## 1. Target State

### File Inventory & Responsibilities

The target state establishes a strict separation between **Routing** (finding information) and **Reference** (consuming information).

#### Root Directory (Routing & Quick Start)
- `README.md`: **Human Entry Point**. Minimal quick-start for cloning and running.
- `CLAUDE.md`: **LLM Entry Point**. Unified routing document. Points LLMs to specific task docs.
- `AGENTS.md`: **Identical to CLAUDE.md**. Ensures consistent behavior across different agent CLIs.

#### `docs/DOMAIN/` (Conceptual Layer)
- `MOTIVATION.md`: **Why**. Business context, legacy system challenges.
- `VISION.md`: **What/Future**. User experience goals and transformation.
- `GLOSSARY.md`: **Terminology**. Canonical definitions of "Context", "Field Identity", etc.

#### `docs/TECHNICAL/` (Implementation Layer)
- `ARCHITECTURE.md`: **System Design**. Components, data model, field identity logic.
- `API_SPECIFICATION.md`: **Interface**. REST endpoints, contracts, error codes.
- `DEVELOPMENT.md`: **Workflow**. Local setup, commands, configuration, conventions.
- `CONFIGURATION.md`: **Env Vars**. Comprehensive reference of `application.yml` and env overrides.

#### `docs/TESTING/` (Quality Layer)
- `TESTING.md`: **Patterns**. How to write/run tests, base classes (Testcontainers).
- `QUALITY_GATES.md`: **Standards**. TypeScript strictness, linting rules, pre-commit checks.

#### `docs/SDK/` (Integration Layer)
- `README.md`: **Client Libs**. Patterns for legacy system integration (Fire-and-forget).

#### `docs/UI/` (Frontend Layer)
- `ARCHITECTURE.md`: **Component Design**. React structure, hooks, state management.
- `DECISIONS.md`: **Trade-offs**. Why specific libraries or patterns were chosen.
- `ROADMAP.md`: **UI Future**. Planned features and enhancements.

#### `plans/` (Project Management)
- `BACKLOG.md`: **Priorities**. Consolidated active tasks, known issues, and recent completions.

### LLM Efficiency Analysis

**Current State**: An LLM often loads `CLAUDE.md` (1.1k lines), `ARCHITECTURE.md` (470 lines), and `API_SPECIFICATION.md` (650 lines) just to find where to start. **Total Context Cost: ~4,000+ tokens.**

**Target State**:
1. **Router Load**: LLM loads `CLAUDE.md` (~500 tokens).
2. **Decision**: LLM identifies "I need the API endpoint for submitting data".
3. **Target Load**: LLM loads `docs/TECHNICAL/API_SPECIFICATION.md` (~1,600 tokens).
**Total Context Cost: ~2,100 tokens.**

**Reasoning**:
- **Decomposition**: Breaking large docs into functional units allows "lazy loading" of context.
- **Explicit Routing**: `CLAUDE.md` acts as a lookup table, preventing "context wandering".
- **Single Source**: No duplicate info means no risk of conflicting instructions.

---

## 2. LLM Navigation Design

### Unified Routing Strategy

`CLAUDE.md` and `AGENTS.md` will be **functionally identical** to serve as universal LLM routers. Diverging them creates maintenance debt and inconsistent agent behavior.

**Structure**:
1. **System Summary** (100 words): High-level "what is this".
2. **Task-Based Routing Table**:
   - "Understanding Domain" -> `docs/DOMAIN/*`
   - "Building Backend" -> `docs/TECHNICAL/*`
   - "Building Frontend" -> `docs/UI/*`
   - "Running Tests" -> `docs/TESTING/*`
3. **Essential Commands**: The most frequent 5-10 commands (build, test, run).
4. **Agent-Specific Notes** (Optional footer): Small section for tool-specific quirks (e.g., "For Gemini: use this format...").

### Signal Keywords
To ensure correct document selection, every document header will include a **Scope Declaration**:

```markdown
# Document Title

**Scope**: [What this doc covers]
**Intended Audience**: [Who should read this]
**Related Docs**:
- For [X], see [Link to Doc A]
- For [Y], see [Link to Doc B]
```

This explicit metadata allows LLMs to verify they have the right context *before* reading the whole file (or deciding to unload it).

---

## 3. Pre-Refactor Optimizations

Before moving files, we must fix existing inconsistencies to ensure the "Source of Truth" is actually true.

1.  **Java Version Alignment**:
    -   *Issue*: `pom.xml` specifies Java 17, but `Dockerfile` and `CLAUDE.md` specify Java 21.
    -   *Fix*: Standardize on **Java 21** (LTS) across `pom.xml`, `Dockerfile`, CI workflows, and docs.

2.  **Broken Document Links**:
    -   *Issue*: `AGENTS.md` references `docs/MONGODB_PERFORMANCE.md` which does not exist.
    -   *Fix*: Remove the reference or create a placeholder if the content is imminent.

3.  **Configuration Cleanup**:
    -   *Issue*: `TODO.md` claims a mismatch between `application.yml` (`max-xpath-length`) and code.
    -   *Verification*: `application.yml` actually uses `max-field-path-length`, which correctly matches `CatalogProperties`.
    -   *Fix*: Mark the TODO item as completed/invalid to remove confusion.

4.  **UI Route Definition**:
    -   *Issue*: Documentation refers to UI pages vaguely.
    -   *Fix*: Ensure `docs/UI/ARCHITECTURE.md` explicitly maps routes (from `App.tsx`) to Page Components.

---

## 4. Migration Plan

**Phase 1: Cleanup (Hours 0-2)**
1.  Update `pom.xml` to Java 21.
2.  Remove dead link in `AGENTS.md`.
3.  Update `TODO.md` to reflect reality of config binding.
4.  Create new directory structure (`docs/DOMAIN`, `docs/TECHNICAL`, etc.).

**Phase 2: Consolidation (Hours 2-4)**
1.  **Move & Rename**:
    -   `docs/MOTIVATION.md`, `docs/VISION.md` -> `docs/DOMAIN/`
    -   `docs/ARCHITECTURE.md`, `docs/api/API_SPECIFICATION.md` -> `docs/TECHNICAL/`
    -   `docs/api/TESTING.md` -> `docs/TESTING/`
    -   `docs/sdk/README.md` -> `docs/SDK/`
2.  **Extract & Create**:
    -   Extract setup/config info from `CLAUDE.md` -> `docs/TECHNICAL/DEVELOPMENT.md`.
    -   Create `docs/DOMAIN/GLOSSARY.md` (initial pass).
    -   Consolidate `TODO.md`, `COMPLETED.md`, and `plans/releases/01/*` -> `plans/BACKLOG.md`.

**Phase 3: Routing & headers (Hours 4-6)**
1.  Rewrite `CLAUDE.md` as the "Master Router".
2.  Copy `CLAUDE.md` content to `AGENTS.md`.
3.  Add **Scope Declaration** headers to ALL moved markdown files.

**Phase 4: Validation (Hours 6-7)**
1.  Run link validator (or manual check) to ensure all relative links in docs are updated to new paths.
2.  Verify `README.md` points correctly to the new `CLAUDE.md` as the advanced guide.

---

## 5. Discovery & Navigation (Human Personas)

| Persona | Entry Point | Path |
| :--- | :--- | :--- |
| **New Developer** | `README.md` | `README` (Quickstart) -> `docs/TECHNICAL/DEVELOPMENT.md` (Deep setup) |
| **Backend Dev** | `CLAUDE.md` | `CLAUDE` -> `docs/TECHNICAL/API_SPECIFICATION.md` (Contract) -> `docs/TECHNICAL/ARCHITECTURE.md` (Context) |
| **Frontend Dev** | `CLAUDE.md` | `CLAUDE` -> `docs/UI/ARCHITECTURE.md` -> `docs/UI/ROADMAP.md` |
| **Product Owner** | `CLAUDE.md` | `CLAUDE` -> `plans/BACKLOG.md` -> `docs/DOMAIN/VISION.md` |
| **DevOps** | `README.md` | `README` -> `docs/TECHNICAL/CONFIGURATION.md` (Env Vars) -> `docs/TECHNICAL/ARCHITECTURE.md` (Deployment) |

---

## 6. Maintenance Strategy

1.  **Source of Truth**: The **Code** is the ultimate truth. Docs are a map.
2.  **Update Triggers**:
    -   **CI Checks**: Add a step to CI to check for broken internal links in markdown files.
    -   **Definition of Done**: PRs affecting architecture MUST update `ARCHITECTURE.md`. PRs changing API MUST update `API_SPECIFICATION.md`.
3.  **Ownership**:
    -   Tech Lead: `CLAUDE.md`, `ARCHITECTURE.md`
    -   Product: `VISION.md`, `BACKLOG.md`
    -   Dev Team: `DEVELOPMENT.md`, `TESTING.md`

---

## 7. Terminology Alignment

A new `docs/DOMAIN/GLOSSARY.md` will standardize terms:

-   **Observation**: A raw data point submitted to the system (an instance).
-   **Catalog Entry**: The aggregated, stored record in the database.
-   **Context**: A business domain wrapper (e.g., "Deposits").
-   **Field Identity**: The hash derived from `Context ID + Required Metadata + Field Path`.
-   **Field Path**: The XPath-like string location (e.g., `/Document/Id`). (Prefer over "XPath" unless specifically discussing XML parsing).

---

## 8. Gap Analysis

| Missing / Insufficient | Impact | Action |
| :--- | :--- | :--- |
| **Glossary** | Terminology drift (Context vs Domain, Field vs Entry) | Create `docs/DOMAIN/GLOSSARY.md` |
| **Config Reference** | `application.yml` is the only source; no explanation of vars | Create `docs/TECHNICAL/CONFIGURATION.md` |
| **UI Architecture** | No high-level view of React components/hooks | Create `docs/UI/ARCHITECTURE.md` |
| **Quality Gates** | Linting/Type-checking rules are implicit in `package.json` | Create `docs/TESTING/QUALITY_GATES.md` |
| **Backlog** | Scattered across `TODO.md` and `plans/` | Consolidate to `plans/BACKLOG.md` |
| **Perf Doc** | Referenced `MONGODB_PERFORMANCE.md` is missing | Create basic `docs/TECHNICAL/PERFORMANCE.md` or remove link |

