# Ceremony Field Catalog - System Overview

## The Problem This System Solves

This system was built for a legacy PDF rendering pipeline:

```
Legacy Source System → Dynamic XML Generator → LiveCycle Service → PDFs
```

The challenge: hundreds of different PDF templates, each requiring specific XML structures, and the XML was generated dynamically based on multiple factors (product type, state, subcodes, etc.). Modernization required:

1. **Schema files** for every template
2. **Understanding which XML elements** are actually used for each combination of business variants
3. **Reverse-engineering a complete field repository** from observed usage

This system captures XML field "observations" over time to build that repository.

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

### 1. Context - The Business Domain Schema

A **Context** defines a business domain with its own metadata requirements:

```java
// domain/Context.java
contextId: "deposits"
displayName: "Deposits"
requiredMetadata: ["productCode", "productSubCode", "action"]  // MUST have these
optionalMetadata: ["channel", "region"]                        // CAN have these
active: true
```

**Why it matters**: Different parts of your legacy system have different "dimensions" that affect which XML fields appear. Deposits might vary by `productCode + productSubCode + action`, while Loans might only vary by `loanProductCode`.

### 2. CatalogEntry - An Observed Field

Each unique field observation is stored as:

```java
// domain/CatalogEntry.java
id: "field_12345678"          // Hash-based unique ID
contextId: "deposits"
metadata: {productCode: "DDA", productSubCode: "4S", action: "Fulfillment"}
fieldPath: "/Ceremony/Accounts/Account/FeeCode/Amount"
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
POST /catalog/contexts/deposits/observations
[{
  "metadata": {"productCode": "DDA", "productSubCode": "4S", "action": "Fulfillment"},
  "fieldPath": "/Ceremony/Accounts/Account/FeeCode/Amount",
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
GET /catalog/fields?contextId=deposits&productCode=DDA
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
// If I submit observations for DDA/4S/Fulfillment and don't include /Amount
// but /Amount exists in the DB for DDA/4S/Fulfillment
// → set /Amount's minOccurs = 0 (meaning it's optional for this variant)
```

This is how you discover "this field is sometimes missing for this product variant."

### 4. Case-Insensitive Everything

All metadata keys and values are normalized to lowercase in `FieldKey`:

```java
private static String normalizeCase(String value) {
    return value == null ? null : value.toLowerCase();
}
```

Prevents `productCode=DDA` vs `ProductCode=dda` from creating duplicate entries.

---

## The Runtime Flow (Visual)

```
Day 1: Process 100 DDA/4S/Fulfillment documents
       → See /Account/Balance 100 times, /Account/FeeCode 80 times

       Catalog now shows:
       /Account/Balance:  minOccurs=1, maxOccurs=1 (always present)
       /Account/FeeCode:  minOccurs=0, maxOccurs=1 (sometimes missing)

Day 2: Process 50 DDA/4S/Fulfillment documents
       → /Account/Balance seen 50 times with count=1
       → /Account/FeeCode seen 20 times with count=3 (repeating element!)

       Catalog now shows:
       /Account/Balance:  minOccurs=1, maxOccurs=1 (unchanged)
       /Account/FeeCode:  minOccurs=0, maxOccurs=3 (now we know it repeats!)

Day 3: Process 10 DDA/4S/Fulfillment documents
       → Only /Account/Balance seen, /Account/FeeCode not in batch

       Catalog now shows:
       /Account/Balance:  minOccurs=1, maxOccurs=1
       /Account/FeeCode:  minOccurs=0, maxOccurs=3 (minOccurs dropped to 0)
```

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.2.5 |
| Language | Java 17 |
| Database | MongoDB |
| API Docs | OpenAPI/Swagger (springdoc) |
| Testing | JUnit 5 + Testcontainers (real MongoDB in tests) |
| Build | Maven |
| Boilerplate | Lombok |

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `CatalogService.java` | Core merge logic (lines 24-89) |
| `FieldKey.java` | Field identity calculation |
| `Context.java` | Metadata schema definition |
| `CatalogController.java` | REST endpoints for observations & search |
| `ContextController.java` | REST endpoints for context management |
| `CatalogSmokeTests.http` | Example API calls for manual testing |

---

## API Quick Reference

### Context Management

```bash
# Create a context
POST /catalog/contexts
{
  "contextId": "deposits",
  "displayName": "Deposits",
  "requiredMetadata": ["productCode", "productSubCode", "action"],
  "optionalMetadata": ["channel"],
  "active": true
}

# List all contexts
GET /catalog/contexts

# Get specific context
GET /catalog/contexts/deposits
```

### Field Observations

```bash
# Submit observations
POST /catalog/contexts/deposits/observations
[{
  "metadata": {"productCode": "DDA", "productSubCode": "4S", "action": "Fulfillment"},
  "fieldPath": "/Ceremony/Accounts/Account/FeeCode/Amount",
  "count": 1,
  "hasNull": false,
  "hasEmpty": false
}]
```

### Search

```bash
# Search by context
GET /catalog/fields?contextId=deposits

# Search by any metadata (dynamic)
GET /catalog/fields?productCode=DDA&productSubCode=4S

# Search by field path pattern
GET /catalog/fields?fieldPathContains=Account

# Cross-context search
GET /catalog/fields?productCode=DDA
```

---

## Summary

This system essentially builds an empirical XSD from observed usage. Over time, as you feed it more observations from production traffic, it builds a complete picture of:

> "For product X, subcode Y, action Z → these XML fields appear with these occurrence patterns."

The catalog becomes the authoritative source for understanding what the legacy XML generation system actually produces across all its variants, enabling schema creation and modernization efforts.
