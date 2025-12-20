# Documentation Alignment Review Prompt

## Goal

Create a perfect documentation strategy where:
- Every document has a clear purpose
- Every document has just the right amount of information for its purpose
- Every stakeholder can find what they need quickly
- **LLMs can navigate efficiently without wasting context**

---

## Primary Design Principle: LLM-First Documentation

**LLMs are the #1 priority.** Documentation must be structured so that:

1. **Minimal Context Waste**: An LLM should be able to determine which document(s) to read based on clear naming and a routing document (like `CLAUDE.md`), without loading everything
2. **Self-Contained Units**: Each document should be complete enough that an LLM rarely needs to load multiple docs for a single task
3. **Clear Boundaries**: Document purposes should be distinct so an LLM knows exactly which file answers which type of question
4. **Functional Decomposition**: Documents should be broken up by *function/task* not just *topic*, matching how LLMs receive requests
5. **Predictable Structure**: Consistent formatting so LLMs can quickly parse and extract relevant sections

### LLM Routing Strategy

The `CLAUDE.md` file (or equivalent) should serve as a routing table that tells an LLM:
- "For X type of question, look at Y document"
- "For modifying Z, you need to understand A and B"
- Clear signals for when to dig deeper vs when the summary is sufficient

---

## Prompt

Undertake a comprehensive assessment of all `.md` files and related documentation in this entire project (do not ignore any folders). Publish a comprehensive plan in `/plans/documentation-alignment.md` with the following sections:

### 1. Target State

Define the future state of documentation:
- **Complete file inventory**: what files exist, where they live, what each is responsible for
- **Clear boundaries**: demonstrate that each document has a distinct purpose with no overlap
- **LLM efficiency analysis**: estimated token counts per doc, when each would be loaded
- **Reasoning**: explain why this structure is optimal for this specific application

### 2. LLM Navigation Design

Design the routing strategy for LLM consumers:
- How should `CLAUDE.md` be structured to route LLMs to the right documents?
- What signals/keywords should each document have so LLMs know when to load it?
- How do we minimize the number of documents an LLM needs for common tasks?
- What information should be duplicated (for self-containment) vs referenced?

### 3. Pre-Refactor Optimizations

Identify areas of the application that should be optimized or made more coherent BEFORE documentation refactor, so we can draw clearer lines from users → docs → system.

### 4. Migration Plan

Provide a detailed step-by-step process to move from current state to target state.

### 5. Discovery & Navigation (Human Personas)

For each human persona, map the ideal entry point and navigation path through documentation.

### 6. Maintenance Strategy

Define ownership, update triggers, and processes to keep docs current as the codebase evolves.

### 7. Terminology Alignment

Identify any inconsistent terminology across code and docs. Recommend a canonical glossary.

### 8. Gap Analysis

What documentation is missing entirely? What exists but is insufficient?

---

## Target Personas

### Primary: LLM Assistants

| Consideration | Requirement |
|---------------|-------------|
| **Context Efficiency** | Docs should be loadable independently; avoid forcing LLMs to load multiple large files |
| **Clear Scope Signals** | Each doc should clearly state what questions it answers in its header |
| **Predictable Structure** | Consistent headings and organization across all docs |
| **Task-Oriented Breakdown** | Organize by "what you're trying to do" not just "what exists" |
| **Code-Doc Proximity** | Inline comments for micro-context, external docs for macro-context |
| **Routing Document** | `CLAUDE.md` serves as the index/router for all other documentation |

### Secondary: Human Stakeholders

| Persona | Description | Primary Needs |
|---------|-------------|---------------|
| **SDK Integrator (.NET)** | Developer integrating the catalog into their .NET application | Installation, configuration, usage patterns, examples. Ignore Python SDK for this exercise. |
| **Engineering Team** | Frontend, backend, and database developers maintaining this application | Local setup, architecture decisions, coding patterns, troubleshooting, testing |
| **Product Owner** | Stakeholder needing business context | Use cases solved, current capabilities, roadmap, future phases |
| **Architect** | Technical decision maker | System structure, data flow, integration points, technology choices, trade-offs |
| **GitHub User** | Someone cloning the repo to get started | Quick start, prerequisites, minimal friction to running locally |
| **Operations/DevOps** | Team responsible for deployment and production | Deployment, configuration, environment variables, monitoring |

---

## LLM-Specific Design Questions

| Question | Why It Matters |
|----------|----------------|
| **What's the ideal document size?** | Too large = context waste; too small = too many files to route between |
| **When should info be duplicated?** | Self-containment vs single source of truth trade-off |
| **How should CLAUDE.md route?** | Keyword matching, task descriptions, or explicit "go here for X" |
| **What belongs inline in code?** | Comments that help LLMs understand code without loading external docs |
| **How do we handle cross-cutting concerns?** | Topics that span multiple areas (e.g., error handling, security) |
| **Should docs declare their own scope?** | Header section like "This document covers X, Y, Z. For A, B, C see [other doc]" |

---

## Additional Dimensions to Address

| Dimension | Questions to Answer |
|-----------|---------------------|
| **API Reference Integration** | How does OpenAPI/Swagger fit with markdown docs? Single source of truth? |
| **Diagram Strategy** | Which concepts need visual representation? Tool recommendations (Mermaid, PlantUML) |
| **Examples Strategy** | Where do code samples live? How do we ensure they stay current and tested? |
| **Versioning** | As the app evolves, how do docs stay aligned? |
| **Documentation Testing** | How do we verify docs are accurate? |
| **Terminology/Glossary** | Consistent language across all docs |

---

## Expected Deliverable

A single comprehensive markdown file at `/plans/documentation-alignment.md` that serves as the authoritative plan for documentation refactoring. This plan should:

1. Prioritize LLM efficiency above all else
2. Provide concrete file structure with estimated token sizes
3. Define the CLAUDE.md routing strategy
4. Include migration steps from current to target state

This plan will be reviewed before implementation begins.
