# Test Lanes

Test lanes are XSD + meta.yaml pairs that define how to generate test XML data.

## Directory Structure

```
test_lanes/
├── deposits/
│   ├── dda_fulfillment.xsd        # XSD schema for this lane
│   └── dda_fulfillment.meta.yaml  # Generation configuration
├── loans/
│   ├── auto_basic.xsd
│   └── auto_basic.meta.yaml
└── ...
```

## Creating a New Test Lane

### Option 1: Start with existing XSD

```bash
# Generate a template meta.yaml from an XSD
python -m testgen.cli init-meta --xsd path/to/schema.xsd --context mycontext
```

This creates a `.meta.yaml` file with all field paths pre-populated.

### Option 2: Create from scratch

1. Create an XSD schema file
2. Create a matching `.meta.yaml` file (same name, different extension)

## Meta File Format

```yaml
# Context configuration
context:
  contextId: "deposits"            # Required: API context ID
  displayName: "Deposits"          # Optional: Human-readable name
  description: "DDA deposits"      # Optional: Description
  requiredMetadata:                # Required metadata key-value pairs
    productCode: "DDA"
    action: "fulfillment"
  optionalMetadata:                # Optional metadata (random selection)
    region: [EAST, WEST, CENTRAL]
    channel: [ONLINE, BRANCH]

# Generation settings
generation:
  defaults:
    optionalFieldFillRate: 0.7     # 70% of optional fields included
    nullRate: 0.05                 # 5% of nillable fields are nil
    emptyRate: 0.03                # 3% of strings are empty
    repeatRange: [1, 3]            # 1-3 occurrences of repeating elements

  # Semantic type mappings for realistic data
  semanticTypes:
    "/Root/Customer/Name/FirstName": "person.first_name"
    "/Root/Customer/Address/City": "address.city"
    "/Root/Amount": "decimal(100, 10000, 2)"

  # Per-field overrides
  fieldOverrides:
    "/Root/Customer/CoBorrower":   # Optional element
      fillRate: 0.3                # Only 30% have co-borrower
    "/Root/Fees/Fee":              # Repeating element
      repeatRange: [1, 5]          # 1-5 fees
```

## Semantic Types

Built-in semantic types for realistic data generation:

| Type | Description | Example |
|------|-------------|---------|
| `person.first_name` | First name | "John" |
| `person.last_name` | Last name | "Smith" |
| `ssn` | Social Security Number | "123-45-6789" |
| `email` | Email address | "john@example.com" |
| `phone_number` | Phone number | "(555) 123-4567" |
| `address.street` | Street address | "123 Main St" |
| `address.city` | City | "Springfield" |
| `address.state_abbr` | State abbreviation | "CA" |
| `address.zipcode` | ZIP code | "90210" |
| `date.past` | Past date | "2023-05-15" |
| `date.future` | Future date | "2025-12-01" |

### Parameterized Types

| Type | Description | Example |
|------|-------------|---------|
| `decimal(min, max, decimals)` | Random decimal | `decimal(100, 10000, 2)` → "5432.10" |
| `integer(min, max)` | Random integer | `integer(1, 100)` → "42" |
| `year(min, max)` | Random year | `year(2010, 2025)` → "2019" |
| `pattern:TEMPLATE` | Pattern-based | `pattern:LN-{YYYY}-{######}` → "LN-2024-123456" |

### Pattern Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{YYYY}` | 4-digit year |
| `{YY}` | 2-digit year |
| `{MM}` | 2-digit month |
| `{DD}` | 2-digit day |
| `{######}` | N random digits |
| `{AAAAAA}` | N random uppercase letters |
| `{seq:N}` | N-digit sequence number |

## Running Test Lanes

```bash
# Run all lanes
python -m testgen.cli run ./test_lanes/

# Run specific lane
python -m testgen.cli run ./test_lanes/ -l deposits/dda_fulfillment

# Generate 100 XMLs per lane
python -m testgen.cli run ./test_lanes/ -n 100

# Dry run (generate but don't submit)
python -m testgen.cli run ./test_lanes/ --dry-run --output-dir ./generated/

# With specific fill rate
python -m testgen.cli run ./test_lanes/ --fill-rate 0.9

# Reproducible generation
python -m testgen.cli run ./test_lanes/ --seed 42
```
