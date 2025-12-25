# Python SDK & Test Data Generator

This directory contains two components:

1. **Python SDK** - A test implementation mirroring the .NET SDK for validation
2. **Test Data Generator** - CLI tool for generating realistic test XML from XSD schemas

---

## Purpose

The Python SDK is a **functionally identical implementation** of the .NET SDK, created specifically to enable comprehensive testing and validation. Since .NET Framework 4.8 testing infrastructure can be challenging to set up, this Python mirror allows us to:

1. **Verify all SDK logic** with comprehensive unit tests
2. **Run integration tests** against the real API and MongoDB
3. **Validate the exact behavior** that the .NET SDK will exhibit in production

---

## Test Coverage

The Python test suite (`test_ceremony_catalog_sdk.py`) covers:

| Category | What's Verified |
|----------|-----------------|
| XML Extraction | Field paths, attributes, namespaces, empty elements, nested structures |
| Field Path Building | Path format `/parent/child`, attribute format `/@attr` |
| Queue Behavior | Item flow, queue full (drops), ordering |
| Batching | Batch size boundaries, correct splitting |
| Fire-and-Forget | Immediate return, never throws on bad input |
| Initialization | Idempotent, defaults, validation |
| Error Handling | Network errors, API errors, callback invocation |
| API Contract | JSON field names match Java API exactly |
| Integration | Full flow with realistic XML, concurrency |
| Edge Cases | Large XML, deep nesting, unicode, special chars |

---

## Running Tests

```bash
# Activate virtual environment
cd sdks/python
source .venv/bin/activate

# Run unit tests
python -m pytest test_ceremony_catalog_sdk.py -v

# Run integration test against real API (requires docker-compose up)
python test_integration_real_api.py
```

---

## For Developers

**The Python SDK is not intended for production use.** It exists solely to provide confidence that the .NET SDK logic is correct and thoroughly tested.

If you need to modify SDK behavior:
1. Make changes to both implementations
2. Run the Python test suite to verify correctness
3. Optionally run integration tests against the real API

---

## XML Test Data Generator

The `testgen` module provides a CLI tool for generating realistic test XML documents from XSD schemas paired with meta.yaml configuration files.

### Quick Start

```bash
cd sdks/python
source .venv/bin/activate

# Dry run - generate and validate without submitting to API
python -m testgen.cli run ./test_lanes/ -l customer/profile --dry-run -n 10

# Generate and submit to API
python -m testgen.cli run ./test_lanes/ -l customer/profile -n 100

# Save generated XMLs locally
python -m testgen.cli run ./test_lanes/ -l customer/profile -n 10 --output-dir ./output/
```

### Test Lanes

A test lane is an XSD schema paired with a meta.yaml configuration file. See `test_lanes/README.md` for full documentation.

| Lane | Description |
|------|-------------|
| `loans/auto_basic` | Auto loan applications with borrower, collateral, and fee data |
| `customer/profile` | Customer profiles with personal info, address, and financial data |

### Creating New Test Lanes

Use the Claude skill for guided test lane creation:

```
/create-test-lane
```

Or manually create:
1. XSD schema at `test_lanes/<context>/<lane_name>.xsd`
2. Meta config at `test_lanes/<context>/<lane_name>.meta.yaml`

### Key Features

- **Semantic types** - Generate realistic data (names, SSNs, addresses, etc.)
- **Configurable distributions** - Control fill rates, null rates, repeat ranges
- **Random metadata selection** - Required metadata can randomly select from a list
- **XSD validation** - All generated XML is validated against the schema
- **API submission** - Submit observations directly to the Catalog API
