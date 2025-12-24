# Meta File Format Specification

The meta.yaml file pairs with an XSD schema to configure test data generation.

## Complete Structure

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

## Context Section

| Field | Required | Description |
|-------|----------|-------------|
| `contextId` | Yes | API context identifier |
| `displayName` | No | Human-readable name |
| `description` | No | Description text |
| `requiredMetadata` | No | Key-value pairs (always included) |
| `optionalMetadata` | No | Keys with array of possible values (randomly selected) |

## Generation Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `optionalFieldFillRate` | 0.7 | Probability optional fields are included (0.0-1.0) |
| `nullRate` | 0.05 | Probability nillable fields are nil (0.0-1.0) |
| `emptyRate` | 0.03 | Probability string fields are empty (0.0-1.0) |
| `repeatRange` | [1, 3] | Default min/max for repeating elements |

## Semantic Types

### Person/Identity

| Type | Output Example |
|------|----------------|
| `person.first_name` | "John" |
| `person.last_name` | "Smith" |
| `person.full_name` | "John Smith" |
| `person.prefix` | "Mr." |
| `person.suffix` | "Jr." |
| `ssn` | "123-45-6789" |
| `ssn.masked` | "XXX-XX-1234" |

### Contact

| Type | Output Example |
|------|----------------|
| `email` | "john.smith@example.com" |
| `phone_number` | "(555) 123-4567" |
| `phone.mobile` | "(555) 987-6543" |
| `phone.landline` | "(555) 123-4567" |

### Address

| Type | Output Example |
|------|----------------|
| `address.street` | "123 Main St" |
| `address.street1` | "456 Oak Ave" |
| `address.street2` | "Apt 5B" |
| `address.city` | "Springfield" |
| `address.state` | "California" |
| `address.state_abbr` | "CA" |
| `address.zipcode` | "90210" |
| `address.zip` | "12345" |
| `address.country` | "United States" |
| `address.full` | "123 Main St, Springfield, CA 90210" |

### Financial

| Type | Output Example |
|------|----------------|
| `account.number` | "12345678901234" |
| `routing.number` | "021000021" |
| `credit_card.number` | "4111111111111111" |
| `currency.code` | "USD" |
| `currency.amount` | "5432.10" |

### Dates

| Type | Output Example |
|------|----------------|
| `date.past` | "2023-05-15" |
| `date.future` | "2025-12-01" |
| `date.birth` | "1985-03-22" |
| `date.today` | "2024-01-15" |
| `datetime.past` | "2023-05-15T10:30:00" |
| `datetime.future` | "2025-12-01T14:45:00" |

### Business

| Type | Output Example |
|------|----------------|
| `company.name` | "Acme Corporation" |
| `company.suffix` | "LLC" |
| `job.title` | "Software Engineer" |

### Internet

| Type | Output Example |
|------|----------------|
| `url` | "https://example.com/page" |
| `domain` | "example.com" |
| `username` | "jsmith42" |
| `ipv4` | "192.168.1.100" |

### Text

| Type | Output Example |
|------|----------------|
| `text.word` | "lorem" |
| `text.sentence` | "Lorem ipsum dolor sit amet." |
| `text.paragraph` | "Lorem ipsum..." |

### Codes/IDs

| Type | Output Example |
|------|----------------|
| `uuid` | "550e8400-e29b-41d4-a716-446655440000" |
| `code.alpha` | "ABCDEF" |
| `code.numeric` | "12345678" |
| `code.alphanumeric` | "A1B2C3D4" |

### Vehicle

| Type | Output Example |
|------|----------------|
| `vehicle.vin` | "1HGCM82633A123456" |
| `vehicle.make` | "Toyota" |
| `vehicle.model` | "Sedan" |
| `vehicle.year` | "2022" |

### Boolean

| Type | Output Example |
|------|----------------|
| `boolean` | "true" or "false" |
| `yes_no` | "Yes" or "No" |
| `y_n` | "Y" or "N" |

## Parameterized Types

### decimal(min, max, decimals)

Generate a random decimal number.

```yaml
"/Amount": "decimal(100, 10000, 2)"    # 100.00 to 10000.00
"/Rate": "decimal(0, 1, 4)"            # 0.0000 to 1.0000
```

### integer(min, max)

Generate a random integer.

```yaml
"/Count": "integer(1, 100)"
"/Year": "integer(2000, 2025)"
```

### year(min, max)

Generate a random year.

```yaml
"/ModelYear": "year(2010, 2025)"
```

### choice(val1, val2, ...)

Select from fixed values.

```yaml
"/Status": "choice(ACTIVE, INACTIVE, PENDING)"
"/Type": "choice(A, B, C)"
```

### date(days_min, days_max)

Generate a date relative to today.

```yaml
"/EffectiveDate": "date(-30, 0)"       # Past 30 days
"/ExpirationDate": "date(30, 365)"     # 30-365 days from now
```

### string(length) or string(min, max)

Generate a random string of specified length.

```yaml
"/Code": "string(10)"                   # Exactly 10 chars
"/Reference": "string(5, 15)"           # 5-15 chars
```

### pattern:TEMPLATE

Generate from a pattern template.

```yaml
"/LoanNumber": "pattern:LN-{YYYY}-{######}"
"/AccountId": "pattern:ACC-{AAA}-{####}"
"/TransactionId": "pattern:{AAAA}{######}"
```

#### Pattern Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{YYYY}` | 4-digit year | "2024" |
| `{YY}` | 2-digit year | "24" |
| `{MM}` | 2-digit month | "03" |
| `{DD}` | 2-digit day | "15" |
| `{######}` | N random digits | "123456" |
| `{AAAAAA}` | N random uppercase letters | "ABCDEF" |
| `{seq:N}` | N-digit sequence | "000001" |

## Field Overrides

Override settings for specific field paths:

```yaml
fieldOverrides:
  "/Root/OptionalElement":
    fillRate: 0.5              # Include 50% of the time

  "/Root/RepeatingElement":
    repeatRange: [2, 10]       # Generate 2-10 instances

  "/Root/SpecialField":
    semanticType: "email"      # Override semantic type
    fillRate: 0.8
```

### Available Override Options

| Option | Type | Description |
|--------|------|-------------|
| `fillRate` | float | Override optional field fill rate (0.0-1.0) |
| `repeatRange` | [int, int] | Override repeat count range |
| `semanticType` | string | Override semantic type for this field |
