# Documentation Maintenance Guide

**Purpose:** How to maintain and update project documentation
**Use when:** Adding new docs, updating existing docs, or onboarding doc contributors

---

## Documentation Philosophy

### LLM-First Design

This project's documentation is optimized for LLM consumption:

1. **Router documents** (CLAUDE.md, AGENTS.md, GEMINI.md) are identical and point to task-specific docs
2. **How-to docs** are task-complete (cover API + UI + SDK for a single feature area)
3. **Reference docs** provide deep architecture details, loaded only when needed
4. **History docs** are clearly labeled as non-authoritative

### Token Efficiency

| Doc Type | Target Size | Load When |
|----------|-------------|-----------|
| Router | ≤500 tokens | Always first |
| How-to | 900-1,600 tokens | Specific task |
| Reference | 1,200-2,000 tokens | Deep work |
| History | Uncapped | Never routed |

---

## Document Structure

### Router Documents (Root)

- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` - **Must be identical**
- Task-based navigation table
- Essential commands
- Core invariants

### How-To Docs (`docs/how-to/`)

Each doc covers one feature area end-to-end:

```markdown
# [Feature Name]

**Purpose:** What this doc helps you do
**Use when:** 3-5 common tasks
**Don't use when:** 2-3 wrong-doc signals → links
**Source of truth:** List of authoritative code files

---

[Content organized by task, not by layer]
```

### Reference Docs (`docs/reference/`)

Deep architecture for major refactoring:
- `backend.md` - Package structure, domain models, services
- `frontend.md` - UI architecture, hooks, components
- `configuration.md` - Env vars, profiles, Docker

### Domain Docs (`docs/domain/`)

Business context:
- `motivation.md` - Why this system exists
- `vision.md` - Desired outcomes
- `glossary.md` - Canonical terminology

### History Docs (`docs/history/`)

Non-authoritative archives:
- `completed.md` - Historical changelog
- `reviews/` - AI-generated reviews

---

## Update Triggers

| Code Change | Must Update |
|-------------|-------------|
| Controller/DTO in `api/**` | Relevant how-to doc + `docs/reference/backend.md` |
| Search/suggest logic | `docs/how-to/search.md` |
| Context behavior | `docs/how-to/contexts.md` |
| Merge algorithm | `docs/how-to/observations.md` |
| UI flow changes | Relevant how-to + `docs/reference/frontend.md` |
| Config/env var changes | `docs/reference/configuration.md` |
| New terminology | `docs/domain/glossary.md` |

---

## Keeping Docs in Sync

### Router Document Sync

The three router documents must be identical (except the title). After editing any of them:

```bash
# Verify they're in sync
diff CLAUDE.md AGENTS.md
diff CLAUDE.md GEMINI.md
```

### Link Integrity

Before committing doc changes, verify all internal links resolve:

```bash
# Check for broken links (manual)
grep -r '\[.*\](.*\.md)' docs/ | grep -v node_modules
```

---

## Adding New Documentation

### New How-To Doc

1. Create in `docs/how-to/`
2. Use the standard header template (Purpose/Use when/Don't use when/Source of truth)
3. Add to router documents' navigation table
4. Keep within token budget (900-1,600)

### New Reference Doc

1. Create in `docs/reference/`
2. Add standard header
3. Only add to router if frequently needed
4. Can exceed token budget for deep content

### New Historical Doc

1. Create in `docs/history/`
2. Add date to filename if applicable
3. Never route from CLAUDE.md/AGENTS.md
4. Add "Not authoritative" disclaimer if needed

---

## Style Guide

### Formatting

- Use ATX headers (`#`, `##`, `###`)
- Use tables for structured data
- Use code blocks with language tags
- Use `---` for section breaks

### Tone

- Direct and concise
- Imperative voice for instructions
- Present tense for descriptions
- No emojis unless explicitly requested

### Code Examples

- Include file paths when referencing code
- Use format `file_path:line_number` for specific references
- Keep examples minimal but complete

---

## Ownership

| Document Area | Owner |
|---------------|-------|
| Router docs | Tech Lead |
| How-to docs | Feature area owner |
| Reference docs | Architecture owner |
| Domain docs | Product owner |
| History docs | No active owner |
