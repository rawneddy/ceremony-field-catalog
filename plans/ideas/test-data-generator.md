# Test Data Generator Plan

## Goal

Build a Python CLI tool that generates test XML from XSD schemas and submits them as observations to validate the system's "emergent schema" hypothesis:

**Input XSD → Generate XML → Submit Observations → Export Schema → Result should be ≥ permissive as input**

---

## Architecture Overview

```
sdks/python/
├── ceremony_catalog_sdk.py          # Existing SDK (minor addition)
├── testgen/                          # NEW: Test data generator
│   ├── __init__.py
│   ├── cli.py                        # CLI entry point
│   ├── runner.py                     # Lane execution orchestration
│   ├── xsd/
│   │   ├── parser.py                 # XSD → internal model
│   │   └── model.py                  # XsdSchema, XsdElement, etc.
│   ├── generation/
│   │   ├── generator.py              # XML generation from model
│   │   ├── values.py                 # Value generators (Faker, patterns)
│   │   └── distributions.py          # Random distribution controls
│   ├── api/
│   │   └── client.py                 # Synchronous API client
│   └── meta/
│       └── config.py                 # Meta file schema/parsing
└── test_lanes/                       # Test lane definitions
    ├── README.md
    ├── deposits/
    │   ├── dda_fulfillment.xsd
    │   └── dda_fulfillment.meta.yaml
    └── loans/
        ├── auto_basic.xsd
        └── auto_basic.meta.yaml
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

**Files to create:**
- `sdks/python/testgen/__init__.py`
- `sdks/python/testgen/cli.py`
- `sdks/python/testgen/meta/config.py`

**Tasks:**
1. Define meta file YAML schema (dataclass + Pydantic validation)
2. Create CLI with argparse (two subcommands):

   **`run` subcommand** - Generate and submit test data:
   - `--lanes-dir` - Directory containing test lanes
   - `-n/--count` - XMLs per lane (default: 10)
   - `-l/--lane` - Specific lane(s) to run
   - `--fill-rate` - Override optional field fill rate
   - `--dry-run` - Generate but don't submit
   - `--output-dir` - Save generated XMLs
   - `--api-url` - API base URL
   - `--seed` - Random seed for reproducibility

   **`init-meta` subcommand** - Scaffold meta.yaml from XSD:
   - `--xsd` - Path to XSD file
   - `--output` - Output path for meta.yaml (default: same dir, same name + .meta.yaml)
   - `--context` - Context ID to pre-populate (optional)

3. Implement lane discovery (find .xsd + .meta.yaml pairs)

4. **Implement `init-meta` scaffolding:**
   - Parse XSD to extract all element/attribute paths
   - Generate template meta.yaml with:
     - Empty context section with TODOs
     - Default generation settings
     - All field paths listed in `semanticTypes` as `null` (user fills in)
     - All optional fields listed in `fieldOverrides` with default fillRate
   - Output includes helpful comments explaining each section

**Meta file schema:**
```yaml
context:
  contextId: "loans"
  displayName: "Loans"
  requiredMetadata:
    loanType: "AUTO"
  optionalMetadata:
    region: [EAST, WEST, CENTRAL]
    channel: [ONLINE, BRANCH, MOBILE]

generation:
  defaults:
    optionalFieldFillRate: 0.7
    nullRate: 0.05
    emptyRate: 0.03
    repeatRange: [1, 3]

  semanticTypes:
    "/loan_info/Borrower/Name/FirstName": "person.first_name"
    "/loan_info/Borrower/Address/City": "address.city"
    "/loan_info/LoanDetails/Amount": "decimal(10000, 500000, 2)"

  fieldOverrides:
    "/loan_info/Borrower/CoBorrower":
      fillRate: 0.3
```

---

### Phase 2: XSD Parsing

**Files to create:**
- `sdks/python/testgen/xsd/model.py`
- `sdks/python/testgen/xsd/parser.py`

**Tasks:**
1. Define internal model classes:
   - `XsdSchema` - Root container
   - `XsdElement` - Element with type, cardinality, nillable, children
   - `XsdAttribute` - Attribute with type, required/optional
   - `XsdSimpleType` - With enumeration, pattern, min/max restrictions
   - `XsdComplexType` - With sequence/all/choice children

2. Implement parser using `xmlschema` library:
   - Parse XSD file into internal model
   - Extract enumerations (for constrained value generation)
   - Extract patterns (for regex-based generation)
   - Extract min/max facets
   - Handle nested complex types

**Key library:** `xmlschema` - handles XSD parsing, validation

---

### Phase 3: Value Generation

**Files to create:**
- `sdks/python/testgen/generation/values.py`
- `sdks/python/testgen/generation/distributions.py`

**Tasks:**
1. Create `ValueGeneratorRegistry` with semantic type generators:
   - `person.first_name`, `person.last_name` → Faker
   - `address.*` → Faker
   - `phone_number`, `email`, `ssn` → Faker
   - `decimal(min, max, precision)` → Random with params
   - `pattern:REGEX` → exrex library
   - `date.past`, `date.future` → Faker

2. Create `XsdTypeValueGenerator` for XSD constraint-based generation:
   - Enumeration → random.choice
   - Pattern → exrex
   - Integer with min/max → random.randint
   - String with length → random string of length

3. Value resolution priority:
   1. Semantic type hint from meta file
   2. XSD enumeration
   3. XSD pattern
   4. XSD type with facets
   5. Base type fallback

---

### Phase 4: XML Generation

**Files to create:**
- `sdks/python/testgen/generation/generator.py`

**Tasks:**
1. Implement `XmlGenerator` class:
   - Walk XSD element tree
   - Apply fill rate for optional elements
   - Apply null rate for nillable elements
   - Generate values using registry
   - Handle repeating elements (random count within bounds)
   - Handle attributes

2. Generation algorithm:
   ```
   generate_element(element_def):
     if optional and random() > fill_rate: return None
     if nillable and random() < null_rate: return nil_element

     elem = create_element(name)
     for attr in attributes: add_attribute(elem, attr)

     if has_children:
       for child in children:
         count = random(minOccurs, maxOccurs)
         for _ in range(count):
           child_elem = generate_element(child)
           if child_elem: append(elem, child_elem)
     else:
       elem.text = generate_value(element_def)

     return elem
   ```

3. Output as formatted XML string with proper encoding

4. **Validation step**: After generating each XML, validate against source XSD using `xmlschema`. Fail fast with clear error if validation fails (indicates generator bug)

---

### Phase 5: API Integration

**Files to create:**
- `sdks/python/testgen/api/client.py`

**Modify:**
- `sdks/python/ceremony_catalog_sdk.py` - Add public `extract_observations()` function

**Tasks:**
1. Add to SDK (minimal change):
   ```python
   def extract_observations(xml_data: str, metadata: dict) -> list[CatalogObservationDto]:
       """Public function for extracting observations from XML string."""
       return _extract_observations_from_string(xml_data, metadata)
   ```

2. Create `TestGenApiClient`:
   - `ensure_context_exists(config)` - GET context, create if 404
   - `submit_observations(context_id, xml_string, metadata)` - Extract + POST
   - Synchronous with proper error handling (NOT fire-and-forget)
   - Retry logic for transient failures

3. Context creation payload from meta file config

---

### Phase 6: Runner & Integration

**Files to create:**
- `sdks/python/testgen/runner.py`
- `sdks/python/test_lanes/README.md`

**Tasks:**
1. Implement `TestLaneRunner`:
   - Discover all lanes in directory
   - For each lane:
     - Parse XSD + meta file
     - Ensure context exists
     - Generate N XML documents
     - Optionally save to disk
     - Submit to API
   - Report progress with tqdm

2. Add progress reporting and summary output

3. Create sample test lanes (convert existing sample XMLs to XSD):
   - `deposits/dda_fulfillment.xsd` + `.meta.yaml`
   - `loans/auto_basic.xsd` + `.meta.yaml`

---

### Phase 7: Testing & Documentation

**Files to create:**
- `sdks/python/tests/testgen/test_xsd_parser.py`
- `sdks/python/tests/testgen/test_generator.py`
- `sdks/python/tests/testgen/test_values.py`
- `sdks/python/test_lanes/README.md`

**Tasks:**
1. Unit tests for XSD parsing
2. Unit tests for value generation
3. Integration test with real API
4. README documentation for test_lanes format

---

### Phase 8: Claude Skill for Test Lane Creation

**Files to create:**
- `.claude/skills/create-test-lane.md`

**Purpose:** Interactive Claude skill that guides users through creating new test lanes (XSD + meta.yaml) by asking questions about:
1. What context this test lane is for
2. Required metadata values for this lane
3. Optional metadata options
4. Field structure (what elements/hierarchy)
5. Semantic data types for fields (names, addresses, codes, etc.)
6. Cardinality requirements (repeating elements, optional elements)
7. Constrained enumerations (e.g., "ProductType can only be AUTO, MORTGAGE, HELOC")

**Skill workflow:**
```
/create-test-lane

Claude asks:
1. "What context is this for?" → loans, deposits, ondemand, etc.
2. "What required metadata values?" → loanType: AUTO
3. "Describe the XML structure you need" → User describes or provides sample
4. "What fields need realistic data?" → FirstName=person name, SSN=ssn, etc.
5. "What fields have constrained values?" → ProductType=[AUTO,MORTGAGE,HELOC]
6. "What fields are optional/repeating?" → CoBorrower is optional, Fees repeats 1-5

Claude generates:
- {context}_{descriptor}.xsd with proper structure and enumerations
- {context}_{descriptor}.meta.yaml with semantic type mappings
```

**Skill content template:**
```markdown
# Create Test Lane Skill

## Description
Interactively create XSD schemas and meta.yaml files for test data generation.

## Instructions
When invoked, guide the user through creating a test lane by:

1. Ask about the context and required metadata
2. Ask for a description or sample of the XML structure
3. Identify fields needing:
   - Realistic data (names, addresses, phones, etc.)
   - Constrained enumerations
   - Optional presence
   - Repeating occurrences
4. Generate the XSD with:
   - Proper namespace and encoding
   - Element definitions with minOccurs/maxOccurs
   - Enumeration restrictions where specified
   - Nillable attributes for nullable fields
5. Generate the meta.yaml with:
   - Context configuration
   - Semantic type mappings
   - Field-specific overrides

Output both files to sdks/python/test_lanes/{context}/{name}.xsd and .meta.yaml
```

---

## Dependencies

Add to `sdks/python/requirements.txt`:
```
xmlschema>=3.0.0      # XSD parsing and validation
PyYAML>=6.0           # Meta file parsing
Faker>=18.0.0         # Realistic data generation
exrex>=0.11.0         # Regex string generation
tqdm>=4.64.0          # Progress bars
pydantic>=2.0.0       # Config validation (optional)
```

---

## CLI Usage Examples

```bash
# === init-meta: Scaffold meta.yaml from XSD ===

# Generate starter meta.yaml from an XSD (outputs to same directory)
python -m testgen.cli init-meta --xsd ./test_lanes/loans/auto_basic.xsd

# Specify output path and pre-populate context
python -m testgen.cli init-meta --xsd ./new_schema.xsd --output ./test_lanes/deposits/new.meta.yaml --context deposits

# === run: Generate and submit test data ===

# Run all test lanes
python -m testgen.cli run ./test_lanes/

# Run specific lane with 100 XMLs
python -m testgen.cli run ./test_lanes/ -l deposits/dda_fulfillment -n 100

# Dry run - generate but don't submit
python -m testgen.cli run ./test_lanes/ --dry-run --output-dir ./generated/

# Override fill rate
python -m testgen.cli run ./test_lanes/ --fill-rate 0.9

# Reproducible generation
python -m testgen.cli run ./test_lanes/ --seed 42 -v
```

**Example scaffolded meta.yaml from `init-meta`:**
```yaml
# Auto-generated from: auto_basic.xsd
# TODO: Fill in context details and customize semantic types

context:
  contextId: ""        # TODO: Set context ID (e.g., "loans", "deposits")
  displayName: ""      # TODO: Set display name
  requiredMetadata: {} # TODO: Add required metadata key-value pairs
  optionalMetadata: {} # TODO: Add optional metadata with possible values

generation:
  defaults:
    optionalFieldFillRate: 0.7
    nullRate: 0.05
    emptyRate: 0.03
    repeatRange: [1, 3]

  # All field paths from XSD - set semantic types for realistic data
  # Options: person.first_name, person.last_name, address.street, address.city,
  #          address.state_abbr, address.zipcode, phone_number, email, ssn,
  #          decimal(min,max,decimals), date.past, date.future, pattern:REGEX
  semanticTypes:
    "/loan_info/LoanDetails/LoanNumber": null
    "/loan_info/LoanDetails/LoanType": null      # Has enum: [AUTO, MORTGAGE, HELOC]
    "/loan_info/LoanDetails/Amount": null
    "/loan_info/Borrower/PrimaryBorrower/Name/FirstName": null
    "/loan_info/Borrower/PrimaryBorrower/Name/LastName": null
    "/loan_info/Borrower/PrimaryBorrower/SSN": null
    "/loan_info/Borrower/PrimaryBorrower/Address/Street1": null
    # ... (all paths listed)

  # Optional fields with custom fill rates
  fieldOverrides:
    "/loan_info/Borrower/CoBorrower":  # minOccurs=0 in XSD
      fillRate: 0.7
    "/loan_info/Fees/Fee":             # maxOccurs=unbounded in XSD
      repeatRange: [1, 5]
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| XSD vs simpler format | XSD | Enables round-trip validation of emergent schema hypothesis |
| Meta file format | YAML | Human-readable, easy to edit, familiar to developers |
| Semantic hints location | Meta file only | Cleaner separation, no custom XSD extensions needed |
| API client pattern | Synchronous | Need error feedback, not fire-and-forget like SDK |
| Test lane location | `sdks/python/test_lanes/` | Co-located with generator, easy to version |

---

## Files Summary

**New files (15):**
- `sdks/python/testgen/__init__.py`
- `sdks/python/testgen/cli.py`
- `sdks/python/testgen/runner.py`
- `sdks/python/testgen/meta/config.py`
- `sdks/python/testgen/xsd/model.py`
- `sdks/python/testgen/xsd/parser.py`
- `sdks/python/testgen/generation/generator.py`
- `sdks/python/testgen/generation/values.py`
- `sdks/python/testgen/generation/distributions.py`
- `sdks/python/testgen/api/client.py`
- `sdks/python/test_lanes/README.md`
- `sdks/python/test_lanes/deposits/dda_fulfillment.xsd`
- `sdks/python/test_lanes/deposits/dda_fulfillment.meta.yaml`
- `sdks/python/requirements.txt` (update)
- `.claude/skills/create-test-lane.md` (Claude skill for interactive lane creation)

**Modified files (1):**
- `sdks/python/ceremony_catalog_sdk.py` - Add `extract_observations()` public function

---

## Resolved Decisions

- **Validation**: Always validate generated XML against source XSD before submission (catches generator bugs)
- **Schema Comparison**: Out of scope - separate tool later
- **LLM XSD Generation**: Out of scope - handled separately
