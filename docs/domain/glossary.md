# Glossary

**Purpose:** Canonical terminology for the Ceremony Field Catalog
**Use when:** Terminology confusion, onboarding, or writing documentation
**Source of truth:** Domain models in `src/main/java/com/ceremony/catalog/domain/`

---

## Core Concepts

| Code Symbol | Term | Definition |
|-------------|------|------------|
| `Context` | **Context** | Business domain wrapper defining metadata schema (e.g., "deposits", "loans"). Created via API, stores required/optional metadata field names. |
| `CatalogEntry` | **Catalog Field** | Aggregated, stored record in MongoDB representing a unique field path within a context. Contains `requiredMetadata` (single values, part of identity), `optionalMetadata` (accumulated sets of all observed values), and occurrence statistics. |
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

**Storage behavior on CatalogEntry:**
- **Required metadata** is stored as `Map<String, String>` - single value per key, immutable after creation
- **Optional metadata** is stored as `Map<String, Set<String>>` - accumulates all values ever observed for each key over time (not last-write-wins). Value order within each set is not guaranteed after MongoDB round-trip.

---

## Casing & Schema Export

| Term | Definition |
|------|------------|
| **Casing Counts** | Map tracking how many times each exact casing of a field path was observed. Key is the original casing (e.g., `/Document/Account`), value is observation count. Stored on `CatalogEntry`. |
| **Canonical Casing** | User-selected authoritative casing for a field path, used in schema exports. If not set, defaults to the most-observed casing. Scoped per-entry (per schema variant). |
| **Casing Resolution** | The process of selecting which casing variant to use as canonical for schema export when multiple casings have been observed. |
| **Schema Variant** | A unique combination of context + required metadata values, representing a specific "version" of a schema. For example, `deposits + productCode=DDA` is one variant, `deposits + productCode=SAV` is another. |

---

## Search & Discovery

| Term | Definition |
|------|------------|
| **Discovery Search (`q`)** | Global search across fieldPath, contextId, and all metadata values using OR logic. |
| **Filter Search** | Scoped search using specific parameters: `contextId`, `fieldPathContains`, `metadata.*` |
| **Active Context Filtering** | Only contexts with `active=true` appear in dropdowns and search results by default. |
| **Facet Mode** | Filtering logic for facet selections: "any" (OR - match if field has any selected value) or "all" (AND - field must have variants covering all selected values). |
| **Variant Explorer** | UI panel showing all schema variants that contain a particular field path, allowing exploration of how field behavior differs across schema variants. |
| **Cascading Filter** | Metadata autocomplete that narrows suggestions based on already-selected values. E.g., selecting `ProductCode=DDA` then typing in `SubProductCode` shows only subproducts observed with DDA. |

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
