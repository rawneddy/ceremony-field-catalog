# Why We Need the Ceremony Field Catalog

## The Question Management Keeps Asking

> "Why can't you just tell us what fields your system uses?"

This is a reasonable question. If a system processes XML data to generate PDF documents, it should know what data it needs, right?

The answer is frustrating but important to understand: **the legacy ceremony system is largely a passthrough**. It doesn't "know" what most of the fields are because it never touches them.

---

## Understanding the Legacy System's Architecture

### The Two-Stage Process

The legacy ceremony system operates in two stages:

**Stage 1: Document Selection**
- Receives Ceremony XML from upstream systems
- Applies business rules to determine which document codes are needed
- Example: "For a DDA product with action=Fulfillment in state=CA, generate documents STMT001, DISC002, and SIG003"

**Stage 2: Data Transformation**
- For each selected document code, transforms the Ceremony XML into document-specific XML
- Each document template (managed by a separate team) has its own schema requirements
- The transformed XML is sent to the PDF Generation API for rendering

### The Passthrough Problem

Here's the critical insight: **the legacy system only touches fields where:**

1. **Transformation is needed** - The source XML structure differs from what the document template expects
2. **Business rule evaluation** - A field's value determines which documents to generate or how to transform data

For everything else, the data flows through untouched. The system acts as a conduit.

**Example:**
```xml
<!-- Ceremony XML comes in with 500 fields -->
<Ceremony>
  <Customer>
    <Name>John Smith</Name>           <!-- Passthrough - never examined -->
    <SSN>***-**-1234</SSN>            <!-- Passthrough - never examined -->
    <Address>...</Address>             <!-- Passthrough - never examined -->
  </Customer>
  <Account>
    <ProductCode>DDA</ProductCode>     <!-- READ for business rules -->
    <Balance>1000.00</Balance>         <!-- Passthrough - never examined -->
    <OpenDate>2024-01-15</OpenDate>    <!-- Passthrough - never examined -->
  </Account>
  <!-- ...hundreds more fields... -->
</Ceremony>
```

The system reads `ProductCode` to make decisions, but `Name`, `SSN`, `Balance`, and hundreds of other fields simply pass through to the transforms. The code has no explicit knowledge of these fields.

### The Transform Black Box

The coded (and in some cases XSLT) transforms that convert Ceremony XML or BMIC XML to document-specific XML are themselves complex:
- Many have evolved over years
- They select paths from the input XML and map them to output structures, sometimes using complex business rules
- The transforms know what they need **for those fields they touch directly**, but extracting this knowledge programmatically is extremely difficult

---

## The Three Pathways Make It Worse

### Pathway 1: Ceremony Path
- Ceremony XML → Business Rules → Per-Document Transforms → PDF Generation API
- **The problem**: Transforms know what they need for those fields they touch, but most fields pass through. And for the ones that do not we'd have to reverse-engineer hundreds of coded transformation methods to extract field requirements

### Pathway 2: BMIC Path
- Reference ID → Fetch BMIC XML from SOR → Light Transform → PDF Generation API
- **The problem**: BMIC XML comes from an external system. ~90% of fields are shared across documents with sparse/scattered documentation of which fields each document actually uses.  Further, complex XSLT transforms developed 10+ years ago are still handling much of the transformation.

### Pathway 3: OnDemand Path
- Pre-formed Document XML → Passthrough → PDF Generation API
- **The problem**: The legacy system shies away from any first class knowledge of these fields. It just forwards whatever it receives.

---

## Why Static Analysis Won't Work

Several approaches have been considered and rejected:

### "Just read the transforms"
- Hundreds of transforms, many complicated by calls across code files and shared libraries
- Complex conditional logic in code, but also in the legacy XSLT
- Template composition and includes
- Dynamic XPath expressions
- Would take months of manual analysis with high error risk.  AI could help, but we would still not know which fields are actually used.  Only real world data will tell us that.

### "Ask the template team for schemas"
- The template team defines what their document templates expect
- But they don't know all the variants of data the legacy system might send
- Their schemas define structure, not "which fields are used for which product codes"

### "Document it manually"
- 250+ document templates
- Dozens of product codes, subcodes, actions, states
- Combinations explode combinatorially
- Would be outdated before completion

### "Add logging and analyze logs"
- Log volume would be enormous (1-2M ceremonies/month) when considering the hundreds of fields per ceremony
- Log analysis would require building... essentially what this catalog does

---

## The Empirical Approach

Instead of trying to extract field knowledge from code (which largely doesn't have it), we observe fields **in production** as they flow through the system.

### How It Works

1. **Instrument key points** in the legacy system with lightweight observation code
2. **Fire async observations** to the Field Catalog (fire-and-forget, best effort)
3. **Catalog merges observations** to build field statistics over time
4. **After 30 days of production traffic**, we have near-complete coverage

### What We Capture

At each instrumentation point, we observe:
- **What fields exist** (the XPath)
- **For what context** (product code, document code, etc.)
- **Occurrence patterns** (is the field always present, can it be null/empty, what are its max/min values, etc)

### Example Observation Flow

```
Day 1: 50,000 ceremonies processed
       Legacy system sends observations to catalog
       Catalog now knows: "For DDA/4S/Fulfillment, these 347 fields were seen"

Day 7: 350,000 ceremonies processed
       Catalog now knows: "347 fields always present, 12 more seen occasionally"

Day 30: 1,500,000 ceremonies processed
        Catalog has high confidence: "359 fields for DDA/4S/Fulfillment"
        Knows which are required (minOccurs > 0) vs optional (minOccurs = 0)
        Knows which can repeat (maxOccurs > 1)
        Knows which allow null/empty values
```

---

## What This Enables

### For Modernization Teams
- **Schema generation**: Export field lists per document to create XSD files
- **API contracts**: Know exactly what data new systems need to provide
- **Impact analysis**: "If we remove field X, which documents break?"

### For Business Analysts
- **Field dictionaries**: "What data does document STMT001 use?"
- **Product comparisons**: "What's different between DDA and SAV processing?"
- **Coverage reports**: "Do we have all the fields documented?"

### For Operations
- **Change management**: "We're adding a new field - which documents might need updates?"
- **Troubleshooting**: "Document X is rendering wrong - what fields does it expect?"

### For the Template Team
- **Validation**: Compare their schemas against observed reality
- **Completeness**: Identify fields they expect but the legacy system never sends

---

## Why Fire-and-Forget Works

The observation mechanism in the legacy system is designed to be:

### Non-blocking
- Observations are sent asynchronously
- Legacy system doesn't wait for catalog response
- No impact on ceremony processing time

### Best-effort
- If the catalog is down, observations are lost (acceptable)
- We're building statistical coverage, not exact logging
- Missing some observations doesn't affect the final picture

### Lightweight
- Simple HTTP POST with field list
- No complex serialization
- Minimal memory overhead

### Self-healing
- If observations fail, the next ceremony will try again
- Over time, all field combinations get captured
- No manual intervention needed

---

## The 30-Day Window

With production volume of 1-2 million ceremonies per month:

| Timeframe | Coverage |
|-----------|----------|
| Day 1 | Common fields for frequent product codes |
| Day 7 | Most fields for most product codes |
| Day 14 | Edge cases for less common combinations |
| Day 30 | High confidence complete coverage |
| Ongoing | Catch rare seasonal or edge-case fields |

Some fields might only appear in specific scenarios:
- End-of-year tax documents
- Quarterly statements
- Rare product combinations

The catalog should run continuously, but 30 days provides a solid baseline.

---

## Summary

The Ceremony Field Catalog exists because:

1. **The legacy system is majority passthrough** - It doesn't know what fields exist because it doesn't examine most of them
2. **Static analysis is impractical** - Hundreds of transforms, complex logic, combinatorial explosion
3. **Manual documentation is impossible** - Too many combinations, would be outdated immediately
4. **Empirical observation works** - Watch production traffic, build statistical field coverage
5. **Modernization requires this data** - Can't build new systems without knowing what data the old system actually uses

The catalog transforms an impossible documentation problem into a solved engineering problem. Instead of asking "what fields does this system use?" and getting no answer, we observe the fields as they flow and build the answer empirically.

> **The legacy system doesn't know what fields it uses. But now, after watching it work, we do.**
