# Ceremony Field Catalog - System Overview

## The Problem This System Solves

This system was built for a legacy PDF rendering pipeline that processes XML through multiple pathways:

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────┐     ┌──────┐
│ Calling Systems │ ──► │ Legacy Ceremony System  │ ──► │ PDF Gen API │ ──► │ PDFs │
└─────────────────┘     │  (XML Transformation)   │     │  Rendering  │     └──────┘
                        └─────────────────────────┘     └─────────────┘
```

The challenge: hundreds of different PDF templates, each requiring specific XML structures, and the XML was generated dynamically based on multiple factors (product type, state, subcodes, document codes, etc.). Modernization required:

1. **Schema files** for every template
2. **Understanding which XML elements** are actually used for each combination of business variants
3. **Reverse-engineering a complete field repository** from observed usage

This system captures XML field "observations" over time to build that repository.

---

## The Legacy System's Multiple Pathways

The legacy system isn't a single pipeline - it supports multiple distinct pathways, each with different data flows and transformation logic. The Field Catalog must capture observations from **all** of them.

### Pathway 1: The Ceremony Path

```
┌──────────────┐    ┌─────────────────────────────────────────────────────────────┐
│   Calling    │    │              Legacy Ceremony System                          │
│   System     │───►│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│              │    │  │ Ceremony    │──►│ Business     │──►│ Per-Document     │──┼──► PDF Gen API
│ Ceremony XML │    │  │ XML (IN)    │   │ Rules Engine │   │ Transforms (OUT) │  │
└──────────────┘    │  └─────────────┘   │ (which docs?)│   └──────────────────┘  │
                    │                     └──────────────┘                         │
                    └─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Calling system sends **Ceremony XML** - a consistent but non-schema'd structure (customers, accounts, products, etc.)
2. Legacy system runs **business rules** to determine which document codes are needed
3. For each document code, **transforms** Ceremony XML into document-specific XML conforming to template team's schema
4. Sends transformed XML to PDF Generation API for rendering

**Key characteristics:**
- Input XML is abstracted from documents (no "this field is for doc XYZ")
- Business rules determine document selection
- Heavy transformation per document
- Field variance driven by: `productCode`, `productSubCode`, `action`, etc.

### Pathway 2: The OnDemand Path

```
┌──────────────┐    ┌─────────────────────────────────────────────────────────────┐
│   Calling    │    │              Legacy Ceremony System                          │
│   System     │───►│                                                              │
│              │    │  Document XML + Workflow Instructions ─────────────────────┼──► PDF Gen API
│ Pre-formed   │    │  (passthrough - no transforms, no business rules)           │
│ Document XML │    │                                                              │
└──────────────┘    └─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Calling system sends **exact XML per document** plus workflow instructions
2. Legacy system acts as a **passthrough** - no business rules, no transforms
3. XML forwarded directly to PDF Generation API

**Key characteristics:**
- Used when data isn't related to broader Ceremony XML (banking products, applications)
- Calling system knows exactly what documents and data it needs
- Supports e-signing workflows with explicit signer assignments
- Field variance driven by: `formCode`, `formVersion`

### Pathway 3: The BMIC Path (Loans/Legacy Documents)

```
┌──────────────┐    ┌─────────────────────────────────────────────────────────────┐
│   Calling    │    │              Legacy Ceremony System                          │
│   System     │───►│  ┌───────┐   ┌─────────────┐   ┌──────────────────────────┐ │
│              │    │  │ ID    │──►│ Fetch BMIC  │──►│ Light Transform          │─┼─► PDF Gen API
│ Reference ID │    │  │       │   │ XML from SOR│   │ (mostly adds new tags)   │ │
└──────────────┘    │  └───────┘   └─────────────┘   └──────────────────────────┘ │
                    └─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Calling system sends an **ID** referencing data in a System of Record (SOR)
2. Legacy system **fetches BMIC XML** from the SOR
3. Runs **light transforms** - mostly adding new tags, not restructuring
4. Entire XML (original + added tags) sent to PDF Generation API

**Key characteristics:**
- Used for older loan-related templates
- BMIC XML is ~90% identical across all documents using this path
- Transforms add fields rather than restructure
- All documents share an overarching schema
- Field variance driven by: `loanProductCode`, possibly `ceremonyType`

---

## Observation Points

The Field Catalog captures observations at multiple points in these pipelines:

### Data Coming IN to Legacy System

| Observation Point | Context | Required Metadata | What It Captures |
|-------------------|---------|-------------------|------------------|
| Ceremony XML as received | `ceremony-inbound` | productCode, productSubCode, action | Raw fields from calling systems before any transformation |
| BMIC XML as fetched | `bmic-inbound` | loanProductCode | Fields from System of Record for loan documents |

### Data Going OUT to Document Rendering

| Observation Point | Context | Required Metadata | What It Captures |
|-------------------|---------|-------------------|------------------|
| Per-document rendering XML | `renderdata` | documentCode | Final fields sent to PDF Generation API per document template |
| OnDemand passthrough | `ondemand` | formCode, formVersion | Fields in pre-formed document XML |

### Future Observation Points (Extensible)

The context system allows adding new observation points as needed:

| Potential Point | Context | Required Metadata | Purpose |
|-----------------|---------|-------------------|---------|
| Post-normalization XML | `ceremony-normalized` | productCode, productSubCode, documentCode | Capture interim state after first transform pass |
| Transform-specific | `transform-{name}` | transformId, documentCode | Debug specific transformation stages |

---

## How Contexts Enable Multi-Mode Observation

Each "mode" or observation point is represented by a **Context** with its own metadata schema:

```javascript
// Ceremony Path - Inbound
{
  "contextId": "ceremony-inbound",
  "requiredMetadata": ["productCode", "productSubCode", "action"],
  "optionalMetadata": ["channel", "state"]
}

// Ceremony Path - Per-Document Output
{
  "contextId": "renderdata",
  "requiredMetadata": ["documentCode"],
  "optionalMetadata": ["productCode", "productSubCode"]
}

// BMIC Path
{
  "contextId": "bmic-inbound",
  "requiredMetadata": ["loanProductCode"],
  "optionalMetadata": ["ceremonyType"]
}

// OnDemand Path
{
  "contextId": "ondemand",
  "requiredMetadata": ["formCode", "formVersion"],
  "optionalMetadata": []
}
```

**Why this design?**
- Each pathway has fundamentally different "dimensions" that determine field variance
- Contexts are self-service - new observation points can be added without code changes
- Required metadata ensures consistent field identity within each observation point
- Optional metadata allows additional filtering without affecting identity

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         REST API Layer                          │
│  ContextController          CatalogController                   │
│  (CRUD for contexts)        (observations & search)             │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                        Service Layer                             │
│  ContextService              CatalogService                      │
│  (context lifecycle)         (merge logic, search)              │
│                              InputValidationService              │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                      Persistence Layer                           │
│  ContextRepository       CatalogRepository + Custom Queries      │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                           ┌───────▼───────┐
                           │   MongoDB     │
                           │  - contexts   │
                           │  - catalog_fields │
                           └───────────────┘
```

---

## Key Domain Concepts

### 1. Context - The Observation Point Schema

A **Context** defines an observation point with its metadata requirements:

```java
// domain/Context.java
contextId: "renderdata"
displayName: "Document Rendering Data"
requiredMetadata: ["documentCode"]           // Determines field identity
optionalMetadata: ["productCode", "productSubCode"]  // Additional info only
active: true
```

### 2. CatalogEntry - An Observed Field

Each unique field observation is stored as:

```java
// domain/CatalogEntry.java
id: "field_12345678"          // Hash-based unique ID
contextId: "renderdata"
metadata: {documentCode: "STMT001", productCode: "DDA"}
fieldPath: "/Document/TaxWithholding/Amount"
maxOccurs: 5                  // Most times seen in one document
minOccurs: 0                  // Least times (0 = sometimes missing)
allowsNull: true              // Has been seen with null value
allowsEmpty: false            // Never seen as empty string
```

### 3. FieldKey - The Identity Algorithm

Field identity is computed as:

```java
// domain/FieldKey.java
hash(contextId + requiredMetadata + fieldPath)
```

**What this means**:
- Two observations with same context + required metadata + xpath = **same field** (merge stats)
- Optional metadata is stored but doesn't affect identity
- Case-insensitive matching throughout

---

## How Data Flows

### Submitting Observations

```
POST /catalog/contexts/renderdata/observations
[{
  "metadata": {"documentCode": "STMT001", "productCode": "DDA"},
  "fieldPath": "/Document/TaxWithholding/Amount",
  "count": 1,
  "hasNull": false,
  "hasEmpty": false
}]
```

**What happens** (`CatalogService.merge()`):

1. **Validate context exists** and is active
2. **Validate metadata** - all required fields present, no unexpected fields
3. **Compute field ID** using `FieldKey(contextId, requiredMetadata, fieldPath).toString()`
4. **Check if field exists**:
   - **Yes**: Update stats (merge maxOccurs, minOccurs, allowsNull, allowsEmpty)
   - **No**: Create new entry
5. **Single-context cleanup**: If all observations have same metadata, mark any *existing* fields not in this batch as `minOccurs=0` (meaning "can be absent")

### The Merge Logic

```java
if (entry exists) {
    entry.setMaxOccurs(Math.max(existing, new));  // Track highest count seen
    entry.setMinOccurs(Math.min(existing, new));  // Track lowest count seen
    entry.setAllowsNull(existing || new);         // Once null, always nullable
    entry.setAllowsEmpty(existing || new);        // Once empty, always can be empty
} else {
    // Create new entry
}
```

### Searching the Catalog

```
GET /catalog/fields?contextId=renderdata&documentCode=STMT001
```

**Dynamic search**: Any query parameter becomes a metadata filter. The `DynamicSearchParameterResolver` converts unknown parameters to metadata queries.

---

## The Clever Design Decisions

### 1. Required vs Optional Metadata Split

**Required** metadata determines field identity. **Optional** metadata is just stored for reference.

Why? If you later add a new optional dimension like "channel", you don't invalidate all your existing field IDs. Only changes to required metadata would require a new context.

### 2. Hash-Based Field IDs

```java
// FieldKey.toString()
String keyString = contextId + "|" + sortedMetadata + "|" + fieldPath;
return "field_" + Math.abs(keyString.hashCode());
```

Clean, collision-resistant IDs that are consistent across restarts and environments.

### 3. Single-Context Cleanup

When you submit a batch of observations from one specific metadata combination:

```java
// If I submit observations for documentCode=STMT001 and don't include /TaxWithholding
// but /TaxWithholding exists in the DB for STMT001
// → set /TaxWithholding's minOccurs = 0 (meaning it's optional for this document)
```

This is how you discover "this field is sometimes missing for this document/product variant."

### 4. Case-Insensitive Everything

All metadata keys and values are normalized to lowercase in `FieldKey`:

```java
private static String normalizeCase(String value) {
    return value == null ? null : value.toLowerCase();
}
```

Prevents `documentCode=STMT001` vs `DocumentCode=stmt001` from creating duplicate entries.

### 5. Extensible Context System

New observation points can be added without code changes:

```bash
# Add a new observation point for mid-transform XML
POST /catalog/contexts
{
  "contextId": "ceremony-normalized",
  "displayName": "Post-Normalization Ceremony XML",
  "requiredMetadata": ["productCode", "productSubCode", "documentCode"],
  "optionalMetadata": [],
  "active": true
}
```

The legacy system can then start sending observations to this new context immediately.

---

## Cross-Pathway Analysis

With observations from all pathways, you can answer questions like:

| Question | Query |
|----------|-------|
| What fields does document STMT001 need? | `GET /catalog/fields?contextId=renderdata&documentCode=STMT001` |
| What Ceremony XML fields exist for DDA products? | `GET /catalog/fields?contextId=ceremony-inbound&productCode=DDA` |
| Which documents use a specific field? | `GET /catalog/fields?fieldPathContains=TaxWithholding` |
| What's different between DDA and SAV? | Compare results for `productCode=DDA` vs `productCode=SAV` |
| Which fields are always present vs optional? | Filter by `minOccurs > 0` |

---

## The Runtime Flow (Visual)

```
Day 1: Process 100 ceremonies for documentCode=STMT001
       → See /Document/Balance 100 times, /Document/TaxWithholding 80 times

       Catalog now shows:
       /Document/Balance:        minOccurs=1, maxOccurs=1 (always present)
       /Document/TaxWithholding: minOccurs=0, maxOccurs=1 (sometimes missing)

Day 2: Process 50 ceremonies for documentCode=STMT001
       → /Document/Balance seen 50 times with count=1
       → /Document/TaxWithholding seen 20 times with count=3 (repeating element!)

       Catalog now shows:
       /Document/Balance:        minOccurs=1, maxOccurs=1 (unchanged)
       /Document/TaxWithholding: minOccurs=0, maxOccurs=3 (now we know it repeats!)

Day 3: Process 10 ceremonies for documentCode=STMT001
       → Only /Document/Balance seen, /Document/TaxWithholding not in batch

       Catalog now shows:
       /Document/Balance:        minOccurs=1, maxOccurs=1
       /Document/TaxWithholding: minOccurs=0, maxOccurs=3 (minOccurs stays 0)
```

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.2.5 |
| Language | Java 21 |
| Database | MongoDB |
| API Docs | OpenAPI/Swagger (springdoc) |
| Testing | JUnit 5 + Testcontainers (real MongoDB in tests) |
| Build | Maven |
| Boilerplate | Lombok |

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `CatalogService.java` | Core merge logic |
| `FieldKey.java` | Field identity calculation |
| `Context.java` | Metadata schema definition |
| `CatalogController.java` | REST endpoints for observations & search |
| `ContextController.java` | REST endpoints for context management |
| `tests/CatalogSmokeTests.http` | Example API calls for manual testing |
| `sdks/dotnet/` | .NET Framework 4.8 client SDK for legacy system integration |

---

## API Quick Reference

### Context Management

```bash
# Create a context for a new observation point
POST /catalog/contexts
{
  "contextId": "renderdata",
  "displayName": "Document Rendering Data",
  "requiredMetadata": ["documentCode"],
  "optionalMetadata": ["productCode", "productSubCode"],
  "active": true
}

# List all contexts
GET /catalog/contexts

# Get specific context
GET /catalog/contexts/renderdata
```

### Field Observations

```bash
# Submit observations from document rendering
POST /catalog/contexts/renderdata/observations
[{
  "metadata": {"documentCode": "STMT001", "productCode": "DDA"},
  "fieldPath": "/Document/TaxWithholding/Amount",
  "count": 1,
  "hasNull": false,
  "hasEmpty": false
}]
```

### Search

```bash
# Search by context (all fields for a pathway)
GET /catalog/fields?contextId=renderdata

# Search by document code
GET /catalog/fields?contextId=renderdata&documentCode=STMT001

# Search by field path pattern
GET /catalog/fields?fieldPathContains=TaxWithholding

# Cross-context search (find all uses of a product code)
GET /catalog/fields?productCode=DDA
```

---

## Summary

This system is a **field indexing engine** that builds an empirical understanding of XML field usage across all pathways of the legacy ceremony system. By capturing observations from:

- **Ceremony XML** as it enters the system
- **BMIC XML** fetched from Systems of Record
- **Document-specific XML** sent to PDF Generation API
- **OnDemand XML** passed through without transformation

...the catalog becomes the authoritative source for understanding what data flows through the legacy system, enabling:

- Schema generation for modernization
- Field-level documentation for business analysts
- Impact analysis for changes
- Discovery of which documents use which fields
- Understanding of product-specific field variations
