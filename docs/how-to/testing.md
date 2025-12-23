# How To: Testing

**Purpose:** Run and write tests for backend, UI, and SDKs
**Use when:** Adding features, fixing bugs, validating changes
**Source of truth:**
- `src/test/java/` - backend tests
- `ui/src/` - UI type checking
- `sdks/python/tests/` - Python SDK tests

---

## Quick Reference

```bash
# Backend (requires Docker for Testcontainers)
mvn clean test                    # All tests
mvn test -Dtest=CatalogServiceTest  # Single class

# UI (from ui/ directory)
npm run typecheck                 # Type checking (MUST pass)
npm run build                     # Build verification

# Python SDK (from sdks/python/)
pytest                            # All tests
```

---

## Backend Testing

### Stack
- JUnit 5
- Spring Boot Test
- Testcontainers (real MongoDB)
- AssertJ assertions

### Test Structure

```
src/test/java/com/ceremony/catalog/
├── base/
│   ├── BaseIntegrationTest.java   # Testcontainers setup
│   └── TestDataBuilder.java       # Test fixtures
├── service/
│   ├── CatalogServiceTest.java    # Core logic tests
│   └── ContextServiceTest.java    # Context tests
└── api/
    └── CatalogControllerTest.java # API tests
```

### Writing a Service Test

```java
@SpringBootTest
class MyServiceTest extends BaseIntegrationTest {

    @Autowired
    private MyService myService;

    @Test
    void shouldDoSomething() {
        // Given
        Context context = TestDataBuilder.aContext().build();

        // When
        Result result = myService.doSomething(context);

        // Then
        assertThat(result).isNotNull();
    }
}
```

### Key Test Classes

| Class | Tests |
|-------|-------|
| `CatalogServiceTest` | Observation merge, field identity, cleanup |
| `ContextServiceTest` | Context CRUD, required metadata immutability |
| `CatalogControllerTest` | API endpoints, validation |

---

## UI Testing

### Type Checking

The UI uses strict TypeScript configuration:

```bash
npm run typecheck  # MUST pass before committing
```

Strict settings:
- `noUncheckedIndexedAccess` - array/object indexing returns `T | undefined`
- `noImplicitReturns` - all code paths must return
- `strict` - all strict checks enabled

### Build Verification

```bash
npm run build  # Production build
npm run lint   # ESLint check
```

---

## SDK Testing

### Python SDK

```bash
cd sdks/python
pytest                    # All tests
pytest -v                 # Verbose
pytest tests/test_client.py  # Single file
```

---

## Common Test Patterns

### Testing with Real MongoDB

Extend `BaseIntegrationTest` to get:
- Testcontainers MongoDB instance
- Automatic cleanup between tests
- Injected repositories

### Testing API Endpoints

Use `@WebMvcTest` or full `@SpringBootTest`:

```java
@SpringBootTest
@AutoConfigureMockMvc
class ApiTest {
    @Autowired
    MockMvc mockMvc;

    @Test
    void shouldReturnFields() throws Exception {
        mockMvc.perform(get("/catalog/fields"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }
}
```

### Manual API Testing

Use VS Code REST Client with `tests/CatalogSmokeTests.http`:

```http
### Get all fields
GET http://localhost:8080/catalog/fields

### Create context
POST http://localhost:8080/catalog/contexts
Content-Type: application/json

{"contextId": "test", "displayName": "Test", "active": true}
```

---

## Adding Tests for New Features

### New Service Method

1. Add test in appropriate `*ServiceTest.java`
2. Use `TestDataBuilder` for fixtures
3. Test happy path and edge cases

### New API Endpoint

1. Add test in `*ControllerTest.java`
2. Test request/response format
3. Test validation errors
4. Update `CatalogSmokeTests.http`

### New UI Component

1. Ensure TypeScript types are correct
2. Run `npm run typecheck`
3. Verify build: `npm run build`
