# Python SDK (Test Implementation)

**Purpose:** Functionally identical Python implementation of the .NET SDK for testing
**Use when:** Testing SDK logic, running integration tests, validating behavior
**Note:** This SDK is NOT intended for production use

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
