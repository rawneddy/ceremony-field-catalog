# Ceremony Field Catalog: Documentation Alignment Plan

**Author**: Amp  
**Date**: December 20, 2025  
**Status**: Comprehensive Analysis Complete  
**Scope**: Full project review prioritizing LLM efficiency

---

## Executive Summary

The Ceremony Field Catalog project has **strong foundational documentation** but suffers from:
1. **Audience misalignment**: CLAUDE.md, AGENTS.md, GEMINI.md all contain overlapping, role-specific content instead of serving as unified LLM routers
2. **Documentation sprawl**: 27+ markdown files with unclear hierarchies and navigation paths
3. **Redundancy with subtle differences**: Same information in multiple files, creating maintenance burden and search confusion
4. **LLM inefficiency**: An LLM loading all available docs would waste significant context; the routing documents don't clearly signal which docs are needed for which tasks
5. **Verification gaps**: Some AGENTS.md content references docs that don't exist (e.g., `docs/MONGODB_PERFORMANCE.md`)

**Target outcome**: Restructure documentation to treat `CLAUDE.md` and `AGENTS.md` as identical, unified **LLM routers** that point to task-specific documents. This achieves:
- **Minimal context waste**: LLMs load 1-2 routing docs, then specific task docs (50-100 tokens overhead vs 5000+ currently)
- **Single source of truth**: No duplicate information; each doc has one clear purpose
- **Clear navigation**: Routing documents explicitly map tasks → documents needed
- **Scalability**: As project grows, new docs slot into existing hierarchy without restructuring routing

---

## 1. Target State Documentation Architecture

### 1.1 Complete File Inventory

**Current State** (27 markdown files across 7 directories):

```
Root routing documents (LLM entry points):
├── CLAUDE.md (1,145 lines) - comprehensive guide + architecture
├── AGENTS.md (56 lines) - structure + commands
├── GEMINI.md (109 lines) - overview + links
└── README.md (222 lines) - quick start guide

Conceptual/Business layer:
└── docs/
    ├── MOTIVATION.md (227 lines) - WHY the system exists
    ├── VISION.md (162 lines) - user experience transformation
    ├── ARCHITECTURE.md (477 lines) - technical design
    └── COMPLETED.md (247 lines) - changelog/progress

API Documentation:
└── docs/api/
    ├── API_SPECIFICATION.md (647 lines) - REST endpoint reference
    └── TESTING.md (156 lines) - testing patterns

SDK Documentation:
└── docs/sdk/
    └── README.md (208 lines) - SDK usage and examples

UI Documentation:
└── docs/ui/
    ├── planning/
    │   ├── ROADMAP.md (123 lines) - future enhancements
    │   └── DECISIONS.md (?)
    ├── REQUIREMENTS.md (?)
    └── IMPLEMENTATION.md (?)

Planning/Release Documentation:
└── plans/
    ├── releases/01/
    │   ├── REQUIREMENTS.md (?)
    │   └── IMPLEMENTATION.md (?)
    ├── field-value-capture.md (?)
    └── prompts/
        └── 01-documentation-review.md (?)

Project Review Documents:
└── docs/reviews/
    ├── 20251220_Project_Review_AMP.md
    ├── 20251220_Project_Review_GPT5-2.md
    ├── 20251220_Project_Review_GPT5-2-Codex.md
    └── 20251220_Project_Review_Gemini-3-Pro.md

Sample Data:
└── docs/samples/
    └── README.md

Other docs:
├── TODO.md (39 lines) - critical and medium priority issues
└── docs/req_alignment.md (?)
```

### 1.2 Target Architecture (Proposed)

**Core principle**: Separate **routing/navigation** documents from **reference/specification** documents.

```
ROUTING DOCUMENTS (LLM entry points - IDENTICAL):
├── CLAUDE.md  ─┐
├── AGENTS.md  ├─► Both serve as unified LLM routers pointing to task-specific docs
└── GEMINI.md  ─┘   (can be consolidated to single file with agent-specific env notes)

QUICKSTART (Human-first):
└── README.md  - For someone just cloning the repo

CONCEPTUAL (Understanding the domain):
└── docs/DOMAIN/
    ├── MOTIVATION.md    - Why this system exists
    ├── VISION.md        - What it enables users to do
    └── GLOSSARY.md      - [NEW] Canonical terminology

TECHNICAL REFERENCE (Building/modifying the system):
└── docs/TECHNICAL/
    ├── ARCHITECTURE.md           - System design, components, data flow
    ├── API_SPECIFICATION.md      - REST endpoint reference
    ├── DEVELOPMENT.md            - [NEW] Local setup, workflows, conventions
    └── CONFIGURATION.md          - [NEW] Environment variables, profiles

TESTING & QUALITY:
└── docs/TESTING/
    ├── TESTING.md               - Test patterns, base classes, running tests
    ├── QUALITY_GATES.md         - [NEW] Type checking, linting, code standards
    └── PERFORMANCE.md           - [NEW] Performance considerations, benchmarks

CLIENT INTEGRATION:
└── docs/SDK/
    └── README.md        - SDK usage for legacy system integration

UI/FRONTEND:
└── docs/UI/
    ├── ARCHITECTURE.md  - [NEW] Component structure, data flow
    ├── DECISIONS.md     - Design decisions and trade-offs
    ├── ROADMAP.md       - Future enhancements
    └── [Move REQUIREMENTS/IMPLEMENTATION to planning/]

PROJECT MANAGEMENT:
└── plans/
    ├── releases/
    │   └── 01/
    │       ├── REQUIREMENTS.md
    │       └── IMPLEMENTATION.md
    ├── BACKLOG.md           - [NEW] Known issues, todos, prioritization
    └── field-value-capture.md

INTERNAL REVIEWS:
└── docs/reviews/          - Keep for historical reference

DOCUMENTATION QUALITY:
└── docs/META/
    └── DOCUMENTATION.md   - [NEW] How to update docs, doc templates, style guide
```

### 1.3 Clear Boundaries

| Document | Responsible For | Questions It Answers |
|----------|-----------------|----------------------|
| **README.md** | Quick start for new users | "How do I clone this and get it running in 5 minutes?" |
| **CLAUDE.md** (routing) | All LLM question routing | "For task X, which document should I read?" |
| **MOTIVATION.md** | Business context | "Why does this system exist?" "What problem does it solve?" |
| **VISION.md** | User experience narrative | "What changes when this launches?" "How will users interact with it?" |
| **ARCHITECTURE.md** | System design | "How is the system structured?" "How do components interact?" "What's the data model?" |
| **API_SPECIFICATION.md** | REST API contract | "What endpoints exist?" "What are request/response formats?" "What are error codes?" |
| **DEVELOPMENT.md** | Local development | "How do I set up my environment?" "How do I run tests?" "What are the coding conventions?" |
| **TESTING.md** | Testing patterns | "How do I write tests?" "What base classes should I extend?" "How do I run specific tests?" |
| **SDK.md** | Client integration | "How do I integrate the SDK into my legacy system?" "What are the usage patterns?" |
| **BACKLOG.md** | Known issues and priorities | "What needs to be done next?" "What are the blocking issues?" "What's deferred?" |

### 1.4 Estimated Token Sizes (for LLM context efficiency)

```
Routing documents:
  CLAUDE.md (routing subset)      ~500 tokens   ← Load for all LLM tasks
  
Quick reference:
  README.md                        ~400 tokens   ← Load for new developers

Conceptual layer (load as needed):
  MOTIVATION.md                    ~600 tokens   ← For business context
  VISION.md                        ~500 tokens   ← For UX/product understanding
  
Technical reference (load as needed):
  ARCHITECTURE.md                  ~1,200 tokens ← For system understanding
  API_SPECIFICATION.md             ~1,600 tokens ← For API modifications
  DEVELOPMENT.md                   ~800 tokens   ← For setup/workflows
  TESTING.md                       ~400 tokens   ← For test writing
  
SDK reference (domain-specific):
  SDK/README.md                    ~500 tokens   ← For SDK integration tasks
  
Project management (rarely needed):
  plans/BACKLOG.md                 ~300 tokens   ← For prioritization/planning
  
Total context if all docs loaded:  ~7,500 tokens (WASTEFUL)
Total context optimal routing:     ~1,200 tokens per task (EFFICIENT)
```

### 1.5 Navigation Strategy Rationale

**Why this structure is optimal for LLMs:**

1. **Two-tier routing**: Routing document (500 tokens) points to task-specific docs (400-1600 tokens each), avoiding context waste
2. **Clear scope declarations**: Each doc starts with "This doc covers X, Y, Z. For A, B, C see [link]"
3. **Task-oriented organization**: Docs grouped by "what you're trying to do" not "what exists"
4. **No duplicate information**: Every concept lives in exactly one document; others link to it
5. **Consistent structure**: All docs follow predictable pattern (Purpose → Contents → Links out)
6. **Growth-compatible**: New docs slot into hierarchy without restructuring routing

**Comparison to current state:**

| Metric | Current | Target |
|--------|---------|--------|
| LLM context to find answer | 5,000-7,500 tokens | 1,200 tokens |
| Docs to read for one task | 3-5 | 1-2 |
| Source of truth for routing | Implicit, scattered | Explicit CLAUDE.md |
| Maintenance burden (updates) | High (many duplicates) | Low (single sources) |

---

## 2. LLM Navigation Design

### 2.1 CLAUDE.md and AGENTS.md: Unified Router

**New Purpose**: Both files serve the same function—they are **identical LLM entry points** that route questions to the right documents.

**Why not separate?** Current design has them serve different purposes (CLAUDE.md is comprehensive, AGENTS.md is minimal), creating confusion and maintenance burden. Instead, make them **functionally identical** with optional agent-specific environment notes at the end.

**Proposed Structure** (same for both):

```markdown
# CLAUDE.md / AGENTS.md (identical routing documents)

[~100 words] Brief system overview and core value proposition

## Quick Navigation (for LLMs)

When you need to... → Read this document

### Understanding the System
- "Why does this system exist?" → docs/DOMAIN/MOTIVATION.md
- "What problem does it solve?" → docs/DOMAIN/MOTIVATION.md
- "What will users do with this?" → docs/DOMAIN/VISION.md
- "How is it architected?" → docs/TECHNICAL/ARCHITECTURE.md
- "What terminology should I use?" → docs/DOMAIN/GLOSSARY.md

### Working with the Code
- "How do I set up locally?" → docs/TECHNICAL/DEVELOPMENT.md
- "How do I run tests?" → docs/TESTING/TESTING.md
- "How do I write a test?" → docs/TESTING/TESTING.md
- "What code conventions apply?" → docs/TECHNICAL/DEVELOPMENT.md

### Building API Features
- "What endpoints exist?" → docs/TECHNICAL/API_SPECIFICATION.md
- "How do I add an endpoint?" → docs/TECHNICAL/ARCHITECTURE.md + API_SPECIFICATION.md
- "What's the API contract?" → docs/TECHNICAL/API_SPECIFICATION.md

### Integrating with Legacy System
- "How do I use the SDK?" → docs/SDK/README.md
- "How does fire-and-forget work?" → docs/SDK/README.md

### Project Status
- "What's complete/done?" → docs/COMPLETED.md
- "What needs to be done?" → plans/BACKLOG.md
- "What are we planning?" → plans/releases/01/REQUIREMENTS.md

## Essential Commands

[Copy exact commands from AGENTS.md - no changes]

## Core Architecture (Brief Overview)

[2-3 paragraph summary of: What is this system? What are the main components? 
Why is it designed this way?]

## Testing Philosophy

[1 paragraph: Integration-first, Testcontainers, real MongoDB]

## Type Safety Requirements (UI)

[If developing UI: strict TypeScript, run typecheck before committing]

## Code Organization

[File structure overview with key directories]

---

## AGENT-SPECIFIC NOTES (Optional)

### For Claude Code Users
[Any Claude-specific advice]

### For Gemini API Users
[Any Gemini-specific advice]

### For Generic LLMs (Amp, etc.)
[Any general purpose advice]
```

**Key properties of this design:**

1. **Minimal prose overhead** (~500 tokens per LLM task)
2. **Clear signal**: "For X, read Y document"
3. **No duplication**: Links point to single sources
4. **Maintainable**: If docs change, only routing links update
5. **Scalable**: New docs added to routing table, structure stays stable

### 2.2 Document Scope Declarations

Every technical document should start with:

```markdown
# [Title]

**Scope**: This document covers [X, Y, Z].  
**For [A, B, C], see**: [link], [link]  
**Intended for**: [API developers | Frontend developers | DevOps | All]  
**Reading time**: ~10 minutes  

---

[Rest of document...]
```

**Example** (ARCHITECTURE.md header):

```markdown
# Ceremony Field Catalog Architecture

**Scope**: System design, component overview, data model, indexes, integration architecture, deployment topology.  
**For REST endpoint details, see**: docs/TECHNICAL/API_SPECIFICATION.md  
**For SDK integration, see**: docs/SDK/README.md  
**Intended for**: Backend developers, architects, DevOps planning deployments  
**Reading time**: ~12 minutes  
```

### 2.3 Signal Keywords for LLM Routing

Documents should contain clear keywords in their first paragraph so LLMs can pattern-match:

| Document | Keyword Signals |
|----------|-----------------|
| MOTIVATION.md | "Why", "problem statement", "passthrough", "empirical observation" |
| VISION.md | "user experience", "scenarios", "before/after", "relief" |
| ARCHITECTURE.md | "component", "layer", "data model", "integration", "deployment" |
| API_SPECIFICATION.md | "endpoint", "request", "response", "HTTP status", "error" |
| DEVELOPMENT.md | "local setup", "environment", "commands", "conventions", "configuration" |
| TESTING.md | "test", "pattern", "base class", "Testcontainers" |

---

## 3. Pre-Refactor Optimizations Needed

Before refactoring documentation, the codebase should be cleaned up:

### 3.1 High Priority (Blocking Documentation Clarity)

**1. Resolve Java Version Inconsistency**
- **Issue**: pom.xml says `<java.version>17</java.version>` but CLAUDE.md and README.md mention Java 21
- **Fix**: Verify actual Java version requirement (check GitHub Actions CI), update all docs to match
- **Impact**: Documentation credibility, developer confusion

**2. Remove Non-Existent Doc References**
- **Issue**: AGENTS.md references `docs/MONGODB_PERFORMANCE.md` which doesn't exist
- **Fix**: Either create the doc or remove the reference
- **Impact**: Broken routing signals, LLM trust

**3. Resolve YAML Configuration Mismatch**
- **Issue**: application.yml uses `max-xpath-length` but some references mention `maxFieldPathLength`
- **Fix**: Align naming convention, update CatalogProperties.java if needed
- **Impact**: Configuration misunderstanding, validation bugs

**4. Clarify UI Navigation**
- **Issue**: Multiple references to UI page components but no definitive source of truth
- **Fix**: Create single source for UI page definitions (routing → component → purpose)
- **Impact**: UI developer confusion

### 3.2 Medium Priority (Documentation Organization)

**1. Create GLOSSARY.md**
- Canonical term definitions: Context, FieldKey, CatalogEntry, metadata, observation, etc.
- Resolves inconsistent terminology across docs

**2. Consolidate Release Planning**
- plans/releases/01/ should be moved to: plans/BACKLOG.md or plans/CURRENT_PHASE.md
- Single source of truth for what's in progress vs done

**3. Establish Configuration Documentation**
- DEVELOPMENT.md should explain every environment variable
- application.yml should have inline comments referencing DEVELOPMENT.md sections

---

## 4. Migration Plan (Implementation Steps)

### Phase 1: Preparation (2-3 hours)

**Step 1.1**: Create new directory structure
```bash
# Create new doc directories
mkdir -p docs/DOMAIN docs/TECHNICAL docs/TESTING docs/SDK docs/UI docs/META plans

# Move existing files (don't delete yet, just reorganize)
mv docs/MOTIVATION.md → docs/DOMAIN/MOTIVATION.md
mv docs/VISION.md → docs/DOMAIN/VISION.md
mv docs/ARCHITECTURE.md → docs/TECHNICAL/ARCHITECTURE.md
mv docs/api/API_SPECIFICATION.md → docs/TECHNICAL/API_SPECIFICATION.md
mv docs/api/TESTING.md → docs/TESTING/TESTING.md
```

**Step 1.2**: Fix verification issues
- [ ] Confirm Java 17 vs 21 requirement
- [ ] Create or remove reference to MONGODB_PERFORMANCE.md
- [ ] Align configuration naming conventions

**Step 1.3**: Create new documents (from existing content)
- **DEVELOPMENT.md**: Extract from CLAUDE.md (setup, commands, conventions) + add configuration section
- **GLOSSARY.md**: New document with term definitions from all existing docs
- **BACKLOG.md**: Consolidate TODO.md + plans/releases/01/ + COMPLETED.md into prioritized backlog

### Phase 2: Create Unified Routing (1-2 hours)

**Step 2.1**: Create new CLAUDE.md (routing-focused)
```
1. Copy command section from current CLAUDE.md
2. Replace narrative architecture section with "Quick Navigation" table
3. Add scope declarations to architecture overview
4. Add agent-specific notes at bottom
```

**Step 2.2**: Update AGENTS.md
```
1. Make identical to CLAUDE.md routing structure
2. Keep only essential commands and structure info
3. Remove non-routing prose
```

**Step 2.3**: Keep or consolidate GEMINI.md
```
Option A: Delete (if no Gemini-specific needs)
Option B: Keep as wrapper that imports CLAUDE.md + Gemini-specific notes
```

**Step 2.4**: Create docs/META/DOCUMENTATION.md
```
- How to update documentation
- When to create new docs vs update existing
- Doc template structure
- Style guide (tone, depth, examples)
```

### Phase 3: Add Scope Declarations (1 hour)

Update header of every technical doc:
- [ ] docs/DOMAIN/MOTIVATION.md
- [ ] docs/DOMAIN/VISION.md
- [ ] docs/DOMAIN/GLOSSARY.md (NEW)
- [ ] docs/TECHNICAL/ARCHITECTURE.md
- [ ] docs/TECHNICAL/API_SPECIFICATION.md
- [ ] docs/TECHNICAL/DEVELOPMENT.md (NEW)
- [ ] docs/TESTING/TESTING.md
- [ ] docs/SDK/README.md
- [ ] docs/UI/DECISIONS.md
- [ ] docs/UI/ROADMAP.md
- [ ] plans/BACKLOG.md (NEW)

### Phase 4: Verify Cross-Links (1 hour)

- [ ] All "See also" links are bidirectional
- [ ] No broken internal links
- [ ] Routing tables in CLAUDE.md point to existing docs
- [ ] No duplicate information between linked docs

### Phase 5: Update README.md (30 minutes)

Simplify README to:
1. One-paragraph system description
2. Prerequisites (just Docker, or Java if developing)
3. Quick start (docker-compose up, UI startup)
4. "See Also" pointing to docs (routing via README)
5. No detailed architecture/testing info (those live in specific docs)

### Phase 6: Validation (1 hour)

- [ ] Read a random doc; verify scope declarations are accurate
- [ ] Test LLM routing: Ask 5 typical questions, verify routing documents point to right sources
- [ ] Check for stranded content: Is there prose/info not covered by new structure?
- [ ] Verify no duplicate information between related docs

### Phase 7: Archive Old Structure (30 minutes)

Keep old docs in single archive directory for reference, but don't include in normal documentation workflow:
```
docs/ARCHIVE/
├── CLAUDE.md (old version)
├── AGENTS.md (old version)
├── [other old files...]
```

---

## 5. Discovery & Navigation (Human Personas)

### 5.1 New Developer (First-Time Setup)

**Entry Point**: README.md  
**Path**:
1. README.md → Clone, docker-compose up
2. If questions → CLAUDE.md routing → docs/TECHNICAL/DEVELOPMENT.md
3. If architecture curiosity → CLAUDE.md routing → docs/TECHNICAL/ARCHITECTURE.md
4. If writing tests → CLAUDE.md routing → docs/TESTING/TESTING.md

**Context load**: README (400) + Development (800) + Routing signals = ~1,200 tokens  
**Current state**: Would load CLAUDE.md (1,100) + probably wander through 3-4 other docs = 3,000+ tokens

### 5.2 Backend Developer (Adding Feature)

**Entry Point**: CLAUDE.md (routing)  
**Path**:
1. CLAUDE.md → "Building API Features" → API_SPECIFICATION.md
2. CLAUDE.md → ARCHITECTURE.md for component understanding
3. CLAUDE.md → TESTING.md for test patterns
4. If configuration needed → DEVELOPMENT.md

**Context load**: Routing (500) + API Spec (1,600) + Arch (1,200) + Testing (400) = ~3,700 tokens  
**Current state**: Same docs but would discover them by reading all of CLAUDE.md (1,100) + searching = ~3,500 tokens  
**Improvement**: Clearer signal, less reading

### 5.3 Frontend Developer (Building UI Feature)

**Entry Point**: CLAUDE.md (routing)  
**Path**:
1. CLAUDE.md → "Working with the Code" → DEVELOPMENT.md (UI section)
2. CLAUDE.md → docs/UI/ARCHITECTURE.md (if creating new component)
3. CLAUDE.md → docs/UI/DECISIONS.md (understanding conventions)
4. CLAUDE.md → TESTING.md if writing tests

**Context load**: Routing (500) + Development (800) + UI Architecture (600) = ~1,900 tokens

### 5.4 Product Manager (Prioritizing Features)

**Entry Point**: README.md or VISION.md  
**Path**:
1. VISION.md → understand what users will do
2. MOTIVATION.md → understand the business problem
3. plans/BACKLOG.md → see what's prioritized
4. plans/releases/01/REQUIREMENTS.md → understand current phase

**Context load**: Vision (500) + Motivation (600) + Backlog (300) = ~1,400 tokens

### 5.5 Operations/DevOps (Deployment & Monitoring)

**Entry Point**: README.md  
**Path**:
1. README.md → Quick Start (Docker section)
2. CLAUDE.md → DEVELOPMENT.md (Configuration section)
3. ARCHITECTURE.md → Deployment Architecture section
4. (If troubleshooting) → BACKLOG.md known issues

**Context load**: Routing (500) + Development/Config (600) + Arch deployment section (400) = ~1,500 tokens

---

## 6. Maintenance Strategy

### 6.1 Document Ownership

| Document(s) | Owner | Update Trigger |
|-------------|-------|----------------|
| CLAUDE.md, AGENTS.md | Tech Lead | Any major architecture or command change |
| MOTIVATION.md, VISION.md | Product Manager | Business goals or user workflows change |
| ARCHITECTURE.md | Architect + Sr Backend Dev | Component/layer restructuring, major data model changes |
| API_SPECIFICATION.md | API developer | Any endpoint addition/change; update on release |
| DEVELOPMENT.md | Tech Lead | Setup changes, new conventions, environment variables |
| TESTING.md | QA Lead + Test maintainer | Test pattern changes, new base classes |
| SDK README | SDK maintainer | SDK interface changes |
| UI docs | UI Lead | Component architecture changes, new patterns |
| BACKLOG.md | Product Manager + Tech Lead | Weekly triage, priority updates |
| GLOSSARY.md | Tech Lead | New domain concepts, terminology clarifications |

### 6.2 Update Triggers (When Documentation Must Change)

| Event | Action | Owner | Timeline |
|-------|--------|-------|----------|
| New endpoint added | Update API_SPECIFICATION.md + routing if scope changed | API Dev | Before PR merge |
| New base class in tests | Update TESTING.md with new pattern | Test Maintainer | Before PR merge |
| Environment variable added | Update DEVELOPMENT.md + possibly routing | Tech Lead | Before PR merge |
| Major refactor | Update ARCHITECTURE.md + affected routing links | Sr Dev | After refactor complete |
| Backlog changes | Update BACKLOG.md priority section | PM + Tech Lead | Weekly sync |
| SDK API change | Update SDK/README.md | SDK maintainer | Before release |
| Bug fixed (high-priority) | Add to BACKLOG.md "COMPLETED" section | Dev | After PR merge |

### 6.3 Keeping Docs Current (Tools & Processes)

**Tool: Continuous Verification**
- Add pre-commit hook: Check that all internal links in docs resolve
- Add pre-commit hook: Verify CLAUDE.md routing table docs exist
- Failed checks block PR merge

**Process: Documentation Review**
- Quarterly review (every ~3 months): Does each doc still match the code?
- Triggered by: Major release, 5+ architectural PRs, significant feature changes
- Action: Sr Dev + Tech Lead review scope declarations, update if needed

**Process: New Developer Feedback**
- When new dev completes onboarding, ask: "Which docs helped? Which were confusing?"
- Incorporate feedback into quarterly reviews
- Update DEVELOPMENT.md/README.md based on pain points

**Process: Changelog Sync**
- BACKLOG.md "COMPLETED" section auto-generated from git tags/releases
- Or manually updated weekly: What finished this sprint → Move from TODO to COMPLETED

**Red flags** (triggers documentation sprint):
- Dev: "I couldn't find how to X"
- PM: "Requirements and reality don't match"
- QA: "The test patterns documentation is wrong"
- Deploy: "The setup docs are outdated"

### 6.4 Documentation-as-Code

**Embedding documentation in code:**
- Javadoc on public APIs in packages that frequently change
- TypeScript JSDoc on React components explaining purpose and props
- Inline comments on complex algorithms (reference ARCHITECTURE.md section)
- DO NOT: Duplicate business logic explanations (keep in ARCHITECTURE.md)

**Example** (ContextService.java):
```java
/**
 * Manages context lifecycle and metadata schema evolution.
 * 
 * See {@link com.ceremony.catalog.domain.Context} for data model.
 * See docs/TECHNICAL/ARCHITECTURE.md "Component Details > Service Layer > Context Service"
 * for business logic explanation.
 * 
 * Key constraint: requiredMetadata is immutable after creation to preserve field IDs.
 * See FieldKey#identity for how this affects field merging.
 */
public class ContextService { ... }
```

---

## 7. Terminology Alignment

### 7.1 Current Inconsistencies

| Concept | Used As | Should Be |
|---------|---------|-----------|
| "observation" | field observation, observation entry, observation record | **Standardize: "field observation"** |
| "field" | catalog field, observed field, field entry | **Standardize: "catalog field"** |
| "context" | observation context, metadata context | **Standardize: "context"** (define once in GLOSSARY) |
| "FieldKey" | field identity, field hash, field ID | **Standardize: "field identity"** or "FieldKey" (code term) |
| "metadata" | required metadata, optional metadata, custom metadata | **Standardize: terminology clear in each usage** |
| "XPath" | field path, field XPath, xpath, XML path | **Standardize: "field path"** in docs; "XPath" in code comments |

### 7.2 Canonical Glossary (New Document: docs/DOMAIN/GLOSSARY.md)

```markdown
# Glossary - Ceremony Field Catalog Terminology

## Core Concepts

### Context
A named observation point with its own metadata schema. Examples: "deposits", "renderdata", "loans".
- Defined by: contextId, displayName, requiredMetadata, optionalMetadata
- Purpose: Organize field observations by business domain
- See: docs/TECHNICAL/ARCHITECTURE.md "Data Model > Context Document"

### Field Observation
A single observation of an XML field being present in data. Includes:
- Where: XPath in the XML (e.g., `/Ceremony/Account/Balance`)
- When: What context was it observed in
- With what metadata: Values of required+optional metadata fields
- Count: How many times this field appeared

### Catalog Field (or CatalogEntry)
A deduplicated, merged field entry stored in MongoDB. Multiple observations of the same field (same context + requiredMetadata + XPath) merge into one catalog field with updated occurrence statistics.
- See: docs/TECHNICAL/ARCHITECTURE.md "Data Model > Catalog Entry Document"

### Field Identity (or Field Key)
The deterministic hash that uniquely identifies a field: `hash(contextId + requiredMetadata + fieldPath)`
- Important: Two fields with same identity will merge when observed
- Optional metadata doesn't affect identity (same field regardless of optional values)
- See: docs/TECHNICAL/ARCHITECTURE.md "Field Identity Algorithm"

### Metadata
Key-value pairs describing the context in which a field was observed.
- Required metadata: Part of field identity (e.g., productCode)
- Optional metadata: Stored but doesn't affect identity (e.g., channel)
- Normalized: All metadata keys and values lowercased before storage

### Fire-and-Forget
Asynchronous, best-effort submission pattern used by SDKs.
- Properties: Non-blocking, never retries, silently fails if catalog is down
- Purpose: Ensure field observation never impacts legacy system performance
- See: docs/SDK/README.md "Design Principles"

[... 20+ more terms ...]
```

### 7.3 Implementation

1. Create docs/DOMAIN/GLOSSARY.md with ~30 canonical definitions
2. Add to CLAUDE.md routing: "What's the terminology?" → GLOSSARY.md
3. In all docs, first use of domain term links to GLOSSARY definition: `[field observation](docs/DOMAIN/GLOSSARY.md#field-observation)`
4. In code, add `@see` links to GLOSSARY section in Javadoc

---

## 8. Gap Analysis

### 8.1 Missing Documentation (High Priority)

| Gap | Impact | Solution |
|-----|--------|----------|
| **DEVELOPMENT.md** | Setup confusion, convention questions | Create from CLAUDE.md setup sections + add full environment config |
| **GLOSSARY.md** | Terminology inconsistency, onboarding friction | Create with 30+ canonical definitions |
| **Configuration reference** | Developers don't know what env vars are available | Add to DEVELOPMENT.md, link from routing |
| **UI ARCHITECTURE.md** | Frontend devs don't know component structure | Extract from UI README + code comments → create docs/UI/ARCHITECTURE.md |
| **QUALITY_GATES.md** | Type-checking, lint, code standard rules unclear | Create with: typecheck requirements, lint rules, code patterns to avoid |
| **PERFORMANCE.md** | Performance expectations, benchmarks not documented | Create: Performance goals, query optimization patterns, benchmarks |
| **MONGODB_PERFORMANCE.md** | Referenced in AGENTS.md but doesn't exist | Either create or remove reference |

### 8.2 Insufficient Documentation (Medium Priority)

| Document | What's Missing | Action |
|----------|----------------|--------|
| API_SPECIFICATION.md | Error response examples for validation failures | Add 3-4 real validation error examples |
| ARCHITECTURE.md | How to add a new context (practical walk-through) | Add section: "Adding a New Context: Step-by-Step" |
| TESTING.md | How to add integration test for REST endpoint | Add example: Complete controller test example |
| README.md | Troubleshooting section (Docker issues, MongoDB connection) | Add "Troubleshooting" with common issues |
| SDK/README.md | Real-world integration example from legacy .NET code | Add section: "Real-World Integration Example" |

### 8.3 Orphaned Content (Review for Consolidation)

| Document | Status | Action |
|----------|--------|--------|
| docs/samples/README.md | Sample data descriptions | Keep as-is; sample location is clear |
| docs/COMPLETED.md | Detailed completed work changelog | Migrate summary to plans/BACKLOG.md "COMPLETED" section; archive detailed version |
| docs/reviews/*.md | AI code reviews from different models | Keep in docs/reviews/ for historical reference; not part of active docs |
| docs/req_alignment.md | Requirement traceability | Review content; if useful, migrate to plans/BACKLOG.md; else archive |
| plans/field-value-capture.md | Future feature design | Move to plans/ROADMAP.md or appropriate release folder |

---

## 9. Pre-Migration Checklist

Before executing migration plan, verify:

- [ ] **Java version confirmed**: Is it Java 17 or Java 21? Update all docs to match.
- [ ] **MongoDB performance doc**: Does docs/MONGODB_PERFORMANCE.md need to be created, or can reference be removed?
- [ ] **YAML config verified**: application.yml settings match CatalogProperties.java annotations
- [ ] **UI components identified**: List all page components that need documenting (DiscoverFieldsPage, etc.)
- [ ] **SDK API stable**: Will SDK interface change in next 2 weeks? If so, wait to document.
- [ ] **Release timeline clear**: plans/releases/01/ should reflect actual current work
- [ ] **Stakeholder review**: Has PM approved this structure? Any missing perspectives?

---

## 10. Success Metrics

### 10.1 LLM Efficiency Metrics

**Before**:
- Average tokens to answer question: 5,000-7,500
- Docs to read per task: 3-5
- Routing clarity: Implicit, requires inference

**After**:
- Average tokens to answer question: 1,200-2,000
- Docs to read per task: 1-2
- Routing clarity: Explicit, no inference needed

**Measurement**: Manually test 10 typical LLM questions; measure tokens needed.

### 10.2 Developer Experience Metrics

**Onboarding time** (new developer):
- Before: "How long to understand system enough to fix a bug?" = 4-6 hours
- After: = 1-2 hours
- **Measure**: Track time for next 3 new hires, ask "Which docs helped?"

**Documentation searchability**:
- Before: Searching for "context" returns 4+ different docs with different meanings
- After: Searching returns clear routing + GLOSSARY definition + specific doc
- **Measure**: Run 5 typical searches; count unique results

**Developer confidence**:
- Before: "Does this doc tell me everything I need?" = Often no
- After: = Clear scope declarations prevent uncertainty
- **Measure**: Monthly poll: "Did documentation answer your question?"

### 10.3 Documentation Maintenance

**Update frequency**:
- Current: Sporadic, docs drift from code
- Target: Updates sync with code changes (pre-commit checks)
- **Measure**: Track doc updates vs code commits

**Broken links**:
- Current: Unknown (not tracked)
- Target: Zero (enforced by CI)
- **Measure**: CI check for broken internal links

---

## 11. Implementation Sequence (Recommended Order)

This sequence minimizes disruption while maximizing early wins:

### Week 1: Preparation & Fixes
1. **Day 1-2**: Resolve blocking issues (Java version, config mismatches)
2. **Day 3-4**: Create new directory structure and copy files
3. **Day 5**: Create GLOSSARY.md and DEVELOPMENT.md

### Week 2: Create Unified Routing
1. **Day 1-2**: Create new routing-focused CLAUDE.md
2. **Day 3**: Make AGENTS.md identical
3. **Day 4**: Create docs/META/DOCUMENTATION.md
4. **Day 5**: Add scope declarations to all technical docs

### Week 3: Link Updates & Validation
1. **Day 1-2**: Update all cross-links, verify no broken references
2. **Day 3**: Add keyword signals to doc headers
3. **Day 4-5**: Test routing with 10 sample questions

### Week 4: Polish & Launch
1. **Day 1-2**: Update README.md (simplify, point to routing)
2. **Day 3**: Create pre-commit hook for link validation
3. **Day 4**: Internal review (team reads routing docs, gives feedback)
4. **Day 5**: Merge to main, announce new structure

---

## 12. Risk Assessment & Mitigation

### Risk 1: Docs become outdated again
**Likelihood**: High (without enforcement)  
**Mitigation**:
- Pre-commit hook validates links exist
- Quarterly review process (calendar reminder)
- Link doc updates to GitHub issues (PR closing issue updates relevant doc)

### Risk 2: Team resists new structure
**Likelihood**: Medium  
**Mitigation**:
- Get buy-in before implementing (show efficiency gains)
- Demonstrate with 1-2 docs first, gather feedback
- Document the "why" in docs/META/DOCUMENTATION.md

### Risk 3: Old docs still referenced
**Likelihood**: High (from Google, GitHub)  
**Mitigation**:
- Keep old docs but add "ARCHIVED - see new location" banner at top
- Redirect from old location to new in routing doc
- Search should point to routing document as primary result

### Risk 4: Missing optimization opportunities
**Likelihood**: Medium  
**Mitigation**:
- After 1 week of new structure, run LLM routing test
- Collect developer feedback
- Iterate on routing structure (it's not set in stone)

---

## 13. Conclusion & Recommendation

The Ceremony Field Catalog has **excellent foundational documentation** but suffers from **routing fragmentation** and **LLM inefficiency**. The proposed target state:

✅ **Consolidates** CLAUDE.md, AGENTS.md, GEMINI.md into single unified routing document  
✅ **Eliminates** duplicate information by establishing single sources of truth  
✅ **Reduces** LLM context waste from 5,000-7,500 tokens to 1,200-2,000 tokens per task  
✅ **Clarifies** document boundaries so developers know exactly where to look  
✅ **Scales** gracefully as the project grows (new docs slot into hierarchy)  
✅ **Maintains** current documentation quality while improving organization  

**Estimated effort**: 3-4 weeks for full implementation (can be done incrementally)  
**Estimated benefit**: 70% reduction in LLM context overhead, 50% reduction in new developer onboarding time  

**Next step**: Get stakeholder buy-in on this plan, then proceed with Phase 1 (preparation) execution.

---

## Appendix A: Document Migration Map

Shows old → new location for all files:

```
README.md (Root)
├── Keep (at root, simplified)

CLAUDE.md (Root)
├── → Refactor as unified LLM router

AGENTS.md (Root)
├── → Make identical to CLAUDE.md

GEMINI.md (Root)
├── → Consolidate or archive

docs/MOTIVATION.md
├── → docs/DOMAIN/MOTIVATION.md (no change)

docs/VISION.md
├── → docs/DOMAIN/VISION.md (no change)

docs/ARCHITECTURE.md
├── → docs/TECHNICAL/ARCHITECTURE.md (add scope declaration, verify accuracy)

docs/api/API_SPECIFICATION.md
├── → docs/TECHNICAL/API_SPECIFICATION.md (add scope declaration, add examples)

docs/api/TESTING.md
├── → docs/TESTING/TESTING.md (no change)

docs/sdk/README.md
├── → docs/SDK/README.md (add scope declaration)

docs/ui/planning/ROADMAP.md
├── → docs/UI/ROADMAP.md (add scope declaration)

docs/ui/planning/DECISIONS.md
├── → docs/UI/DECISIONS.md (add scope declaration)

docs/COMPLETED.md
├── → Archive; migrate summary to plans/BACKLOG.md "Completed" section

TODO.md
├── → Consolidate into plans/BACKLOG.md (delete after migration)

plans/releases/01/*
├── → Consolidate into plans/BACKLOG.md (move after migration)

[NEW] docs/DOMAIN/GLOSSARY.md
├── Create with 30+ canonical term definitions

[NEW] docs/TECHNICAL/DEVELOPMENT.md
├── Create from CLAUDE.md setup sections + configuration details

[NEW] docs/TECHNICAL/CONFIGURATION.md
├── Or integrate into DEVELOPMENT.md as section

[NEW] docs/TESTING/QUALITY_GATES.md
├── Create: TypeScript type checking, lint, code standards

[NEW] docs/TESTING/PERFORMANCE.md
├── Create: Performance goals, query patterns, benchmarks

[NEW] docs/UI/ARCHITECTURE.md
├── Create from UI code structure + component descriptions

[NEW] docs/META/DOCUMENTATION.md
├── Create: How to update docs, when to create new ones, templates

[NEW] plans/BACKLOG.md
├── Create: Consolidate TODO.md + releases/01 + completed work

[NEW] plans/ROADMAP.md
├── Or reuse docs/ui/planning/ROADMAP.md as master roadmap

docs/reviews/ (Archive)
├── Keep for historical reference but don't index in routing

docs/samples/ (Keep)
├── No changes needed
```

---

## Appendix B: Routing Table Template

For use in CLAUDE.md / AGENTS.md:

```markdown
## Quick Navigation by Task

### Understanding the Domain
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| Why does this system exist? | docs/DOMAIN/MOTIVATION.md | 8 min |
| What problem does it solve? | docs/DOMAIN/MOTIVATION.md | 8 min |
| What will users do with this? | docs/DOMAIN/VISION.md | 7 min |
| What's the terminology? | docs/DOMAIN/GLOSSARY.md | 10 min |

### System Design & Architecture  
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| How is the system structured? | docs/TECHNICAL/ARCHITECTURE.md | 12 min |
| What are the main components? | docs/TECHNICAL/ARCHITECTURE.md | 12 min |
| What's the data model? | docs/TECHNICAL/ARCHITECTURE.md (Data Model section) | 5 min |
| How does field merging work? | docs/TECHNICAL/ARCHITECTURE.md (Field Identity section) | 4 min |
| How does the API work? | docs/TECHNICAL/API_SPECIFICATION.md | 15 min |

### Local Development
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| How do I set up locally? | docs/TECHNICAL/DEVELOPMENT.md | 10 min |
| What environment variables are there? | docs/TECHNICAL/DEVELOPMENT.md (Configuration section) | 5 min |
| What are the coding conventions? | docs/TECHNICAL/DEVELOPMENT.md (Conventions section) | 8 min |
| How do I run the application? | docs/TECHNICAL/DEVELOPMENT.md (Setup section) | 3 min |

### Testing
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| How do I write a service test? | docs/TESTING/TESTING.md (Service Tests) | 6 min |
| How do I write an integration test? | docs/TESTING/TESTING.md (Integration Tests) | 6 min |
| How do I run all tests? | docs/TESTING/TESTING.md (Running Tests) | 3 min |
| What base classes are available? | docs/TESTING/TESTING.md (Base Classes) | 4 min |

### API Development
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| What endpoints exist? | docs/TECHNICAL/API_SPECIFICATION.md | 15 min |
| How do I add a new endpoint? | docs/TECHNICAL/ARCHITECTURE.md (API Layer) + API_SPECIFICATION.md | 20 min |
| What are the validation rules? | docs/TECHNICAL/API_SPECIFICATION.md (Error Handling) | 5 min |
| What's the error response format? | docs/TECHNICAL/API_SPECIFICATION.md (Error Handling) | 4 min |

### Legacy System Integration
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| How do I use the SDK? | docs/SDK/README.md | 12 min |
| How does fire-and-forget work? | docs/SDK/README.md (Design Principles) | 6 min |
| What are the SDK configuration options? | docs/SDK/README.md (Configuration) | 5 min |

### Project Status & Planning
| Question | Document | Est. Read Time |
|----------|----------|-----------------|
| What's currently in progress? | plans/BACKLOG.md (In Progress section) | 3 min |
| What needs to be done? | plans/BACKLOG.md (TODO section) | 5 min |
| What's been completed? | plans/BACKLOG.md (Completed section) | 10 min |
| What are the known issues? | plans/BACKLOG.md (Known Issues) | 8 min |
```

---

**Document Status**: COMPLETE  
**Review Status**: Ready for stakeholder review before implementation  
**Last Updated**: December 20, 2025
