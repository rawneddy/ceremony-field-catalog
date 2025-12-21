# Documentation Alignment Plan - Ceremony Field Catalog

## 1. Target State

The target state for the Ceremony Field Catalog documentation is an **LLM-optimized, human-friendly, and zero-redundancy** ecosystem. The goal is to minimize the amount of context an LLM must load for any given task while ensuring human stakeholders have clear, logical entry points.

### Complete File Inventory

| Path | Responsible For | LLM Signal (Header) | Estimated Tokens |
|------|-----------------|---------------------|------------------|
| `README.md` | Human-centric quick start, project purpose, and high-level status. | "Start here for project orientation and local setup." | 800 |
| `CLAUDE.md` / `AGENTS.md` | **Identical** routing documents for LLMs. Task-to-doc mapping. | "Primary routing for LLM assistants. Task-based directory." | 400 |
| `docs/SYSTEM.md` | High-level system design, business context, and core concepts (Motivation + Vision + High-level Arch). | "Understand *why* the system exists and *what* it does at a high level." | 1500 |
| `docs/ARCHITECTURE.md` | Deep technical dive: Data model, Field Identity Algorithm, MongoDB indexing, Component interactions. | "Technical implementation details, data schemas, and internal algorithms." | 2500 |
| `docs/DEVELOPMENT.md` | Unified development guide: Build, Test, Standards, UI patterns, Backend patterns. | "How to build, test, and contribute to the code." | 2000 |
| `docs/API_REFERENCE.md` | (Consolidated `docs/api/*`) REST API contracts, DTOs, and error codes. | "Complete REST API reference and endpoint documentation." | 1500 |
| `docs/SDK_GUIDE.md` | (Consolidated `docs/sdk/*`) Usage of .NET and Python SDKs, design principles. | "Integrating with the catalog via SDKs (.NET/Python)." | 1200 |
| `docs/GLOSSARY.md` | Canonical terminology mapping code symbols to business concepts. | "Definitions of core domain terms used across code and docs." | 500 |
| `docs/UI_GUIDE.md` | Frontend architecture, state management, component library, and theaming. | "Detailed documentation for the React/TypeScript UI." | 1500 |

### Clear Boundaries
- **No overlapping Quick Starts**: All installation/run commands live in `README.md` (short) and `docs/DEVELOPMENT.md` (detailed).
- **Separation of "Why" and "How"**: `SYSTEM.md` answers "Why", `ARCHITECTURE.md` answers "How it's built", `DEVELOPMENT.md` answers "How to change it".
- **Identical Routers**: `CLAUDE.md` and `AGENTS.md` are kept identical to ensure any agent entry point provides the same optimal routing.

---

## 2. LLM Navigation Design

### Routing Strategy
`CLAUDE.md` and `AGENTS.md` will be structured as **Task-Based Routers**. Instead of listing features, they will list common LLM tasks and point to the specific document or directory needed.

**Example Structure for Routers:**
- **"I need to fix a bug in the API search logic"** → Load `docs/ARCHITECTURE.md` (query logic) and `docs/DEVELOPMENT.md` (testing patterns).
- **"I need to add a feature to the UI"** → Load `docs/UI_GUIDE.md` and `docs/DEVELOPMENT.md` (standards).
- **"I need to understand the data model"** → Load `docs/ARCHITECTURE.md`.

### Minimizing Context Waste
- Every document will start with a **Metadata Header**:
  ```markdown
  # [Document Title]
  **Scope**: [Brief description of what is covered]
  **Questions Answered**: [Bulleted list of 3-5 key questions]
  **Related Docs**: [Links to dependencies]
  ```
- This allows the LLM to read the first 10 lines of a file and decide if it needs to continue reading, or if it can discard it.

---

## 3. Pre-Refactor Optimizations

Before refactoring the documentation, the following codebase alignments are recommended:

1.  **Standardize Symbol Naming**:
    - Ensure `CatalogEntry` is the term used in persistence, but `Observation` is used for incoming data.
    - Resolve the "Field" vs "Observation" vs "Entry" ambiguity in the UI.
2.  **Move UI Planning to Docs**:
    - Relocate active requirements from `plans/releases/01/` to `docs/ui/`.
    - Retain `plans/` only for historical record or very short-term active work.
3.  **Consolidate configuration**:
    - Ensure `application.yml` and UI `config.ts` comments are descriptive enough to serve as micro-context for LLMs.

---

## 4. Migration Plan

1.  **Phase 1: Foundation (Cleanup)**
    - Create `docs/GLOSSARY.md`.
    - Create `docs/SYSTEM.md` by merging `MOTIVATION.md`, `VISION.md`, and the intro of `ARCHITECTURE.md`.
    - Delete `GEMINI.md` (redundant).

2.  **Phase 2: Consolidate Technical Docs**
    - Merge `docs/api/API_SPECIFICATION.md` and `docs/api/TESTING.md` into `docs/API_REFERENCE.md` and `docs/DEVELOPMENT.md` respectively.
    - Create `docs/DEVELOPMENT.md` by pulling build/test commands from `README.md`, `CLAUDE.md`, and `AGENTS.md`.

3.  **Phase 3: Router Implementation**
    - Rewrite `CLAUDE.md` as the task-based router.
    - Copy `CLAUDE.md` to `AGENTS.md`.
    - Update `README.md` to be the "Human Entry Point" (clean, visually appealing).

4.  **Phase 4: Cleanup**
    - Remove old files in `docs/` and `plans/` that have been consolidated.
    - Update all internal links.

---

## 5. Discovery & Navigation (Human Personas)

| Persona | Entry Point | Path |
|---------|-------------|------|
| **New Developer** | `README.md` | `README.md` → `docs/DEVELOPMENT.md` → `docs/SYSTEM.md` |
| **Architect** | `docs/SYSTEM.md` | `docs/SYSTEM.md` → `docs/ARCHITECTURE.md` |
| **Product Owner** | `docs/SYSTEM.md` | `docs/SYSTEM.md` → `docs/GLOSSARY.md` |
| **Security Lead** | `docs/ARCHITECTURE.md` | Search for "Security" section in Architecture and API Reference. |

---

## 6. Maintenance Strategy

- **Owner**: The engineering team (and their LLM assistants).
- **Update Triggers**:
    - **API Change**: Update `docs/API_REFERENCE.md`.
    - **New Core Concept**: Update `docs/GLOSSARY.md`.
    - **Dependency/Build Change**: Update `docs/DEVELOPMENT.md`.
- **Process**: LLMs should be instructed to check the relevant doc *after* making a code change and suggest documentation updates in the same PR.

---

## 7. Terminology Alignment

| Code Symbol | Documentation Term | Definition |
|-------------|-------------------|------------|
| `Context` | Business Context | A logical container for field observations (e.g., "Deposits"). |
| `CatalogEntry` | Field Entry | The persisted record of a unique field path within a context. |
| `Observation` | Field Observation | A single telemetry event reporting the existence of a field in an XML document. |
| `fieldPath` | XPath | The path to the XML element or attribute. |
| `requiredMetadata` | Identity Metadata | Metadata fields that contribute to the unique identity of a field. |

---

## 8. Gap Analysis

- **Missing**: A dedicated "Troubleshooting" section (proposed for `docs/DEVELOPMENT.md`).
- **Missing**: "Deployment Guide" for production (proposed for `docs/SYSTEM.md` or a new `docs/OPERATIONS.md` if complex).
- **Insufficient**: UI documentation is currently scattered across implementation plans. A dedicated `docs/UI_GUIDE.md` is needed.
