# Testing Guide

## Test Locations

```
src/test/java/com/ceremony/catalog/
├── service/                # Business logic tests (extend ServiceTestBase)
├── domain/                 # Domain object unit tests (plain JUnit)
├── api/                    # Controller tests (extend IntegrationTestBase)
├── performance/            # Benchmarks (extend PerformanceTestBase)
├── base/                   # Base classes - extend these, don't duplicate
└── util/                   # TestDataBuilder, TestAssertions

tests/
└── CatalogSmokeTests.http  # Manual API testing (VS Code REST Client)
```

## Writing Tests

### Service Tests (Most Common)

For business logic and validation. Extend `ServiceTestBase`:

```java
class CatalogServiceTest extends ServiceTestBase {

    @Test
    void shouldMergeObservations() {
        createAndVerifyContext("deposits", "productcode", "action");

        catalogService.merge("deposits", List.of(
            TestDataBuilder.depositsObservation()
                .withFieldPath("/Ceremony/Amount")
                .build()
        ));

        assertThat(catalogRepository.findAll()).hasSize(1);
    }

    @Test
    void shouldRejectMissingMetadata() {
        createAndVerifyContext("deposits", "productcode");

        assertThatThrownBy(() ->
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(Map.of(), "/path", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Required metadata field missing");
    }
}
```

**What `ServiceTestBase` provides:**
- MongoDB via Testcontainers (auto-started, reused)
- `catalogService`, `contextService`, `catalogRepository`, `contextRepository`
- `createAndVerifyContext(contextId, requiredFields...)` helper
- Auto-cleanup between tests

### Domain Unit Tests

For value objects and pure logic. No base class needed:

```java
class FieldKeyTest {

    @Test
    void metadataIsCaseInsensitive() {
        var key1 = new FieldKey("ctx", Map.of("Code", "DDA"), "/path");
        var key2 = new FieldKey("ctx", Map.of("code", "dda"), "/path");

        assertThat(key1.toString()).isEqualTo(key2.toString());
    }
}
```

### Manual API Testing (.http files)

For exploring APIs manually. Open `tests/CatalogSmokeTests.http` in VS Code with REST Client extension:

```http
### Create Context
POST http://localhost:8080/catalog/contexts
Content-Type: application/json

{
  "contextId": "deposits",
  "displayName": "Deposits",
  "requiredMetadata": ["productCode"],
  "optionalMetadata": [],
  "active": true
}

### Search Fields
GET http://localhost:8080/catalog/fields?contextId=deposits
```

## Test Data Builders

Use `TestDataBuilder` instead of manual object construction:

```java
// Generic observation
TestDataBuilder.observation()
    .withMetadata("key", "value")
    .withFieldPath("/Test/Path")
    .allowsNull()
    .build();

// Pre-configured for deposits context
TestDataBuilder.depositsObservation()
    .withProductCode("SAV")
    .withFieldPath("/Custom/Path")
    .build();

// Pre-built contexts
TestDataBuilder.depositsContext();   // productcode, productsubcode, action
TestDataBuilder.loansContext();      // loanproductcode
TestDataBuilder.onDemandContext();   // formcode, formversion
```

## Testcontainers (MongoDB)

Tests use [Testcontainers](https://www.testcontainers.org/) to spin up a real MongoDB instance in Docker. This means:

- **Docker must be running** before you run tests
- A MongoDB 7 container starts automatically on first test
- Container is **reused across test classes** (fast subsequent runs)
- Each test class gets a clean database (auto-cleanup in `@BeforeEach`)

The base classes handle all container setup. You never need to configure MongoDB for tests - just extend the appropriate base class.

If tests fail with connection errors, check that Docker Desktop is running.

## Running Tests

```bash
# All tests (requires Docker)
mvn test

# Specific class
mvn test -Dtest=CatalogServiceTest

# Specific method
mvn test -Dtest=CatalogServiceTest#shouldMergeObservations
```

## Where to Add New Tests

| Testing... | Location | Extend |
|------------|----------|--------|
| Service/business logic | `service/` | `ServiceTestBase` |
| Domain objects | `domain/` | Nothing (plain JUnit) |
| REST endpoints | `api/` | `IntegrationTestBase` |
| Performance | `performance/` | `PerformanceTestBase` |
| Manual exploration | `tests/*.http` | N/A |
