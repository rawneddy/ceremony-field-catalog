# Glossary

**Purpose:** Canonical terminology for the Ceremony Field Catalog
**Use when:** Terminology confusion, onboarding, or writing documentation
**Source of truth:** Domain models in `src/main/java/com/ceremony/catalog/domain/`

---

## Core Concepts

| Code Symbol | Term | Definition |
|-------------|------|------------|
| `Context` | **Context** | Business domain wrapper defining metadata schema (e.g., "deposits", "loans"). Created via API, stores required/optional metadata field names. |
| `CatalogEntry` | **Catalog Field** | Aggregated, stored record in MongoDB representing a unique field path within a context. Includes occurrence statistics (min/max, null/empty flags, timestamps). |
| `CatalogObservationDTO` | **Observation** | Raw data point submitted via API. Contains field path, metadata values, and occurrence count. Multiple observations with same identity merge into one catalog field. |
| `FieldKey` | **Field Identity** | Deterministic hash of `contextId + requiredMetadata + fieldPath`. Two observations with identical field identity merge; optional metadata doesn't affect identity. |
| `fieldPath` | **Field Path** | XPath-like location string identifying an XML element or attribute (e.g., `/Document/Account/@type`). |

---

## Metadata Types

| Term | Definition |
|------|------------|
| **Required Metadata** | Metadata fields that contribute to field identity. Defined at context creation; immutable afterward. Example: `productCode` |
| **Optional Metadata** | Metadata fields stored with observations but not part of field identity. Can be added/removed from context. Example: `channel`, `region` |
| **Metadata Rules** | XPath extraction patterns defined in context for auto-extracting metadata from XML during upload. |

---

## Search & Discovery

| Term | Definition |
|------|------------|
| **Discovery Search (`q`)** | Global search across fieldPath, contextId, and all metadata values using OR logic. |
| **Filter Search** | Scoped search using specific parameters: `contextId`, `fieldPathContains`, `metadata.*` |
| **Active Context Filtering** | Only contexts with `active=true` appear in dropdowns and search results by default. |

---

## Data Flow

| Term | Definition |
|------|------------|
| **Fire-and-Forget** | SDK submission pattern: non-blocking, no retries, silent failure. Ensures catalog never impacts legacy system performance. |
| **Merge Algorithm** | When an observation matches an existing catalog field (same identity), statistics are merged: counts added, min/max updated, timestamps tracked. |
| **Single-Context Cleanup** | After processing observations for a context, fields not present in the batch have their `minOccurs` set to 0 (indicating optional). |

---

## UI Pages

| Route | Tab | Purpose |
|-------|-----|---------|
| `/` | Discover Fields | Reactive field exploration with faceted filtering |
| `/schema` | Explore Schema | Generate exact schemas (XSD/JSON) for export |
| `/submit` | Submit Data | Upload XML files to extract field observations |
| `/contexts` | Manage Contexts | Create/edit context schemas and metadata rules |
